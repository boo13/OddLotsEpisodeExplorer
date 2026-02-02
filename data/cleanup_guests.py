"""
Orchestrates guest cleanup: schema changes, blocklist filtering, LLM extraction, and backfill.
"""

import os
import sqlite3
import argparse
from llm_extract_guests import run_batch_extraction, BLOCKLIST, check_api_key


def add_clean_columns(db_path: str = "odd_lots_episodes.db"):
    """Add new columns for cleaned guest data (preserves originals)."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    new_columns = [
        ("guest_clean", "TEXT"),
        ("guest_title_clean", "TEXT"),
        ("guest_company_clean", "TEXT"),
        ("extraction_confidence", "TEXT"),  # 'high'/'medium'/'low'/'none'
        ("extraction_method", "TEXT"),      # 'regex'/'llm'/'manual'/'backfill'
    ]

    for col_name, col_type in new_columns:
        try:
            cursor.execute(f'ALTER TABLE episodes ADD COLUMN {col_name} {col_type}')
            print(f"Added column: {col_name}")
        except sqlite3.OperationalError:
            print(f"Column already exists: {col_name}")

    conn.commit()
    conn.close()


def copy_existing_extractions(db_path: str = "odd_lots_episodes.db"):
    """Copy existing regex-extracted data to clean columns as baseline."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Build blocklist conditions with proper escaping
    blocklist_conditions = " AND ".join([
        f"guest NOT LIKE '%{blocked.replace(chr(39), chr(39)+chr(39))}%'"
        for blocked in BLOCKLIST
    ])

    # Copy existing extractions that look valid
    cursor.execute(f'''
        UPDATE episodes
        SET guest_clean = guest,
            guest_title_clean = guest_title,
            guest_company_clean = guest_company,
            extraction_confidence = 'medium',
            extraction_method = 'regex'
        WHERE guest IS NOT NULL
          AND guest_clean IS NULL
          AND {blocklist_conditions}
    ''')

    copied = cursor.rowcount
    print(f"Copied {copied} existing regex extractions to clean columns")

    conn.commit()
    conn.close()
    return copied


def filter_blocklist(db_path: str = "odd_lots_episodes.db"):
    """Remove blocklisted values from clean columns."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cleared = 0
    for blocked in BLOCKLIST:
        cursor.execute('''
            UPDATE episodes
            SET guest_clean = NULL,
                guest_title_clean = NULL,
                guest_company_clean = NULL,
                extraction_confidence = NULL,
                extraction_method = NULL
            WHERE guest_clean LIKE ?
        ''', (f'%{blocked}%',))
        cleared += cursor.rowcount

    print(f"Cleared {cleared} blocklisted entries")

    conn.commit()
    conn.close()
    return cleared


def backfill_repeat_guests(db_path: str = "odd_lots_episodes.db"):
    """
    For guests appearing multiple times, propagate title/company info.
    If any episode has title/company for a guest, copy to others.
    """
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Find guests with incomplete info that appear in multiple episodes
    cursor.execute('''
        SELECT guest_clean, COUNT(*) as cnt
        FROM episodes
        WHERE guest_clean IS NOT NULL
        GROUP BY guest_clean
        HAVING cnt > 1
    ''')

    repeat_guests = cursor.fetchall()
    print(f"Found {len(repeat_guests)} repeat guests to check for backfill")

    backfilled = 0

    for guest_name, count in repeat_guests:
        # Find the best info for this guest (prefer high confidence)
        cursor.execute('''
            SELECT guest_title_clean, guest_company_clean, extraction_confidence
            FROM episodes
            WHERE guest_clean = ?
              AND (guest_title_clean IS NOT NULL OR guest_company_clean IS NOT NULL)
            ORDER BY
                CASE extraction_confidence
                    WHEN 'high' THEN 1
                    WHEN 'medium' THEN 2
                    WHEN 'low' THEN 3
                    ELSE 4
                END
            LIMIT 1
        ''', (guest_name,))

        best_info = cursor.fetchone()

        if best_info:
            title, company, confidence = best_info

            # Update episodes for this guest that are missing info
            cursor.execute('''
                UPDATE episodes
                SET guest_title_clean = COALESCE(guest_title_clean, ?),
                    guest_company_clean = COALESCE(guest_company_clean, ?),
                    extraction_method = CASE
                        WHEN guest_title_clean IS NULL OR guest_company_clean IS NULL
                        THEN 'backfill'
                        ELSE extraction_method
                    END
                WHERE guest_clean = ?
                  AND (guest_title_clean IS NULL OR guest_company_clean IS NULL)
            ''', (title, company, guest_name))

            if cursor.rowcount > 0:
                backfilled += cursor.rowcount
                print(f"  Backfilled {cursor.rowcount} episodes for {guest_name}")

    conn.commit()
    conn.close()

    print(f"Total backfilled: {backfilled} episodes")
    return backfilled


def rebuild_fts_index(db_path: str = "odd_lots_episodes.db"):
    """Rebuild FTS index to include clean columns."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute('DROP TABLE IF EXISTS episodes_fts')
    cursor.execute('''
        CREATE VIRTUAL TABLE episodes_fts USING fts5(
            title, guest, description, guest_title, guest_company,
            guest_clean, guest_title_clean, guest_company_clean,
            content=episodes, content_rowid=id
        )
    ''')
    cursor.execute('''
        INSERT INTO episodes_fts(rowid, title, guest, description, guest_title, guest_company,
                                 guest_clean, guest_title_clean, guest_company_clean)
        SELECT id, title, guest, description, guest_title, guest_company,
               guest_clean, guest_title_clean, guest_company_clean
        FROM episodes
    ''')

    conn.commit()
    conn.close()
    print("Rebuilt FTS index with clean columns")


