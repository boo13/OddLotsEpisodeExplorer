import feedparser
import sqlite3
import re
from datetime import datetime

def extract_guest(title):
    """
    Attempt to extract guest name from episode title.
    Common patterns:
    - "Guest Name on Topic"
    - "Why Topic with Guest Name"
    - "Lots More with Guest Name"
    Returns None if no clear guest pattern found.
    """
    patterns = [
        r'^([A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+on\s+',  # "John Smith on..."
        r'^([A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+Explains',  # "John Smith Explains..."
        r'with\s+([A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s*$',  # "...with John Smith"
        r'^Lots More [Ww]ith\s+([A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)?)',  # "Lots More with..."
    ]
    for pattern in patterns:
        match = re.search(pattern, title)
        if match:
            return match.group(1)
    return None

def parse_duration(duration_str):
    """Convert duration string to seconds."""
    if not duration_str:
        return None
    try:
        parts = duration_str.split(':')
        if len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
        elif len(parts) == 2:
            return int(parts[0]) * 60 + int(parts[1])
    except:
        return None

def fetch_and_store_episodes():
    RSS_URL = "https://www.omnycontent.com/d/playlist/e73c998e-6e60-432f-8610-ae210140c5b1/8a94442e-5a74-4fa2-8b8d-ae27003a8d6b/982f5071-765c-403d-969d-ae27003a8d83/podcast.rss"

    print("Fetching RSS feed...")
    feed = feedparser.parse(RSS_URL)

    print(f"Found {len(feed.entries)} episodes")

    # Create database
    conn = sqlite3.connect('odd_lots_episodes.db')
    cursor = conn.cursor()

    # Create tables
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS episodes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            guest TEXT,
            description TEXT,
            pub_date TEXT,
            duration_seconds INTEGER,
            episode_url TEXT,
            guid TEXT UNIQUE
        )
    ''')

    cursor.execute('CREATE INDEX IF NOT EXISTS idx_title ON episodes(title)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_guest ON episodes(guest)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_pub_date ON episodes(pub_date)')

    # Insert episodes
    for entry in feed.entries:
        title = entry.get('title', '')
        description = entry.get('summary', '') or entry.get('description', '')
        guid = entry.get('id', '') or entry.get('guid', '')

        # Parse publication date
        pub_date = None
        if 'published_parsed' in entry and entry.published_parsed:
            pub_date = datetime(*entry.published_parsed[:6]).strftime('%Y-%m-%d')

        # Get duration
        duration = None
        if 'itunes_duration' in entry:
            duration = parse_duration(entry.itunes_duration)

        # Get episode URL
        episode_url = entry.get('link', '')
        if 'links' in entry:
            for link in entry.links:
                if link.get('type', '').startswith('audio'):
                    episode_url = link.get('href', episode_url)
                    break

        # Extract guest
        guest = extract_guest(title)

        try:
            cursor.execute('''
                INSERT OR IGNORE INTO episodes
                (title, guest, description, pub_date, duration_seconds, episode_url, guid)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (title, guest, description, pub_date, duration, episode_url, guid))
        except sqlite3.IntegrityError:
            pass  # Skip duplicates

    conn.commit()

    # Create FTS table for full-text search
    cursor.execute('DROP TABLE IF EXISTS episodes_fts')
    cursor.execute('''
        CREATE VIRTUAL TABLE episodes_fts USING fts5(title, guest, description, content=episodes, content_rowid=id)
    ''')
    cursor.execute('''
        INSERT INTO episodes_fts(rowid, title, guest, description)
        SELECT id, title, guest, description FROM episodes
    ''')

    conn.commit()

    # Print stats
    cursor.execute('SELECT COUNT(*) FROM episodes')
    total = cursor.fetchone()[0]

    cursor.execute('SELECT COUNT(*) FROM episodes WHERE guest IS NOT NULL')
    with_guests = cursor.fetchone()[0]

    cursor.execute('SELECT MIN(pub_date), MAX(pub_date) FROM episodes')
    date_range = cursor.fetchone()

    print(f"\n=== Database Created ===")
    print(f"Total episodes: {total}")
    print(f"Episodes with identified guests: {with_guests}")
    print(f"Date range: {date_range[0]} to {date_range[1]}")

    # Top 20 most frequent guests
    print(f"\n=== Top 20 Most Frequent Guests ===")
    cursor.execute('''
        SELECT guest, COUNT(*) as appearances
        FROM episodes
        WHERE guest IS NOT NULL
        GROUP BY guest
        ORDER BY appearances DESC
        LIMIT 20
    ''')
    for guest, count in cursor.fetchall():
        print(f"  {guest}: {count} appearance(s)")

    # Sample of 10 recent episode titles
    print(f"\n=== 10 Most Recent Episodes ===")
    cursor.execute('''
        SELECT title, pub_date FROM episodes
        ORDER BY pub_date DESC
        LIMIT 10
    ''')
    for title, date in cursor.fetchall():
        print(f"  [{date}] {title}")

    conn.close()

if __name__ == "__main__":
    fetch_and_store_episodes()
