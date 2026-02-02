import sqlite3
import sys

# SQL helpers for preferring cleaned columns with fallback to originals
GUEST_COALESCE = "COALESCE(guest_clean, guest)"
TITLE_COALESCE = "COALESCE(guest_title_clean, guest_title)"
COMPANY_COALESCE = "COALESCE(guest_company_clean, guest_company)"


def search_episodes(query, limit=20):
    """Search episodes by keyword in title, guest, description, or company."""
    conn = sqlite3.connect('odd_lots_episodes.db')
    cursor = conn.cursor()

    cursor.execute(f'''
        SELECT e.title,
               COALESCE(e.guest_clean, e.guest) as guest,
               COALESCE(e.guest_title_clean, e.guest_title) as guest_title,
               COALESCE(e.guest_company_clean, e.guest_company) as guest_company,
               e.pub_date, e.description
        FROM episodes_fts fts
        JOIN episodes e ON fts.rowid = e.id
        WHERE episodes_fts MATCH ?
        ORDER BY e.pub_date DESC
        LIMIT ?
    ''', (query, limit))

    results = cursor.fetchall()
    conn.close()
    return results

def search_by_guest(guest_name, limit=20):
    """Search episodes by guest name (checks both original and cleaned columns)."""
    conn = sqlite3.connect('odd_lots_episodes.db')
    cursor = conn.cursor()

    cursor.execute(f'''
        SELECT title,
               {GUEST_COALESCE} as guest,
               {TITLE_COALESCE} as guest_title,
               {COMPANY_COALESCE} as guest_company,
               pub_date, description
        FROM episodes
        WHERE guest LIKE ? OR guest_clean LIKE ?
        ORDER BY pub_date DESC
        LIMIT ?
    ''', (f'%{guest_name}%', f'%{guest_name}%', limit))

    results = cursor.fetchall()
    conn.close()
    return results

def search_by_company(company_name, limit=20):
    """Search episodes by guest's company (checks both original and cleaned columns)."""
    conn = sqlite3.connect('odd_lots_episodes.db')
    cursor = conn.cursor()

    cursor.execute(f'''
        SELECT title,
               {GUEST_COALESCE} as guest,
               {TITLE_COALESCE} as guest_title,
               {COMPANY_COALESCE} as guest_company,
               pub_date
        FROM episodes
        WHERE guest_company LIKE ? OR guest_company_clean LIKE ?
        ORDER BY pub_date DESC
        LIMIT ?
    ''', (f'%{company_name}%', f'%{company_name}%', limit))

    results = cursor.fetchall()
    conn.close()
    return results

def list_all_guests(clean_only=False):
    """List all unique guests with episode counts and their info.

    Args:
        clean_only: If True, only show episodes with cleaned/verified guest data
    """
    conn = sqlite3.connect('odd_lots_episodes.db')
    cursor = conn.cursor()

    if clean_only:
        # Only show verified clean data
        cursor.execute('''
            SELECT guest_clean as guest,
                   COALESCE(guest_title_clean, guest_title) as guest_title,
                   COALESCE(guest_company_clean, guest_company) as guest_company,
                   COUNT(*) as appearances
            FROM episodes
            WHERE guest_clean IS NOT NULL
            GROUP BY guest_clean
            ORDER BY appearances DESC
        ''')
    else:
        # Use cleaned with fallback to original
        cursor.execute(f'''
            SELECT {GUEST_COALESCE} as guest,
                   {TITLE_COALESCE} as guest_title,
                   {COMPANY_COALESCE} as guest_company,
                   COUNT(*) as appearances
            FROM episodes
            WHERE {GUEST_COALESCE} IS NOT NULL
            GROUP BY {GUEST_COALESCE}
            ORDER BY appearances DESC
        ''')

    results = cursor.fetchall()
    conn.close()
    return results

def list_by_company():
    """List all guests grouped by company (uses cleaned data)."""
    conn = sqlite3.connect('odd_lots_episodes.db')
    cursor = conn.cursor()

    cursor.execute(f'''
        SELECT {COMPANY_COALESCE} as company,
               GROUP_CONCAT(DISTINCT {GUEST_COALESCE}),
               COUNT(*) as episodes
        FROM episodes
        WHERE {COMPANY_COALESCE} IS NOT NULL
        GROUP BY {COMPANY_COALESCE}
        ORDER BY episodes DESC
    ''')

    results = cursor.fetchall()
    conn.close()
    return results

def check_topic_covered(topic):
    """Check if a topic has been covered before."""
    results = search_episodes(topic)
    if results:
        print(f"\nFound {len(results)} episode(s) related to '{topic}':\n")
        for title, guest, gtitle, gcompany, date, desc in results:
            print(f"  [{date}] {title}")
            if guest:
                guest_info = guest
                if gtitle and gcompany:
                    guest_info += f" ({gtitle}, {gcompany})"
                elif gcompany:
                    guest_info += f" ({gcompany})"
                print(f"           Guest: {guest_info}")
            print()
    else:
        print(f"\nNo episodes found matching '{topic}' - appears to be a fresh topic!\n")
    return results

