# Prompt: Odd Lots Podcast Episode Database Builder

## Context
I'm preparing for a job interview as a producer on Bloomberg's "Odd Lots" podcast. I need to create a comprehensive episode database so I can search past episodes before proposing new topic/guest ideas.

## Task
Create two outputs:
1. **SQLite database** (`odd_lots_episodes.db`) containing ALL episodes
2. **Python script** (`query_episodes.py`) to search the database

## Data Source
Use the official RSS feed:
```
https://www.omnycontent.com/d/playlist/e73c998e-6e60-432f-8610-ae210140c5b1/8a94442e-5a74-4fa2-8b8d-ae27003a8d6b/982f5071-765c-403d-969d-ae27003a8d83/podcast.rss
```

Fallback: Apple Podcasts API
```
https://itunes.apple.com/lookup?id=1056200096&entity=podcastEpisode&limit=200
```
Note: Apple API limits to 200 results per call, so you may need pagination or multiple approaches.

## Database Schema
```sql
CREATE TABLE episodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    guest TEXT,  -- Extract from title if possible (e.g., "John Smith on Topic X" -> "John Smith")
    description TEXT,
    pub_date TEXT,  -- ISO format: YYYY-MM-DD
    duration_seconds INTEGER,
    episode_url TEXT,
    guid TEXT UNIQUE  -- From RSS feed, for deduplication
);

CREATE INDEX idx_title ON episodes(title);
CREATE INDEX idx_guest ON episodes(guest);
CREATE INDEX idx_pub_date ON episodes(pub_date);

CREATE VIRTUAL TABLE episodes_fts USING fts5(title, guest, description);
```

## Python Script for Data Collection

```python
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

    conn.close()

if __name__ == "__main__":
    fetch_and_store_episodes()
```

## Query Script (query_episodes.py)

```python
import sqlite3
import sys

def search_episodes(query, limit=20):
    """Search episodes by keyword in title, guest, or description."""
    conn = sqlite3.connect('odd_lots_episodes.db')
    cursor = conn.cursor()

    cursor.execute('''
        SELECT e.title, e.guest, e.pub_date, e.description
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
    """Search episodes by guest name."""
    conn = sqlite3.connect('odd_lots_episodes.db')
    cursor = conn.cursor()

    cursor.execute('''
        SELECT title, guest, pub_date, description
        FROM episodes
        WHERE guest LIKE ?
        ORDER BY pub_date DESC
        LIMIT ?
    ''', (f'%{guest_name}%', limit))

    results = cursor.fetchall()
    conn.close()
    return results

def list_all_guests():
    """List all unique guests with episode counts."""
    conn = sqlite3.connect('odd_lots_episodes.db')
    cursor = conn.cursor()

    cursor.execute('''
        SELECT guest, COUNT(*) as appearances
        FROM episodes
        WHERE guest IS NOT NULL
        GROUP BY guest
        ORDER BY appearances DESC
    ''')

    results = cursor.fetchall()
    conn.close()
    return results

def check_topic_covered(topic):
    """Check if a topic has been covered before."""
    results = search_episodes(topic)
    if results:
        print(f"\n⚠️  Found {len(results)} episode(s) related to '{topic}':\n")
        for title, guest, date, desc in results:
            print(f"  [{date}] {title}")
            if guest:
                print(f"           Guest: {guest}")
            print()
    else:
        print(f"\n✅ No episodes found matching '{topic}' - appears to be a fresh topic!\n")
    return results

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python query_episodes.py search <keyword>")
        print("  python query_episodes.py guest <name>")
        print("  python query_episodes.py guests")
        print("  python query_episodes.py check <topic>")
        sys.exit(1)

    cmd = sys.argv[1]

    if cmd == "search" and len(sys.argv) > 2:
        query = ' '.join(sys.argv[2:])
        results = search_episodes(query)
        for title, guest, date, desc in results:
            print(f"[{date}] {title}")
            if guest:
                print(f"  Guest: {guest}")

    elif cmd == "guest" and len(sys.argv) > 2:
        name = ' '.join(sys.argv[2:])
        results = search_by_guest(name)
        for title, guest, date, desc in results:
            print(f"[{date}] {title}")

    elif cmd == "guests":
        guests = list_all_guests()
        print(f"Found {len(guests)} unique guests:\n")
        for guest, count in guests[:50]:  # Top 50
            print(f"  {guest}: {count} appearance(s)")

    elif cmd == "check" and len(sys.argv) > 2:
        topic = ' '.join(sys.argv[2:])
        check_topic_covered(topic)
```

## Requirements
```
pip install feedparser
```

## Expected Output
After running `fetch_and_store_episodes()`, you should have:
- `odd_lots_episodes.db` - SQLite database with 1,000+ episodes
- Full-text search capability
- Guest extraction where possible

## CRITICAL INSTRUCTIONS
1. **DO NOT fabricate any data** - only use what comes from the RSS feed
2. If guest extraction fails, leave the field as NULL rather than guessing
3. Preserve exact titles and descriptions from the feed
4. Log any parsing errors but continue processing

## After Database Creation
Please also provide:
1. Total episode count
2. Date range of episodes
3. List of top 20 most frequent guests
4. Sample of 10 recent episode titles to verify data quality

---

Once you have the database file, please send it back to me along with the query script.
