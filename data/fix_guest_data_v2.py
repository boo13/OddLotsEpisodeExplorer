#!/usr/bin/env python3
"""
Script to fix guest information in the Odd Lots episodes database.
More refined version that handles edge cases properly.
"""

import sqlite3
import re
from typing import Optional, List, Tuple, Dict
from dataclasses import dataclass

@dataclass
class GuestCorrection:
    episode_id: int
    title: str
    current_guest: str
    correct_guest: str
    correct_title: Optional[str] = None
    correct_company: Optional[str] = None
    confidence: str = "high"
    source: str = "title_extraction"

# Known corrections from manual transcript verification
MANUAL_CORRECTIONS = {
    # Completely wrong guest - verified via transcript
    2: {"guest": "Michael Zawadzki", "title": "Global Chief Investment Officer", "company": "Blackstone Credit and Insurance"},
    3: {"guest": "Manny Roman", "title": "CEO", "company": "Pimco"},
    8: {"guest": "Cullen Roche", "title": "Founder", "company": "Discipline Funds"},
    241: {"guest": "Mary Daly", "title": "President", "company": "San Francisco Fed"},

    # Missing guest - verified via transcript
    13: {"guest": "Bart Hutchins", "title": "Chef-Owner", "company": "Butterworth's"},
    15: {"guest": "Jan Hatzius, Ben Snider", "title": "Chief Economist and Head of Research, Chief US Equity Strategist", "company": "Goldman Sachs"},
    387: {"guest": "Jamie Mack", "title": "CFO", "company": "Moderna"},
    878: {"guest": "Zoltan Pozsar, Perry Mehrling", "title": None, "company": None},
    860: {"guest": "Tom Hayes", "title": None, "company": None},  # LIBOR whistleblower
    1051: {"guest": "Phil Hellmuth", "title": "Poker Legend", "company": None},

    # Multiple guests - only one was listed (verified via transcript/title)
    202: {"guest": "Eugene Fama, David Booth", "title": "Nobel Laureate, Founder and Chairman", "company": "Dimensional Fund Advisors"},
    205: {"guest": "Jared Cohen, George Lee", "title": None, "company": "Goldman Sachs"},
    250: {"guest": "Jan Hatzius, David Kostin", "title": None, "company": "Goldman Sachs"},
    277: {"guest": "Richard Koo, Zichen Wang", "title": None, "company": None},
    307: {"guest": "Nate Silver, Maria Konnikova", "title": None, "company": None},
    561: {"guest": "Neil Dutta, Conor Sen", "title": None, "company": None},
    721: {"guest": "Mitu Gulati, Ugo Panizza", "title": None, "company": None},
    446: {"guest": "Gerard O'Reilly", "title": "Co-CEO", "company": "Dimensional"},
}

# Episode patterns that DON'T have guests
NO_GUEST_PATTERNS = [
    r"^Lots More on",  # These are host-only discussions (usually)
    r"^Introducing[:\s]",
    r"^Listen Now:",
    r"^Coming Soon:",
    r"Preview$",
    r"Sponsored Content",
    r"Top \d+ Things We Learned",
    r"Most Interesting Things We Learned",
    r"AMA Episode",
    r"Tracy and Joe Answer",
    r"Joe and Tracy Answer",
    r"^The Odd Lots Preview$",
    r"^Beak Capitalism,",  # Multi-part series without named guests
    r"^Pot Lots Part",
    r"^The Hidden History of Eurodollars",
]

def is_no_guest_episode(title: str) -> bool:
    """Check if an episode title suggests it likely has no external guests."""
    for pattern in NO_GUEST_PATTERNS:
        if re.search(pattern, title, re.IGNORECASE):
            return True
    return False

