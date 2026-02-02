#!/usr/bin/env python3
"""
Script to verify and fix guest information in the Odd Lots episodes database.
Fetches transcripts from OMNY URLs and extracts guest information.
"""

import sqlite3
import requests
from bs4 import BeautifulSoup
import re
import time
import json
from typing import Optional, Tuple, List
from dataclasses import dataclass

@dataclass
class GuestInfo:
    name: str
    title: Optional[str] = None
    company: Optional[str] = None
    confidence: str = "high"

# Patterns for episodes that legitimately don't have guests
NO_GUEST_PATTERNS = [
    r"^Tracy and Joe Answer",
    r"^Joe and Tracy Answer",
    r"AMA Episode",
    r"^Introducing[:\s]",
    r"^Listen Now:",
    r"^Coming Soon:",
    r"Preview$",
    r"Sponsored Content",
    r"Top \d+ Things We Learned",
    r"Most Interesting Things We Learned",
    r"^Lots More on",  # These are usually Tracy/Joe only discussions
    r"^The Odd Lots Preview",
]

def is_likely_no_guest_episode(title: str) -> bool:
    """Check if an episode title suggests it likely has no guests."""
    for pattern in NO_GUEST_PATTERNS:
        if re.search(pattern, title, re.IGNORECASE):
            return True
    return False

def extract_guest_from_title(title: str) -> Optional[GuestInfo]:
    """Try to extract guest name from episode title."""
    # Pattern: "Name on Topic" or "Name's Topic"
    patterns = [
        r"^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+on\s+",  # "John Smith on Topic"
        r"^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)'s\s+",      # "John Smith's Topic"
        r"'s\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+on\s+",  # "Company's John Smith on"
        r"([A-Z][a-z]+\s+[A-Z][a-z]+)\s+(?:Explains|Breaks Down|Discusses|Says|Talks)",
        r"Meet\s+(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)",
        r"How\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+",
    ]

    for pattern in patterns:
        match = re.search(pattern, title)
        if match:
            name = match.group(1)
            # Filter out common false positives
            false_positives = ["The Man", "The Woman", "One Analyst", "One Woman", "The World"]
            if name not in false_positives:
                return GuestInfo(name=name, confidence="medium")

    return None

def fetch_transcript_excerpt(omny_url: str, timeout: int = 10) -> Optional[str]:
    """Fetch the beginning of the transcript from an OMNY page."""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
        response = requests.get(omny_url, headers=headers, timeout=timeout)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, 'html.parser')

        # Look for JSON-LD data which often contains description
        scripts = soup.find_all('script', type='application/ld+json')
        for script in scripts:
            try:
                data = json.loads(script.string)
                if isinstance(data, dict) and 'description' in data:
                    return data['description']
            except:
                continue

        # Look for meta description
        meta_desc = soup.find('meta', attrs={'name': 'description'})
        if meta_desc and meta_desc.get('content'):
            return meta_desc['content']

        return None
    except Exception as e:
        print(f"Error fetching {omny_url}: {e}")
        return None

def extract_guest_from_description(description: str) -> Optional[GuestInfo]:
    """Extract guest information from episode description."""
    if not description:
        return None

    # Common patterns in descriptions
    patterns = [
        r"speak(?:ing)?\s+(?:with|to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)",
        r"guest\s+(?:is|today)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)",
        r"joined\s+by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)",
        r"interview(?:s|ing)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)",
    ]

    for pattern in patterns:
        match = re.search(pattern, description, re.IGNORECASE)
        if match:
            return GuestInfo(name=match.group(1), confidence="medium")

    return None

def get_episodes_to_verify(db_path: str) -> List[dict]:
    """Get all episodes that need verification."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, title, guest_clean, guest_title_clean, guest_company_clean,
               description, omny_url
        FROM episodes
        ORDER BY id
    """)

    episodes = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return episodes

def check_guest_title_mismatch(episode: dict) -> Optional[str]:
    """Check if the guest name doesn't match the episode title when it should."""
    title = episode['title']
    guest = episode['guest_clean']

    if not guest:
        return None

    # Check if title mentions a name that's different from the stored guest
    title_guest = extract_guest_from_title(title)
    if title_guest:
        # Normalize names for comparison
        title_name = title_guest.name.lower()
        guest_name = guest.lower()

        # Check if names match (allowing for partial matches)
        title_parts = set(title_name.split())
        guest_parts = set(guest_name.split())

        if not title_parts.intersection(guest_parts):
            return f"Mismatch: Title suggests '{title_guest.name}' but guest is '{guest}'"

    return None

def update_guest_info(db_path: str, episode_id: int, guest_info: GuestInfo):
    """Update guest information in the database."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE episodes
        SET guest_clean = ?,
            guest_title_clean = ?,
            guest_company_clean = ?,
            extraction_confidence = ?,
            extraction_method = 'transcript_verification'
        WHERE id = ?
    """, (
        guest_info.name,
        guest_info.title,
        guest_info.company,
        guest_info.confidence,
        episode_id
    ))

    conn.commit()
    conn.close()

def main():
    db_path = "odd_lots_episodes.db"

    print("=" * 80)
    print("Odd Lots Guest Data Verification Report")
    print("=" * 80)

    episodes = get_episodes_to_verify(db_path)

    issues = {
        'missing_guests': [],
        'mismatched_guests': [],
        'no_guest_episodes': [],
        'verified_correct': []
    }

    for ep in episodes:
        title = ep['title']
        guest = ep['guest_clean']

        # Check if this is a no-guest episode
        if is_likely_no_guest_episode(title):
            if not guest:
                issues['no_guest_episodes'].append(ep)
            continue

        # Check for mismatches
        mismatch = check_guest_title_mismatch(ep)
        if mismatch:
            issues['mismatched_guests'].append({
                'episode': ep,
                'issue': mismatch
            })
            continue

        # Check for missing guests
        if not guest:
            title_guest = extract_guest_from_title(title)
            if title_guest:
                issues['missing_guests'].append({
                    'episode': ep,
                    'suggested_guest': title_guest
                })
        else:
            issues['verified_correct'].append(ep)

    # Print report
    print(f"\nTotal episodes: {len(episodes)}")
    print(f"Episodes with potential mismatched guests: {len(issues['mismatched_guests'])}")
    print(f"Episodes with missing guests (name in title): {len(issues['missing_guests'])}")
    print(f"Episodes correctly identified as no-guest: {len(issues['no_guest_episodes'])}")
    print(f"Episodes with verified correct guests: {len(issues['verified_correct'])}")

    print("\n" + "=" * 80)
    print("MISMATCHED GUESTS (Guest doesn't match title)")
    print("=" * 80)
    for item in issues['mismatched_guests'][:50]:  # Show first 50
        ep = item['episode']
        print(f"\nID {ep['id']}: {ep['title']}")
        print(f"  Current guest: {ep['guest_clean']}")
        print(f"  Issue: {item['issue']}")

    print("\n" + "=" * 80)
    print("MISSING GUESTS (Name appears in title but no guest data)")
    print("=" * 80)
    for item in issues['missing_guests'][:50]:  # Show first 50
        ep = item['episode']
        print(f"\nID {ep['id']}: {ep['title']}")
        print(f"  Suggested guest: {item['suggested_guest'].name}")

    return issues

if __name__ == "__main__":
    main()
