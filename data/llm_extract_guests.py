"""
LLM-assisted guest extraction for Odd Lots podcast episodes.
Uses OpenAI API to extract guest information from episode descriptions.

Requires OPENAI_API_KEY environment variable to be set.
"""

import openai
import json
import os
import sqlite3
import time
from typing import Optional


def check_api_key():
    """Check if OPENAI_API_KEY is set."""
    if not os.environ.get("OPENAI_API_KEY"):
        print("ERROR: OPENAI_API_KEY environment variable not set.")
        print("Set it with: export OPENAI_API_KEY='your-key-here'")
        return False
    return True

# Blocklist of known false positives (segment names, title fragments)
# NOTE: Avoid apostrophes in these - use partial matches instead
BLOCKLIST = [
    "Lots More",
    "Why It",
    "What It",
    "How It",
    "Why Everyone",
    "This Is What",
    "This Is Why",
    "This Is How",
    "The Oil Industry",  # False positive from "The Oil Industry's..."
]


def is_blocklisted(text: str) -> bool:
    """Check if text contains blocklisted phrases."""
    if not text:
        return False
    for blocked in BLOCKLIST:
        if blocked.lower() in text.lower():
            return True
    return False


def extract_guests_batch(client: openai.OpenAI, episodes: list[dict]) -> list[dict]:
    """
    Extract guest information from a batch of episodes using OpenAI.

    Args:
        client: OpenAI client
        episodes: List of dicts with 'id', 'title', 'description' keys

    Returns:
        List of extraction results with episode_id and guest info
    """
    # Build the prompt with all episodes
    episodes_text = ""
    for i, ep in enumerate(episodes):
        desc = ep['description'] or ""
        # Truncate very long descriptions
        if len(desc) > 1500:
            desc = desc[:1500] + "..."
        episodes_text += f"""
Episode {i+1} (ID: {ep['id']}):
Title: {ep['title']}
Description: {desc}
---
"""

    prompt = f"""Extract guest information from these podcast episode descriptions.
For each episode, identify:
1. Guest name (full name of the person being interviewed)
2. Guest title/role (their job title or role)
3. Guest company/organization (where they work)
4. Confidence level: "high" if clearly stated, "medium" if inferred, "low" if uncertain

Rules:
- Only extract actual interview guests, not hosts (Joe Weisenthal, Tracy Alloway)
- If an episode has multiple guests, list all of them
- If no guest is mentioned or it's a "Lots More" segment without a guest, return empty guests array
- Ignore segment names like "Lots More", "What It Takes", etc. - these are not guests
- Be precise with names - use the exact name as stated

Return JSON array with one object per episode:
[
  {{
    "episode_id": <id>,
    "guests": [
      {{"name": "...", "title": "...", "company": "...", "confidence": "high/medium/low"}}
    ]
  }}
]

If no guest found, use: {{"episode_id": <id>, "guests": []}}

{episodes_text}

Return only valid JSON, no other text."""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}]
        )

        # Parse the JSON response
        response_text = response.choices[0].message.content.strip()

        # Handle potential markdown code blocks
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            response_text = "\n".join(lines[1:-1])

        results = json.loads(response_text)
        return results

    except json.JSONDecodeError as e:
        print(f"JSON parse error: {e}")
        print(f"Response: {response_text[:500]}")
        return []
    except Exception as e:
        print(f"API error: {e}")
        return []


