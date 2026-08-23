"""
Fetch all Undisclosed podcast episodes from their RSS feed,
classify by format and season, and save to undisclosed_episodes.json.
"""

import feedparser
import json
import re
from datetime import datetime

RSS_URL = "https://audioboom.com/channels/3709182.rss"

# Maps regex patterns to season labels
CASE_SEASON_MAP = [
    (r'State v\.? Adnan Syed 2\.0', 'S7'),
    (r'State v\.? Amanda Lewis', 'S7'),
    (r'State v\.? Jason Carroll', 'S6'),
    (r'State v\.? Darrell Ewing', 'S6'),
    (r'State v\.? Willis and Braddy', 'S6'),
    (r'State v\.? Willis & Braddy', 'S6'),
    (r'State v\.? Jeff Titus', 'S5'),
    (r'State v\.? John Brookins', 'S5'),
    (r'State v\.? Jonathan Irons', 'S5'),
    (r'State v\.? Fred Freeman', 'S5'),
    (r'State v\.? Greg Lance', 'S4'),
    (r'State v\.? Joseph Webster', 'S4'),
    (r'State v\.? Rocky Myers', 'S4'),
    (r'State v\.? Keith Davis', 'S4'),
    (r'Case Against Adnan Syed', 'S4'),
    (r'State v\.? Dennis Perry', 'S3'),
    (r'State v\.? Pamela Lanier', 'S3'),
    (r'State v\.? Pam Lanier', 'S3'),
    (r'State v\.? Ronnie Long', 'S3'),
    (r'State v\.? Chester Hollman', 'S3'),
    (r'State v\.? Terrance Lewis', 'S3'),
    (r'State v\.? Willie Veasy', 'S3'),
    (r'State v\.? Shaurn Thomas', 'S3'),
    (r'State v\.? Gary Mitchum Reeves', 'S3'),
    (r'Killing of Freddie Gray', 'S3'),
    (r'State v\.? Jamar Huggins', 'S3'),
    (r'State v\.? Joey Watkins', 'S2'),
    (r'State v\.? Adnan Syed', 'S1'),
]


def classify_format(title: str) -> str:
    t = title.strip()

    if re.match(r'TJ Weekly', t, re.I):
        return 'TJ Weekly'

    if re.match(r'Undisclosed:\s*Unfiltered', t, re.I):
        return 'Unfiltered'

    if re.search(r'\bAddendum\b', t, re.I):
        return 'Addendum'

    # Adnan 2.0 mini series
    if re.match(r'The State v\. Adnan Syed 2\.0', t):
        return 'Mini Series'

    # Explicitly labeled mini series
    if re.match(r'Mini Series', t, re.I):
        return 'Mini Series'

    # S7 Ep## prefix
    if re.match(r'S\d+\s+Ep\d+:', t):
        return 'Season Episode'

    # "S#, The State v. X - Episode N" pattern
    if re.match(r'S[1-9][,\s]', t) and re.search(r'[-–]\s*Episode\s+\d+', t):
        return 'Season Episode'

    # "State v. X – Episode N" or "State v. X, Episode N" or "State v. X, Ep N"
    if re.match(r'(The )?State v\.', t) and re.search(r'[,–\-]\s*(Episode|Ep)\s+\d+', t):
        return 'Season Episode'

    # "The Killing of Freddie Gray, Episode N"
    if 'Killing of Freddie Gray' in t and re.search(r'(Episode|Ep)\s+\d+', t):
        return 'Season Episode'

    # "The Case Against Adnan Syed - Episode N"
    if 'Case Against Adnan Syed' in t and re.search(r'(Episode|Ep)\s+\d+', t):
        return 'Season Episode'

    # Update episodes
    if re.search(r'\bUpdate Episode\b|\bThe Latest\b', t, re.I):
        return 'Bonus'

    # Bonus content
    if re.search(r'Bonus Episode|Bonus Addendum|Bonus Update', t, re.I):
        return 'Bonus'
    if re.search(r'PCR Hearing|Patreon Bonus', t, re.I):
        return 'Bonus'

    return 'Other'


