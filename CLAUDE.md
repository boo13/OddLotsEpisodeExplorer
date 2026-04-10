# CLAUDE.md

This repository is now an Undisclosed dashboard POC.

## Overview

The app is a thin Next.js shell around a curated Undisclosed case dataset in `src/lib/undisclosedData.ts`. The UI keeps the dense grid, search bar, filter pills, stats panel, and drawer pattern, but the semantics are now case-oriented instead of the prior podcast explorer.

## Data model

- `src/lib/queries.ts` filters and summarizes the in-memory case data.
- `src/lib/db.ts` is a no-op compatibility shim.
- The dashboard currently tracks:
  - season
  - format
  - collection
  - source link

## Key flows

- `src/app/page.tsx` loads the full dataset, applies search/filter highlights, and renders the main dashboard.
- `src/components/StatsPanel.tsx` fetches `/api/stats` and shows the simplified Undisclosed summary.
- `src/app/api/` routes still exist for compatibility, but they now read from the in-memory Undisclosed data.

## Commands

- `npm run dev`
- `npm run build`
- `npm run lint`

## Notes

- The first milestone is a proof of concept, not the final Undisclosed taxonomy.
- Keep future changes aligned with the official Undisclosed source of truth.
