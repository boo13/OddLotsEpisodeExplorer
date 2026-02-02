#!/usr/bin/env python3
"""
Script to fix guest information in the Odd Lots episodes database.
Identifies clear mismatches and corrects them.
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

def extract_name_from_title(title: str) -> Optional[Tuple[str, str, str]]:
    """
    Extract guest name, title, and company from episode title.
    Returns (name, job_title, company) or None.
    """
    # Pattern: "Company's Name on Topic" - e.g., "Goldman's Hatzius and Snider on..."
    match = re.match(r"^([A-Za-z\s]+)'s\s+([A-Z][a-z]+(?:\s+[A-Z][a-z']+)+)\s+on\s+", title)
    if match:
        company = match.group(1).strip()
        name = match.group(2).strip()
        return (name, None, company)

    # Pattern: "Company CEO/CFO Name on Topic" - e.g., "Pimco CEO Manny Roman on..."
    match = re.match(r"^([A-Za-z\s]+)\s+(CEO|CFO|CIO|COO|President|Chairman)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z']+)+)\s+on\s+", title)
    if match:
        company = match.group(1).strip()
        job_title = match.group(2).strip()
        name = match.group(3).strip()
        return (name, job_title, company)

    # Pattern: "Name on Topic" at start - e.g., "Cullen Roche on the Art..."
    match = re.match(r"^([A-Z][a-z]+(?:\s+[A-Z][a-z']+)+)\s+on\s+", title)
    if match:
        name = match.group(1).strip()
        # Filter out false positives
        false_positives = ["How To", "Why It", "What It", "This Is"]
        if name not in false_positives and len(name.split()) >= 2:
            return (name, None, None)

    # Pattern: "Name Explains/Says/Breaks Down" - e.g., "Ray Dalio Explains..."
    match = re.match(r"^([A-Z][a-z]+(?:\s+[A-Z][a-z']+)+)\s+(Explains|Says|Breaks Down|Discusses|Talks|Warns)", title)
    if match:
        name = match.group(1).strip()
        if len(name.split()) >= 2:
            return (name, None, None)

    # Pattern: "Name's Title/Job/Company on" - e.g., "Ariel Investments' John Rogers on"
    match = re.match(r"^([A-Za-z\s]+)'s\s+([A-Z][a-z]+(?:\s+[A-Z][a-z']+)+)\s+on\s+", title)
    if match:
        company = match.group(1).strip()
        name = match.group(2).strip()
        if len(name.split()) >= 2:
            return (name, None, company)

    # Pattern: "Company Co-CEO/CFO Name on Topic"
    match = re.match(r"^([A-Za-z\s]+)\s+Co-(CEO|CFO|CIO)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z']+)+)\s+on\s+", title)
    if match:
        company = match.group(1).strip()
        job_title = f"Co-{match.group(2).strip()}"
        name = match.group(3).strip()
        return (name, job_title, company)

    # Pattern: "Name and Name on Topic" - Multiple guests
    match = re.match(r"^([A-Z][a-z]+(?:\s+[A-Z][a-z']+)*)\s+and\s+([A-Z][a-z]+(?:\s+[A-Z][a-z']+)*)\s+(?:on|Explain|Discuss)", title)
    if match:
        name1 = match.group(1).strip()
        name2 = match.group(2).strip()
        if len(name1.split()) >= 1 and len(name2.split()) >= 1:
            return (f"{name1}, {name2}", None, None)

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

        # Handle multiple guests
        if ',' in n1 or ',' in n2:
            n1_guests = [g.strip() for g in n1.split(',')]
            n2_guests = [g.strip() for g in n2.split(',')]
            for g1 in n1_guests:
                for g2 in n2_guests:
                    if g1.split()[-1] == g2.split()[-1]:
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

def find_corrections(episodes: List[Dict]) -> List[GuestCorrection]:
    """Find episodes that need corrections."""
    corrections = []

    for ep in episodes:
        title = ep['title']
        current_guest = ep['guest_clean']

        # Extract guest info from title
        extracted = extract_name_from_title(title)

        if extracted:
            name, job_title, company = extracted

            # Check if there's a mismatch
            if current_guest:
                if not names_match(name, current_guest):
                    corrections.append(GuestCorrection(
                        episode_id=ep['id'],
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
                    episode_id=ep['id'],
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
    if dry_run:
        print("\n" + "=" * 80)
        print("DRY RUN - No changes will be made")
        print("=" * 80)

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    for corr in corrections:
        print(f"\nID {corr.episode_id}: {corr.title}")
        print(f"  Current: {corr.current_guest}")
        print(f"  Correct: {corr.correct_guest}")
        if corr.correct_title:
            print(f"  Title: {corr.correct_title}")
        if corr.correct_company:
            print(f"  Company: {corr.correct_company}")

        if not dry_run:
            cursor.execute("""
                UPDATE episodes
                SET guest_clean = ?,
                    guest_title_clean = COALESCE(?, guest_title_clean),
                    guest_company_clean = COALESCE(?, guest_company_clean),
                    extraction_method = 'title_correction'
                WHERE id = ?
            """, (corr.correct_guest, corr.correct_title, corr.correct_company, corr.episode_id))

    if not dry_run:
        conn.commit()
        print(f"\n\nApplied {len(corrections)} corrections to the database.")

    conn.close()

def main():
    import sys

    db_path = "odd_lots_episodes.db"
    dry_run = "--apply" not in sys.argv

    print("=" * 80)
    print("Odd Lots Guest Data Correction Tool")
    print("=" * 80)

    episodes = get_all_episodes(db_path)
    corrections = find_corrections(episodes)

    # Separate by type
    mismatches = [c for c in corrections if c.source == "title_mismatch"]
    missing = [c for c in corrections if c.source == "missing_guest"]

    print(f"\nTotal episodes: {len(episodes)}")
    print(f"Episodes with mismatched guests: {len(mismatches)}")
    print(f"Episodes with missing guests (extractable from title): {len(missing)}")

    print("\n" + "=" * 80)
    print("MISMATCHED GUESTS TO FIX")
    print("=" * 80)
    for corr in mismatches:
        print(f"\nID {corr.episode_id}: {corr.title}")
        print(f"  Current: {corr.current_guest}")
        print(f"  Correct: {corr.correct_guest}")
        if corr.correct_company:
            print(f"  Company: {corr.correct_company}")

    print("\n" + "=" * 80)
    print("MISSING GUESTS TO ADD")
    print("=" * 80)
    for corr in missing:
        print(f"\nID {corr.episode_id}: {corr.title}")
        print(f"  Guest: {corr.correct_guest}")
        if corr.correct_company:
            print(f"  Company: {corr.correct_company}")

    if dry_run:
        print("\n" + "=" * 80)
        print("To apply these corrections, run:")
        print("  python fix_guest_data.py --apply")
        print("=" * 80)
    else:
        apply_corrections(db_path, corrections, dry_run=False)

    return corrections

if __name__ == "__main__":
    main()