def extract_single_episode(client: openai.OpenAI, title: str, description: str) -> dict:
    """
    Extract guest info from a single episode.

    Returns:
        Dict with 'guests' list containing extracted guest info
    """
    if not description:
        return {"guests": []}

    # Check blocklist
    if is_blocklisted(title):
        # Still try to extract if there's a description
        pass

    prompt = f"""Extract guest information from this podcast episode description.

Title: {title}
Description: {description[:2000]}

Identify:
1. Guest name (full name of the person being interviewed)
2. Guest title/role (their job title or role)
3. Guest company/organization (where they work)
4. Confidence: "high" if clearly stated, "medium" if inferred, "low" if uncertain

Rules:
- Only extract actual interview guests, not hosts (Joe Weisenthal, Tracy Alloway)
- If multiple guests, list all of them
- If no guest mentioned, return empty guests array
- Be precise with the exact name as stated

Return JSON only:
{{"guests": [{{"name": "...", "title": "...", "company": "...", "confidence": "..."}}]}}

If no guest: {{"guests": []}}"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}]
        )

        response_text = response.choices[0].message.content.strip()

        # Handle markdown code blocks
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            response_text = "\n".join(lines[1:-1])

        return json.loads(response_text)

    except Exception as e:
        print(f"Error extracting from '{title[:50]}': {e}")
        return {"guests": []}


def run_batch_extraction(db_path: str = "odd_lots_episodes.db",
                         batch_size: int = 10,
                         limit: Optional[int] = None,
                         dry_run: bool = False) -> dict:
    """
    Run LLM extraction on all episodes that need it.

    Args:
        db_path: Path to SQLite database
        batch_size: Number of episodes per API call
        limit: Optional limit on total episodes to process
        dry_run: If True, don't update database

    Returns:
        Statistics dict
    """
    client = openai.OpenAI()
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Get episodes that need extraction (no clean data yet or low confidence)
    query = '''
        SELECT id, title, description, guest, guest_clean, extraction_confidence
        FROM episodes
        WHERE guest_clean IS NULL
           OR extraction_confidence = 'low'
           OR (guest IS NOT NULL AND guest_clean IS NULL)
    '''
    if limit:
        query += f' LIMIT {limit}'

    cursor.execute(query)
    episodes = cursor.fetchall()

    print(f"Found {len(episodes)} episodes to process")

    stats = {
        "processed": 0,
        "guests_found": 0,
        "with_title": 0,
        "with_company": 0,
        "errors": 0,
        "skipped_blocklist": 0,
    }

    # Process in batches
    batch = []
    for row in episodes:
        ep_id, title, description, existing_guest, existing_clean, confidence = row

        batch.append({
            "id": ep_id,
            "title": title,
            "description": description,
        })

        if len(batch) >= batch_size:
            results = process_batch(client, cursor, batch, dry_run, stats)
            batch = []
            # Rate limiting
            time.sleep(0.5)

    # Process remaining
    if batch:
        process_batch(client, cursor, batch, dry_run, stats)

    if not dry_run:
        conn.commit()

    conn.close()
    return stats


def process_batch(client, cursor, batch, dry_run, stats):
    """Process a batch of episodes and update database."""
    print(f"Processing batch of {len(batch)} episodes...")

    results = extract_guests_batch(client, batch)

    for result in results:
        ep_id = result.get("episode_id")
        guests = result.get("guests", [])

        if not ep_id:
            stats["errors"] += 1
            continue

        stats["processed"] += 1

        if guests:
            # Take the first guest (primary guest)
            primary = guests[0]
            name = primary.get("name", "").strip()
            title = primary.get("title", "").strip() or None
            company = primary.get("company", "").strip() or None
            confidence = primary.get("confidence", "medium")

            # Skip blocklisted names
            if is_blocklisted(name):
                stats["skipped_blocklist"] += 1
                continue

            stats["guests_found"] += 1
            if title:
                stats["with_title"] += 1
            if company:
                stats["with_company"] += 1

            if not dry_run:
                cursor.execute('''
                    UPDATE episodes
                    SET guest_clean = ?,
                        guest_title_clean = ?,
                        guest_company_clean = ?,
                        extraction_confidence = ?,
                        extraction_method = 'llm'
                    WHERE id = ?
                ''', (name, title, company, confidence, ep_id))
        else:
            # No guest found - mark as processed
            if not dry_run:
                cursor.execute('''
                    UPDATE episodes
                    SET extraction_confidence = 'none',
                        extraction_method = 'llm'
                    WHERE id = ?
                ''', (ep_id,))

    return results


if __name__ == "__main__":
    import argparse
    import sys

    parser = argparse.ArgumentParser(description="LLM-assisted guest extraction")
    parser.add_argument("--batch-size", type=int, default=10, help="Episodes per API call")
    parser.add_argument("--limit", type=int, help="Limit total episodes to process")
    parser.add_argument("--dry-run", action="store_true", help="Don't update database")
    parser.add_argument("--single", type=int, help="Process single episode by ID")

    args = parser.parse_args()

    if not check_api_key():
        sys.exit(1)

    if args.single:
        # Process single episode for testing
        conn = sqlite3.connect("odd_lots_episodes.db")
        cursor = conn.cursor()
        cursor.execute("SELECT title, description FROM episodes WHERE id = ?", (args.single,))
        row = cursor.fetchone()
        conn.close()

        if row:
            client = openai.OpenAI()
            result = extract_single_episode(client, row[0], row[1])
            print(json.dumps(result, indent=2))
        else:
            print(f"Episode {args.single} not found")
    else:
        stats = run_batch_extraction(
            batch_size=args.batch_size,
            limit=args.limit,
            dry_run=args.dry_run
        )

        print("\n=== Extraction Stats ===")
        for key, value in stats.items():
            print(f"  {key}: {value}")