def extract_name_from_title(title: str) -> Optional[Tuple[str, str, str]]:
    """
    Extract guest name, title, and company from episode title.
    Returns (name, job_title, company) or None.
    """
    # Skip no-guest episodes
    if is_no_guest_episode(title):
        return None

    # Pattern: "Company's Name on Topic" - e.g., "Goldman's Hatzius and Snider on..."
    match = re.match(r"^([A-Za-z]+(?:'s)?)\s+([A-Z][a-z]+(?:\s+(?:and\s+)?[A-Z][a-z']+)+)\s+on\s+", title)
    if match:
        company = match.group(1).rstrip("'s").strip()
        name = match.group(2).strip()
        # Filter out false positives
        if name.lower() not in ["how to", "why it", "what it", "this is", "lots more"]:
            return (name, None, company)

    # Pattern: "Company CEO/CFO Name on Topic" - e.g., "Pimco CEO Manny Roman on..."
    match = re.match(r"^([A-Za-z\s]+?)\s+(CEO|CFO|CIO|COO|President|Chairman|Co-CEO)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z']+)+)\s+on\s+", title)
    if match:
        company = match.group(1).strip()
        job_title = match.group(2).strip()
        name = match.group(3).strip()
        return (name, job_title, company)

    # Pattern: "Name on Topic" at start - e.g., "Cullen Roche on the Art..."
    match = re.match(r"^([A-Z][a-z]+\s+[A-Z][a-z']+(?:\s+[A-Z][a-z']+)?)\s+on\s+(?:the|How|Why|What)", title)
    if match:
        name = match.group(1).strip()
        # Must be a real name (two+ capitalized words)
        if len(name.split()) >= 2:
            return (name, None, None)

    # Pattern: "Name Explains/Says/Breaks Down" - e.g., "Ray Dalio Explains..."
    match = re.match(r"^([A-Z][a-z]+\s+[A-Z][a-z']+)\s+(Explains|Says|Breaks Down|Discusses|Talks|Warns|Is)", title)
    if match:
        name = match.group(1).strip()
        if len(name.split()) >= 2:
            return (name, None, None)

    # Pattern: "Company Co-CEO/CFO Name on Topic"
    match = re.match(r"^([A-Za-z\s]+)\s+(Co-CEO|Co-CFO|Co-CIO)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z']+)+)\s+on\s+", title)
    if match:
        company = match.group(1).strip()
        job_title = match.group(2).strip()
        name = match.group(3).strip()
        return (name, job_title, company)

    # Pattern: "Ariel Investments' John Rogers on..." - Company's Name on
    match = re.match(r"^([A-Za-z\s]+)'s\s+([A-Z][a-z]+\s+[A-Z][a-z']+)\s+on\s+", title)
    if match:
        company = match.group(1).strip()
        name = match.group(2).strip()
        if len(name.split()) >= 2:
            return (name, None, company)

    # Pattern: "San Francisco Fed President Mary Daly Explains..."
    match = re.match(r"^(?:San Francisco|New York|Boston|Atlanta|Chicago|Dallas|Cleveland|Minneapolis|Richmond|St\.?\s*Louis|Kansas City|Philadelphia)\s+Fed\s+(?:President|Chair)\s+([A-Z][a-z]+\s+[A-Z][a-z']+)", title)
    if match:
        name = match.group(1).strip()
        return (name, "President", "Federal Reserve")

    return None

def names_match(name1: str, name2: str) -> bool:
    """Check if two names refer to the same person."""
    if not name1 or not name2:
        return False

    # Normalize names
    n1 = name1.lower().strip()
    n2 = name2.lower().strip()

    # Direct match
    if n1 == n2:
        return True

    # Check if last names match
    n1_parts = n1.split()
    n2_parts = n2.split()

    if n1_parts and n2_parts:
        # Last name match
        if n1_parts[-1] == n2_parts[-1]:
            return True

        # Handle multiple guests - check if any last name matches
        if ',' in n1 or ',' in n2:
            n1_guests = [g.strip().split()[-1] if g.strip().split() else '' for g in n1.replace(' and ', ', ').split(',')]
            n2_guests = [g.strip().split()[-1] if g.strip().split() else '' for g in n2.replace(' and ', ', ').split(',')]
            for g1 in n1_guests:
                if g1 and g1 in n2_guests:
                    return True

    return False

def get_all_episodes(db_path: str) -> List[Dict]:
    """Get all episodes from the database."""
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