def get_stats():
    """Get database statistics (shows both original and cleaned data)."""
    conn = sqlite3.connect('odd_lots_episodes.db')
    cursor = conn.cursor()

    cursor.execute('SELECT COUNT(*) FROM episodes')
    total = cursor.fetchone()[0]

    cursor.execute('SELECT COUNT(*) FROM episodes WHERE guest IS NOT NULL')
    with_guests_orig = cursor.fetchone()[0]

    cursor.execute(f'SELECT COUNT(*) FROM episodes WHERE {GUEST_COALESCE} IS NOT NULL')
    with_guests_clean = cursor.fetchone()[0]

    cursor.execute('SELECT COUNT(*) FROM episodes WHERE guest_title IS NOT NULL OR guest_company IS NOT NULL')
    with_info_orig = cursor.fetchone()[0]

    cursor.execute(f'SELECT COUNT(*) FROM episodes WHERE {TITLE_COALESCE} IS NOT NULL OR {COMPANY_COALESCE} IS NOT NULL')
    with_info_clean = cursor.fetchone()[0]

    cursor.execute('SELECT MIN(pub_date), MAX(pub_date) FROM episodes')
    date_range = cursor.fetchone()

    # Get extraction method breakdown if clean columns exist
    cursor.execute('''
        SELECT extraction_method, COUNT(*)
        FROM episodes
        WHERE extraction_method IS NOT NULL
        GROUP BY extraction_method
    ''')
    by_method = cursor.fetchall()

    conn.close()

    print(f"\n=== Database Statistics ===")
    print(f"Total episodes: {total}")
    print(f"Date range: {date_range[0]} to {date_range[1]}")
    print(f"\nGuest identification:")
    print(f"  Original: {with_guests_orig} ({100*with_guests_orig/total:.1f}%)")
    print(f"  Cleaned:  {with_guests_clean} ({100*with_guests_clean/total:.1f}%)")
    print(f"\nWith title/company info:")
    print(f"  Original: {with_info_orig} ({100*with_info_orig/total:.1f}%)")
    print(f"  Cleaned:  {with_info_clean} ({100*with_info_clean/total:.1f}%)")

    if by_method:
        print(f"\nExtraction methods:")
        for method, count in by_method:
            print(f"  {method}: {count}")

def format_guest_info(guest, gtitle, gcompany):
    """Format guest info nicely."""
    if not guest:
        return None
    info = guest
    if gtitle and gcompany:
        info += f" - {gtitle} at {gcompany}"
    elif gcompany:
        info += f" - {gcompany}"
    elif gtitle:
        info += f" - {gtitle}"
    return info

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python query_episodes.py search <keyword>    # Full-text search")
        print("  python query_episodes.py guest <name>        # Search by guest name")
        print("  python query_episodes.py company <name>      # Search by company")
        print("  python query_episodes.py guests [--clean]    # List all guests (--clean for verified only)")
        print("  python query_episodes.py companies           # List by company")
        print("  python query_episodes.py check <topic>       # Check if topic covered")
        print("  python query_episodes.py stats               # Database statistics")
        sys.exit(1)

    cmd = sys.argv[1]

    if cmd == "search" and len(sys.argv) > 2:
        query = ' '.join(sys.argv[2:])
        results = search_episodes(query)
        for title, guest, gtitle, gcompany, date, desc in results:
            print(f"[{date}] {title}")
            guest_info = format_guest_info(guest, gtitle, gcompany)
            if guest_info:
                print(f"  Guest: {guest_info}")

    elif cmd == "guest" and len(sys.argv) > 2:
        name = ' '.join(sys.argv[2:])
        results = search_by_guest(name)
        for title, guest, gtitle, gcompany, date, desc in results:
            print(f"[{date}] {title}")
            guest_info = format_guest_info(guest, gtitle, gcompany)
            if guest_info:
                print(f"  {guest_info}")

    elif cmd == "company" and len(sys.argv) > 2:
        company = ' '.join(sys.argv[2:])
        results = search_by_company(company)
        print(f"Found {len(results)} episodes with guests from '{company}':\n")
        for title, guest, gtitle, gcompany, date in results:
            print(f"[{date}] {title}")
            guest_info = format_guest_info(guest, gtitle, gcompany)
            if guest_info:
                print(f"  {guest_info}")

    elif cmd == "guests":
        # Check for --clean flag
        clean_only = "--clean" in sys.argv
        guests = list_all_guests(clean_only=clean_only)
        label = "verified" if clean_only else "unique"
        print(f"Found {len(guests)} {label} guests:\n")
        for guest, gtitle, gcompany, count in guests[:50]:  # Top 50
            info = format_guest_info(guest, gtitle, gcompany)
            print(f"  {info}: {count} appearance(s)")

    elif cmd == "companies":
        companies = list_by_company()
        print(f"Found {len(companies)} unique companies:\n")
        for company, guests, count in companies[:30]:  # Top 30
            print(f"\n{company} ({count} episodes)")
            for g in guests.split(',')[:5]:  # Show up to 5 guests
                print(f"  - {g}")

    elif cmd == "check" and len(sys.argv) > 2:
        topic = ' '.join(sys.argv[2:])
        check_topic_covered(topic)

    elif cmd == "stats":
        get_stats()
