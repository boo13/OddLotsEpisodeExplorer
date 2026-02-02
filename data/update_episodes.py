"""
Incremental update script for Odd Lots podcast episodes.

Fetches the Omny RSS feed, inserts new episodes into the SQLite DB,
runs LLM guest extraction on new episodes, backfills repeat guests,
and rebuilds the FTS index.

Usage:
    python update_episodes.py              # Full update
    python update_episodes.py --dry-run    # Preview without DB changes
"""

import argparse
import os
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

import feedparser
from dotenv import load_dotenv

# Load .env from project root (parent of data/)
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# Reuse existing functions
from fetch_episodes import extract_guest, parse_duration
from llm_extract_guests import extract_single_episode, check_api_key, is_blocklisted
from cleanup_guests import backfill_repeat_guests, rebuild_fts_index

RSS_URL = "https://www.omnycontent.com/d/playlist/e73c998e-6e60-432f-8610-ae210140c5b1/8a94442e-5a74-4fa2-8b8d-ae27003a8d6b/982f5071-765c-403d-969d-ae27003a8d83/podcast.rss"
DB_PATH = os.path.join(os.path.dirname(__file__), "odd_lots_episodes.db")


def fetch_new_episodes(db_path: str, dry_run: bool = False) -> list[dict]:
    """Fetch RSS feed and return list of new episodes not yet in DB."""
    print("Fetching RSS feed...")
    feed = feedparser.parse(RSS_URL)
    print(f"RSS feed has {len(feed.entries)} episodes")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT guid FROM episodes")
    existing_guids = {row[0] for row in cursor.fetchall()}
    conn.close()

    print(f"DB has {len(existing_guids)} existing episodes")

    new_episodes = []
    for entry in feed.entries:
        guid = entry.get("id", "") or entry.get("guid", "")
        if guid in existing_guids:
            continue

        title = entry.get("title", "")
        description = entry.get("summary", "") or entry.get("description", "")

        # Parse publication date
        pub_date = None
        if "published_parsed" in entry and entry.published_parsed:
            pub_date = datetime(*entry.published_parsed[:6]).strftime("%Y-%m-%d")

        # Get duration
        duration = None
        if "itunes_duration" in entry:
            duration = parse_duration(entry.itunes_duration)

        # Get episode URL (prefer audio link)
        episode_url = entry.get("link", "")
        if "links" in entry:
            for link in entry.links:
                if link.get("type", "").startswith("audio"):
                    episode_url = link.get("href", episode_url)
                    break

        # Extract URLs
        omny_url = None
        apple_url = None
        if "links" in entry:
            for link in entry.links:
                href = link.get("href", "")
                if "omnycontent.com" in href and not href.endswith(".mp3"):
                    omny_url = href
                elif "apple.com" in href or "itunes.apple.com" in href:
                    apple_url = href
        # Fallback: entry link is often the Omny page
        if not omny_url:
            link = entry.get("link", "")
            if "omnycontent.com" in link:
                omny_url = link

        # Regex guest extraction
        guest = extract_guest(title)

        new_episodes.append({
            "title": title,
            "guest": guest,
            "description": description,
            "pub_date": pub_date,
            "duration_seconds": duration,
            "episode_url": episode_url,
            "guid": guid,
            "omny_url": omny_url,
            "apple_podcasts_url": apple_url,
        })

    print(f"Found {len(new_episodes)} new episodes")
    return new_episodes