def print_stats(db_path: str = "odd_lots_episodes.db", label: str = "Current"):
    """Print statistics about guest data."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute('SELECT COUNT(*) FROM episodes')
    total = cursor.fetchone()[0]

    cursor.execute('SELECT COUNT(*) FROM episodes WHERE guest IS NOT NULL')
    with_guest_orig = cursor.fetchone()[0]

    cursor.execute('SELECT COUNT(*) FROM episodes WHERE guest_clean IS NOT NULL')
    with_guest_clean = cursor.fetchone()[0]

    cursor.execute('SELECT COUNT(*) FROM episodes WHERE guest_title IS NOT NULL OR guest_company IS NOT NULL')
    with_info_orig = cursor.fetchone()[0]

    cursor.execute('SELECT COUNT(*) FROM episodes WHERE guest_title_clean IS NOT NULL OR guest_company_clean IS NOT NULL')
    with_info_clean = cursor.fetchone()[0]

    cursor.execute('''
        SELECT extraction_method, COUNT(*)
        FROM episodes
        WHERE extraction_method IS NOT NULL
        GROUP BY extraction_method
    ''')
    by_method = cursor.fetchall()

    cursor.execute('''
        SELECT extraction_confidence, COUNT(*)
        FROM episodes
        WHERE extraction_confidence IS NOT NULL
        GROUP BY extraction_confidence
    ''')
    by_confidence = cursor.fetchall()

    conn.close()

    print(f"\n=== {label} Stats ===")
    print(f"Total episodes: {total}")
    print(f"Original guest field: {with_guest_orig} ({100*with_guest_orig/total:.1f}%)")
    print(f"Clean guest field: {with_guest_clean} ({100*with_guest_clean/total:.1f}%)")
    print(f"Original with title/company: {with_info_orig} ({100*with_info_orig/total:.1f}%)")
    print(f"Clean with title/company: {with_info_clean} ({100*with_info_clean/total:.1f}%)")

    if by_method:
        print("\nBy extraction method:")
        for method, count in by_method:
            print(f"  {method}: {count}")

    if by_confidence:
        print("\nBy confidence:")
        for conf, count in by_confidence:
            print(f"  {conf}: {count}")


def compare_samples(db_path: str = "odd_lots_episodes.db", limit: int = 10):
    """Show side-by-side comparison of original vs clean data."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute('''
        SELECT title, guest, guest_clean, guest_title, guest_title_clean,
               guest_company, guest_company_clean, extraction_method
        FROM episodes
        WHERE guest_clean IS NOT NULL
           OR guest IS NOT NULL
        ORDER BY pub_date DESC
        LIMIT ?
    ''', (limit,))

    print(f"\n=== Sample Comparison (most recent {limit}) ===")
    for row in cursor.fetchall():
        title, g_orig, g_clean, t_orig, t_clean, c_orig, c_clean, method = row
        print(f"\nTitle: {title[:70]}...")
        print(f"  Original: {g_orig or '(none)'}")
        if t_orig or c_orig:
            print(f"    -> {t_orig} @ {c_orig}")
        print(f"  Cleaned:  {g_clean or '(none)'} [{method or 'n/a'}]")
        if t_clean or c_clean:
            print(f"    -> {t_clean} @ {c_clean}")

    conn.close()


def run_full_cleanup(db_path: str = "odd_lots_episodes.db",
                     skip_llm: bool = False,
                     batch_size: int = 10,
                     llm_limit: int = None):
    """Run the full cleanup pipeline."""

    print("=" * 60)
    print("GUEST INFO CLEANUP PIPELINE")
    print("=" * 60)

    # Step 1: Add new columns
    print("\n[Step 1] Adding clean columns...")
    add_clean_columns(db_path)

    # Capture before stats
    print_stats(db_path, "Before Cleanup")

    # Step 2: Copy existing regex extractions
    print("\n[Step 2] Copying existing regex extractions...")
    copy_existing_extractions(db_path)

    # Step 3: Filter blocklist
    print("\n[Step 3] Filtering blocklist...")
    filter_blocklist(db_path)

    # Step 4: LLM extraction
    if not skip_llm:
        if not check_api_key():
            print("\n[Step 4] Skipping LLM extraction (no API key)")
            print("         Set OPENAI_API_KEY and re-run, or use --skip-llm")
        else:
            print(f"\n[Step 4] Running LLM extraction (batch_size={batch_size})...")
            stats = run_batch_extraction(
                db_path=db_path,
                batch_size=batch_size,
                limit=llm_limit
            )
            print(f"LLM extraction complete: {stats}")
    else:
        print("\n[Step 4] Skipping LLM extraction (--skip-llm)")

    # Step 5: Backfill repeat guests
    print("\n[Step 5] Backfilling repeat guests...")
    backfill_repeat_guests(db_path)

    # Step 6: Rebuild FTS index
    print("\n[Step 6] Rebuilding FTS index...")
    rebuild_fts_index(db_path)

    # Final stats
    print_stats(db_path, "After Cleanup")

    # Show samples
    compare_samples(db_path, limit=15)

    print("\n" + "=" * 60)
    print("CLEANUP COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Guest info cleanup orchestrator")
    parser.add_argument("--db", default="odd_lots_episodes.db", help="Database path")
    parser.add_argument("--skip-llm", action="store_true", help="Skip LLM extraction step")
    parser.add_argument("--batch-size", type=int, default=10, help="LLM batch size")
    parser.add_argument("--llm-limit", type=int, help="Limit LLM extraction to N episodes")
    parser.add_argument("--stats-only", action="store_true", help="Only show stats")
    parser.add_argument("--backfill-only", action="store_true", help="Only run backfill step")

    args = parser.parse_args()

    if args.stats_only:
        print_stats(args.db, "Current")
        compare_samples(args.db)
    elif args.backfill_only:
        backfill_repeat_guests(args.db)
        print_stats(args.db, "After Backfill")
    else:
        run_full_cleanup(
            db_path=args.db,
            skip_llm=args.skip_llm,
            batch_size=args.batch_size,
            llm_limit=args.llm_limit
        )
