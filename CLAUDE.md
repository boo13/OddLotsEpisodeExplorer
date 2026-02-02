# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Interactive visualization dashboard for ~1,133 Bloomberg Odd Lots podcast episodes (2015-2026). Displays all episodes as a dense grid of colored rectangles with search, category filtering, format filtering, and stats panels.

## Commands

- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run lint` — ESLint
- No test framework is configured.

## Architecture

**Next.js 16 + React 19** app using the App Router. Single-page client-side app (`'use client'` page) with server-side API routes.

**Data layer**: SQLite database via `better-sqlite3` in readonly mode. The DB file lives at `data/odd_lots_episodes.db` (inside this repo). It has an `episodes` table with cleaned columns (`guest_clean`, `guest_title_clean`, `guest_company_clean`) that are COALESCEd with raw columns in all queries. FTS5 full-text search is available via `episodes_fts`.

**API routes** (`src/app/api/`): Thin wrappers around query functions — `episodes`, `search`, `category`, `format`, `guest`, `company`, `stats`, `format-counts`. All queries are in `src/lib/queries.ts`.

**Frontend**: All state lives in `src/app/page.tsx` (the single page component). Filtering by category/format/guest/company/search all follow the same pattern: fetch matching episodes from API, then highlight those IDs on the grid with gradient colors.

**Key data concepts**:
- **Categories** (`src/lib/categories.ts`): Topic-based keyword groups (Fed, China, Crypto, etc.) matched via SQL LIKE queries
- **Formats**: Episode types (Lots More, Sponsored Content, Cross-Promotion, Listener Questions) matched by title keywords
- **Exclude mode**: Formats can be excluded from percentage calculations via `excludedFormats` state

**UI components** (`src/components/`): shadcn/ui (new-york style) with Tailwind v4. `EpisodeGrid` renders the dense rectangle grid, `EpisodeRect` is each cell, `EpisodeDrawer` shows episode details on click.
