import sqlite3
import re

def extract_guest_info(description, title):
    """
    Extract guest name, title, and company from episode description.
    Common patterns:
    - "we speak with Guest Name, the Title at Company"
    - "we speak with Guest Name, a Title at Company"
    - "Guest Name is the Title at/of Company"
    - "Guest Name, Title at Company, joins us"
    """
    if not description:
        return None, None, None

    # Remove HTML tags
    desc = re.sub(r'<[^>]+>', ' ', description)
    desc = re.sub(r'\s+', ' ', desc).strip()

    # Patterns to find guest introduction
    patterns = [
        # "we speak with Guest Name, the/a Title at/of Company"
        r'(?:speak|talk|chat|joined by|speaking) with ([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+),\s+(?:the|a|an)\s+([^,\.]+?)\s+(?:at|of|for)\s+([A-Z][^,\.]+?)(?:\.|,|and|\s+He|\s+She|\s+They|\s+who)',

        # "Guest Name, the/a Title at/of Company, joins/explains"
        r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+),\s+(?:the|a|an)\s+([^,]+?)\s+(?:at|of|for)\s+([A-Z][^,]+?)(?:,|\.|and)\s+(?:joins|explains|discusses|talks|shares)',

        # "Guest Name is the/a Title at/of Company"
        r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+is\s+(?:the|a|an)\s+([^,\.]+?)\s+(?:at|of|for)\s+([A-Z][^,\.]+?)(?:\.|,|and|\s+He|\s+She|\s+They)',

        # "Guest Name, Title at Company" (without article)
        r'(?:speak|talk|chat|joined by) with ([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+),\s+([A-Z][^,]+?)\s+(?:at|of)\s+([A-Z][^,\.]+?)(?:\.|,)',

        # "we speak with Guest Name of Company"
        r'(?:speak|talk|chat) with ([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+(?:of|from)\s+([A-Z][^,\.]+?)(?:\.|,|about)',

        # "Guest Name, who leads/runs/heads Company"
        r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+),\s+who\s+(?:leads|runs|heads|founded|co-founded)\s+([^,\.]+?)(?:\.|,)',
    ]

    for pattern in patterns:
        match = re.search(pattern, desc)
        if match:
            groups = match.groups()
            if len(groups) == 3:
                name, title_role, company = groups
                # Clean up
                title_role = title_role.strip()
                company = company.strip()
                # Remove trailing words that got caught
                company = re.sub(r'\s+(He|She|They|who|While|In|On|For|The|This|That|and).*$', '', company)
                return name.strip(), title_role, company
            elif len(groups) == 2:
                # Pattern without explicit title
                name, company = groups
                return name.strip(), None, company.strip()

    return None, None, None


def extract_from_title_pattern(title):
    """
    Extract guest from title patterns and try to find their info.
    """
    # Common title patterns
    patterns = [
        r"^([A-Z][a-z]+(?:\s+[A-Z][a-z']+)+)\s+on\s+",
        r"^([A-Z][a-z]+(?:\s+[A-Z][a-z']+)+)\s+Explains",
        r"with\s+([A-Z][a-z]+(?:\s+[A-Z][a-z']+)+)\s*$",
        r"^Lots More [Ww]ith\s+([A-Z][a-z]+(?:\s+[A-Z][a-z']+)+)",
        r"^([A-Z][a-z]+(?:\s+[A-Z][a-z']+)+)'s\s+",  # "Person's View on..."
    ]

    for pattern in patterns:
        match = re.search(pattern, title)
        if match:
            return match.group(1)
    return None


def update_database():
    conn = sqlite3.connect('odd_lots_episodes.db')
    cursor = conn.cursor()

    # Add new columns if they don't exist
    try:
        cursor.execute('ALTER TABLE episodes ADD COLUMN guest_title TEXT')
    except sqlite3.OperationalError:
        pass  # Column already exists

    try:
        cursor.execute('ALTER TABLE episodes ADD COLUMN guest_company TEXT')
    except sqlite3.OperationalError:
        pass  # Column already exists

    # Get all episodes
    cursor.execute('SELECT id, title, description, guest FROM episodes')
    episodes = cursor.fetchall()

    updated = 0
    guest_found = 0

    for ep_id, title, description, existing_guest in episodes:
        guest_name, guest_title, guest_company = extract_guest_info(description, title)

        # If we found guest info from description
        if guest_name:
            # Update or set guest name if not already set
            if not existing_guest:
                cursor.execute('UPDATE episodes SET guest = ? WHERE id = ?', (guest_name, ep_id))
                guest_found += 1

            # Update title and company
            if guest_title or guest_company:
                cursor.execute('''
                    UPDATE episodes
                    SET guest_title = ?, guest_company = ?
                    WHERE id = ?
                ''', (guest_title, guest_company, ep_id))
                updated += 1

        # Try to extract guest from title if not found
        elif not existing_guest:
            title_guest = extract_from_title_pattern(title)
            if title_guest:
                cursor.execute('UPDATE episodes SET guest = ? WHERE id = ?', (title_guest, ep_id))
                guest_found += 1

    conn.commit()

    # Rebuild FTS index
    cursor.execute('DROP TABLE IF EXISTS episodes_fts')
    cursor.execute('''
        CREATE VIRTUAL TABLE episodes_fts USING fts5(
            title, guest, description, guest_title, guest_company,
            content=episodes, content_rowid=id
        )
    ''')
    cursor.execute('''
        INSERT INTO episodes_fts(rowid, title, guest, description, guest_title, guest_company)
        SELECT id, title, guest, description, guest_title, guest_company FROM episodes
    ''')
    conn.commit()

    # Print stats
    print(f"Updated {updated} episodes with title/company info")
    print(f"Found {guest_found} additional guests from descriptions/titles")

    # Show sample of extracted data
    print("\n=== Sample Guest Info ===")
    cursor.execute('''
        SELECT guest, guest_title, guest_company, title
        FROM episodes
        WHERE guest_title IS NOT NULL OR guest_company IS NOT NULL
        ORDER BY pub_date DESC
        LIMIT 20
    ''')
    for guest, gtitle, gcompany, title in cursor.fetchall():
        print(f"\n{guest}")
        if gtitle:
            print(f"  Title: {gtitle}")
        if gcompany:
            print(f"  Company: {gcompany}")
        print(f"  Episode: {title[:60]}...")

    # Count stats
    cursor.execute('SELECT COUNT(*) FROM episodes WHERE guest IS NOT NULL')
    total_guests = cursor.fetchone()[0]

    cursor.execute('SELECT COUNT(*) FROM episodes WHERE guest_title IS NOT NULL OR guest_company IS NOT NULL')
    with_info = cursor.fetchone()[0]

    print(f"\n=== Final Stats ===")
    print(f"Episodes with identified guests: {total_guests}")
    print(f"Episodes with title/company info: {with_info}")

    conn.close()


if __name__ == "__main__":
    update_database()