def insert_episodes(db_path: str, episodes: list[dict]) -> int:
    """Insert new episodes into DB. Returns count inserted."""
    if not episodes:
        return 0

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    inserted = 0

    for ep in episodes:
        try:
            cursor.execute("""
                INSERT OR IGNORE INTO episodes
                (title, guest, description, pub_date, duration_seconds,
                 episode_url, guid, omny_url, apple_podcasts_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                ep["title"], ep["guest"], ep["description"],
                ep["pub_date"], ep["duration_seconds"],
                ep["episode_url"], ep["guid"],
                ep["omny_url"], ep["apple_podcasts_url"],
            ))
            if cursor.rowcount > 0:
                inserted += 1
        except sqlite3.IntegrityError:
            pass

    conn.commit()
    conn.close()
    return inserted


def get_unextracted_episodes(db_path: str) -> list[dict]:
    """Find episodes in DB that haven't had LLM guest extraction yet."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, title, description, guid
        FROM episodes
        WHERE extraction_method IS NULL
    """)
    episodes = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return episodes


def run_llm_extraction(db_path: str, episodes: list[dict]) -> dict:
    """Run LLM guest extraction on episodes. Returns stats.

    Episodes should have 'title', 'description', and 'guid' keys.
    """
    import openai

    client = openai.OpenAI()
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    stats = {"extracted": 0, "no_guest": 0, "errors": 0, "skipped_blocklist": 0}

    for ep in episodes:
        title = ep["title"]
        description = ep.get("description") or ""

        try:
            result = extract_single_episode(client, title, description)
        except Exception as e:
            print(f"  LLM error for '{title[:50]}': {e}")
            stats["errors"] += 1
            continue

        guests = result.get("guests", [])

        if guests:
            primary = guests[0]
            name = primary.get("name", "").strip()
            guest_title = primary.get("title", "").strip() or None
            company = primary.get("company", "").strip() or None
            confidence = primary.get("confidence", "medium")

            if is_blocklisted(name):
                stats["skipped_blocklist"] += 1
                continue

            cursor.execute("""
                UPDATE episodes
                SET guest_clean = ?,
                    guest_title_clean = ?,
                    guest_company_clean = ?,
                    extraction_confidence = ?,
                    extraction_method = 'llm'
                WHERE guid = ?
            """, (name, guest_title, company, confidence, ep["guid"]))
            stats["extracted"] += 1
            print(f"  Extracted: {name} ({confidence})")
        else:
            cursor.execute("""
                UPDATE episodes
                SET extraction_confidence = 'none',
                    extraction_method = 'llm'
                WHERE guid = ?
            """, (ep["guid"],))
            stats["no_guest"] += 1

    conn.commit()
    conn.close()
    return stats


def main():
    parser = argparse.ArgumentParser(
        description="Incremental update for Odd Lots episodes DB"
    )
    parser.add_argument("--dry-run", action="store_true",
                        help="Fetch and report but don't modify DB")
    parser.add_argument("--db", default=DB_PATH, help="Database path")
    args = parser.parse_args()

    db_path = args.db
    dry_run = args.dry_run

    if dry_run:
        print("=== DRY RUN MODE ===\n")

    # Step 1: Fetch and insert new episodes
    new_episodes = fetch_new_episodes(db_path, dry_run)
    inserted = 0

    if new_episodes and not dry_run:
        print("\nInserting new episodes...")
        inserted = insert_episodes(db_path, new_episodes)
        print(f"Inserted {inserted} new episodes")

    if dry_run:
        if new_episodes:
            print("\nNew episodes that would be added:")
            for ep in new_episodes:
                print(f"  [{ep['pub_date']}] {ep['title'][:80]}")
            print(f"\nTotal: {len(new_episodes)} episodes (dry run, no changes made)")
        else:
            print("\nNo new episodes found.")
        return 0

    # Step 2: LLM guest extraction for all unextracted episodes
    llm_stats = None
    unextracted = get_unextracted_episodes(db_path)

    if unextracted:
        if check_api_key():
            print(f"\nRunning LLM guest extraction on {len(unextracted)} unextracted episodes...")
            llm_stats = run_llm_extraction(db_path, unextracted)
            print(f"LLM extraction: {llm_stats}")
        else:
            print(f"\n{len(unextracted)} episodes need LLM extraction but OPENAI_API_KEY is not set.")
            print("Re-run with the key set to extract guest info.")
    else:
        print("\nAll episodes have been processed by LLM.")

    # Step 3-4: Backfill and rebuild FTS only if something changed
    did_work = inserted > 0 or (llm_stats and llm_stats["extracted"] > 0)

    if did_work:
        print("\nBackfilling repeat guests...")
        backfill_repeat_guests(db_path)

        print("\nRebuilding FTS index...")
        rebuild_fts_index(db_path)
    else:
        print("\nNo changes — skipping backfill and FTS rebuild.")

    # Summary
    print("\n" + "=" * 50)
    print("UPDATE COMPLETE")
    print(f"  New episodes added: {inserted}")
    if unextracted:
        if llm_stats:
            print(f"  Guests extracted: {llm_stats['extracted']}")
            print(f"  No guest found: {llm_stats['no_guest']}")
            if llm_stats["errors"]:
                print(f"  Errors: {llm_stats['errors']}")
        else:
            print(f"  Unextracted episodes remaining: {len(unextracted)}")
    print("=" * 50)

    return 0


if __name__ == "__main__":
    sys.exit(main())