def find_corrections(episodes: List[Dict], manual_only: bool = True) -> List[GuestCorrection]:
    """Find episodes that need corrections."""
    corrections = []

    for ep in episodes:
        ep_id = ep['id']
        title = ep['title']
        current_guest = ep['guest_clean']

        # Check if we have a manual correction
        if ep_id in MANUAL_CORRECTIONS:
            manual = MANUAL_CORRECTIONS[ep_id]
            if current_guest != manual['guest']:
                corrections.append(GuestCorrection(
                    episode_id=ep_id,
                    title=title,
                    current_guest=current_guest or "(none)",
                    correct_guest=manual['guest'],
                    correct_title=manual.get('title'),
                    correct_company=manual.get('company'),
                    confidence="high",
                    source="manual_verification"
                ))
            continue

        # If manual_only mode, skip auto-detection (too many false positives)
        if manual_only:
            continue

        # Skip no-guest episodes
        if is_no_guest_episode(title):
            continue

        # Extract guest info from title
        extracted = extract_name_from_title(title)

        if extracted:
            name, job_title, company = extracted

            # Check if there's a mismatch
            if current_guest:
                if not names_match(name, current_guest):
                    corrections.append(GuestCorrection(
                        episode_id=ep_id,
                        title=title,
                        current_guest=current_guest,
                        correct_guest=name,
                        correct_title=job_title,
                        correct_company=company,
                        confidence="high",
                        source="title_mismatch"
                    ))
            else:
                # Missing guest that should be there
                corrections.append(GuestCorrection(
                    episode_id=ep_id,
                    title=title,
                    current_guest="(none)",
                    correct_guest=name,
                    correct_title=job_title,
                    correct_company=company,
                    confidence="medium",
                    source="missing_guest"
                ))

    return corrections

def apply_corrections(db_path: str, corrections: List[GuestCorrection], dry_run: bool = True):
    """Apply corrections to the database."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    applied = 0
    for corr in corrections:
        if not dry_run:
            cursor.execute("""
                UPDATE episodes
                SET guest_clean = ?,
                    guest_title_clean = COALESCE(?, guest_title_clean),
                    guest_company_clean = COALESCE(?, guest_company_clean),
                    extraction_method = 'guest_correction_v2'
                WHERE id = ?
            """, (corr.correct_guest, corr.correct_title, corr.correct_company, corr.episode_id))
            applied += 1

    if not dry_run:
        conn.commit()
        print(f"\nApplied {applied} corrections to the database.")

    conn.close()

def main():
    import sys

    db_path = "odd_lots_episodes.db"
    dry_run = "--apply" not in sys.argv

    print("=" * 80)
    print("Odd Lots Guest Data Correction Tool (v2)")
    print("=" * 80)

    episodes = get_all_episodes(db_path)
    corrections = find_corrections(episodes)

    # Separate by type
    manual = [c for c in corrections if c.source == "manual_verification"]
    mismatches = [c for c in corrections if c.source == "title_mismatch"]
    missing = [c for c in corrections if c.source == "missing_guest"]

    print(f"\nTotal episodes: {len(episodes)}")
    print(f"Manual corrections (transcript verified): {len(manual)}")
    print(f"Title-based mismatches: {len(mismatches)}")
    print(f"Missing guests (extractable from title): {len(missing)}")
    print(f"Total corrections: {len(corrections)}")

    if manual:
        print("\n" + "=" * 80)
        print("MANUAL CORRECTIONS (Verified via transcript)")
        print("=" * 80)
        for corr in manual:
            print(f"\nID {corr.episode_id}: {corr.title}")
            print(f"  Current: {corr.current_guest}")
            print(f"  Correct: {corr.correct_guest}")
            if corr.correct_title:
                print(f"  Title: {corr.correct_title}")
            if corr.correct_company:
                print(f"  Company: {corr.correct_company}")

    if mismatches:
        print("\n" + "=" * 80)
        print("TITLE-BASED MISMATCHES")
        print("=" * 80)
        for corr in mismatches:
            print(f"\nID {corr.episode_id}: {corr.title}")
            print(f"  Current: {corr.current_guest}")
            print(f"  Correct: {corr.correct_guest}")
            if corr.correct_company:
                print(f"  Company: {corr.correct_company}")

    if missing:
        print("\n" + "=" * 80)
        print("MISSING GUESTS (From title extraction)")
        print("=" * 80)
        for corr in missing:
            print(f"\nID {corr.episode_id}: {corr.title}")
            print(f"  Guest: {corr.correct_guest}")
            if corr.correct_company:
                print(f"  Company: {corr.correct_company}")

    if dry_run:
        print("\n" + "=" * 80)
        print("To apply these corrections, run:")
        print("  python fix_guest_data_v2.py --apply")
        print("=" * 80)
    else:
        apply_corrections(db_path, corrections, dry_run=False)

    return corrections

if __name__ == "__main__":
    main()
