# CLAUDE.md

This is an **Undisclosed podcast episode explorer** — a dense visual dashboard for browsing, filtering, and analyzing all 500+ episodes of the Undisclosed: Toward Justice podcast.

Inspired by: https://github.com/boo13/oddlotsepisodeexplorer

## Overview

The app fetches the full Undisclosed podcast feed from Audioboom RSS, classifies every episode by format and season, and presents them in a dense interactive grid with search, format filters, and season filters.

## Data pipeline

- `data/fetch_undisclosed.py` — fetches `https://audioboom.com/channels/3709182.rss`, classifies all episodes, and writes `data/undisclosed_episodes.json`
- `src/lib/undisclosedEpisodes.json` — copy of the fetched data, imported by the app (copy from `data/` after re-fetching)
- `src/lib/undisclosedData.ts` — re-exports the JSON as typed `Episode[]`

To refresh episode data:
```bash
cd data && python3 fetch_undisclosed.py
cp undisclosed_episodes.json ../src/lib/undisclosedEpisodes.json
```

## Format taxonomy

| Format | Description |
|--------|-------------|
| TJ Weekly | Weekly episodes featuring Tiffany Justice + guests (launched Jul 2025) |
| Unfiltered | Regular host discussion/commentary episodes (launched Jan 2026) |
| Season Episode | Main deep-dive case investigation episodes (S1–S7) |
| Addendum | Supplemental addendum episodes tied to cases |
| Mini Series | Short multi-episode series (Jonathan Irons, Willis & Braddy, Adnan 2.0, etc.) |
| Bonus | Bonus content, PCR hearings, update episodes |
| Other | Announcements, trailers, crossovers, explainers |

## Season taxonomy

| Season | Case(s) | Year(s) |
|--------|---------|---------|
| S1 | The State v. Adnan Syed | 2015–2016 |
| S2 | The State v. Joey Watkins | 2016–2017 |
| S3 | Multiple cases (Jamar Huggins, Freddie Gray, Gary Mitchum Reeves, Shaurn Thomas, Willie Veasy, Terrance Lewis, Chester Hollman III, Ronnie Long, Pam Lanier, Dennis Perry) | 2017–2020 |
| S4 | Multiple cases (Case Against Adnan Syed, Keith Davis Jr., Rocky Myers, Joseph Webster, Greg Lance) | 2019 |
| S5 | Jeff Titus + mini series (Jonathan Irons, John Brookins, Fred Freeman) | 2020–2021 |
| S6 | Jason Carroll, Darrell Ewing | 2021–2022 |
| S7 | Amanda Lewis + Adnan Syed 2.0 | 2025 |

**Relaunch**: Feb 2025 ("Undisclosed: Relaunch" episode). TJ Weekly began Jul 2025. Unfiltered began Jan 2026.

## Key files

- `src/lib/queries.ts` — all data querying (search, format filter, season filter, stats)
- `src/lib/categories.ts` — format and season definitions with colors
- `src/types/episode.ts` — `Episode` and `EpisodeWithHighlight` types
- `src/app/page.tsx` — main dashboard page
- `src/components/EpisodeGrid.tsx` — dense grid visualization
- `src/components/EpisodeRect.tsx` — individual episode cell with tooltip
- `src/components/EpisodeDrawer.tsx` — episode detail drawer
- `src/components/StatsPanel.tsx` — stats breakdown panel
- `src/components/CategoryPills.tsx` — season filter pills (S1–S7)
- `src/components/FormatPills.tsx` — format filter pills with exclude mode

## Commands

- `npm run dev`
- `npm run build`
- `npm run lint`

## Current state (POC)

This is a proof of concept for an Undisclosed analytics dashboard. Future directions:
- Guest appearance tracking across all episode types (not just TJ Weekly)
- Timeline/calendar view
- Case outcome tracking (exonerated, still incarcerated, etc.)
- Performance/engagement metrics (when available)