def extract_season(title: str, fmt: str) -> str | None:
    # Explicit "S# Ep##:" or "S#," prefix
    m = re.match(r'S(\d+)\s+Ep\d+:', title)
    if m:
        return f'S{m.group(1)}'
    m = re.match(r'S(\d+)[,\s]', title)
    if m:
        return f'S{m.group(1)}'

    # Only bother mapping for episode-type formats
    if fmt not in ('Season Episode', 'Addendum', 'Mini Series'):
        return None

    for pattern, season in CASE_SEASON_MAP:
        if re.search(pattern, title, re.I):
            return season

    return None


def extract_case_name(title: str, fmt: str) -> str | None:
    if fmt not in ('Season Episode', 'Addendum', 'Mini Series'):
        return None

    t = title
    # Strip "S7 Ep10: " prefix
    t = re.sub(r'^S\d+\s+Ep\d+:\s*', '', t)
    # Strip "S#, " prefix
    t = re.sub(r'^S\d+,\s*', '', t)
    # Strip "Mini Series - " prefix
    t = re.sub(r'^Mini Series\s*[-–]\s*', '', t)

    # Split on " - Episode N" or " - Addendum N" (with either dash)
    parts = re.split(r'\s*[-–]\s*(Episode|Addendum)\s+\d+', t)
    case = parts[0].strip()

    # Further clean trailing dash/title if somehow remaining
    case = re.sub(r'\s*[-–]\s*.*$', '', case).strip()

    return case if case else None


def extract_guest(title: str, fmt: str) -> str | None:
    if fmt == 'TJ Weekly':
        m = re.match(r'TJ Weekly\s*[-–:]\s*(.+)', title, re.I)
        if m:
            return m.group(1).strip()
    return None


def parse_duration(duration_str) -> int | None:
    if not duration_str:
        return None
    try:
        parts = str(duration_str).split(':')
        if len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
        elif len(parts) == 2:
            return int(parts[0]) * 60 + int(parts[1])
        elif len(parts) == 1:
            return int(parts[0])
    except Exception:
        return None


def fetch_episodes() -> list[dict]:
    print("Fetching RSS feed...")
    feed = feedparser.parse(RSS_URL)
    print(f"Found {len(feed.entries)} episodes")

    episodes = []
    for entry in feed.entries:
        title = entry.get('title', '').strip()
        description = entry.get('summary', '') or entry.get('description', '') or ''
        episode_link = entry.get('link', '')

        pub_date = None
        if hasattr(entry, 'published_parsed') and entry.published_parsed:
            pub_date = datetime(*entry.published_parsed[:6]).strftime('%Y-%m-%d')

        duration = None
        if hasattr(entry, 'itunes_duration'):
            duration = parse_duration(entry.itunes_duration)

        fmt = classify_format(title)
        season = extract_season(title, fmt)
        case_name = extract_case_name(title, fmt)
        guest = extract_guest(title, fmt)

        episodes.append({
            'title': title,
            'format': fmt,
            'season': season,
            'case_name': case_name,
            'guest': guest,
            'pub_date': pub_date,
            'duration_seconds': duration,
            'description': description,
            'episode_link': episode_link,
        })

    # Sort newest first, then assign stable IDs
    episodes.sort(key=lambda e: e['pub_date'] or '0000-00-00', reverse=True)
    for i, ep in enumerate(episodes):
        ep['id'] = i + 1

    return episodes


def print_stats(episodes: list[dict]) -> None:
    from collections import Counter

    print(f"\nTotal episodes: {len(episodes)}")
    print(f"Date range: {episodes[-1]['pub_date']} → {episodes[0]['pub_date']}")

    print("\nFormat breakdown:")
    for fmt, count in Counter(e['format'] for e in episodes).most_common():
        print(f"  {fmt}: {count}")

    print("\nSeason breakdown:")
    season_counts = Counter(e['season'] for e in episodes if e['season'])
    for s in ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7']:
        print(f"  {s}: {season_counts.get(s, 0)}")

    print("\nTJ Weekly guests:")
    for ep in episodes:
        if ep['format'] == 'TJ Weekly' and ep['guest']:
            print(f"  [{ep['pub_date']}] {ep['guest']}")

    print("\nOther (unclassified) episodes:")
    for ep in episodes:
        if ep['format'] == 'Other':
            print(f"  [{ep['pub_date']}] {ep['title']}")


if __name__ == '__main__':
    episodes = fetch_episodes()

    output_path = 'undisclosed_episodes.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(episodes, f, indent=2, ensure_ascii=False)

    print(f"\nSaved {len(episodes)} episodes to {output_path}")
    print_stats(episodes)
