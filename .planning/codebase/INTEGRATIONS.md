# External Integrations

**Analysis Date:** 2026-02-01

## APIs & External Services

**Not applicable** - This project contains no external API integrations.

The dashboard is self-contained with no calls to external services, APIs, or SDKs.

## Data Storage

**Databases:**
- SQLite (local file-based)
  - Provider: Local filesystem
  - Location: `data/odd_lots_episodes.db` (relative to project root)
  - Access: Read-only via `better-sqlite3`
  - Client: `better-sqlite3` package (v12.6.2)
  - Connection: `src/lib/db.ts` - Singleton instance created on first access
  - Schema includes:
    - `episodes` table (main data with guest, company, category, format fields)
    - `episodes_fts` table (FTS5 full-text search index)
  - Connection pattern:
    ```typescript
    // src/lib/db.ts
    function getDb(): Database {
      if (!db) {
        const dbPath = path.join(process.cwd(), 'data', 'odd_lots_episodes.db');
        db = new Database(dbPath, { readonly: true });
      }
      return db;
    }
    ```

**File Storage:**
- Local filesystem only (no cloud storage)
- Public assets: `public/` directory

**Caching:**
- None - No caching layer (Memcached, Redis, etc.)
- In-memory state only: React component state via `useState`

## Authentication & Identity

**Auth Provider:** Not applicable

No authentication or authorization required. Dashboard is public with no user login/session management.

## Monitoring & Observability

**Error Tracking:** Not detected

No error tracking service integrated (Sentry, LogRocket, etc.).

**Logs:**
- Console logging only via `console.error()`
- Client-side error logging to browser console:
  - Search failures: `src/app/page.tsx` line 94
  - Load failures: `src/app/page.tsx` line 46
- Server-side error logging via Next.js API routes:
  - Episode fetch errors: `src/app/api/episodes/route.ts` line 9

## CI/CD & Deployment

**Hosting:** Not detected

Project structure suggests local development only. No Vercel, Netlify, or other platform deployment detected.

**CI Pipeline:** Not detected

No GitHub Actions, GitLab CI, or other CI configuration found.

## Environment Configuration

**Required env vars:** None

No environment variables required. Database path is hardcoded relative to working directory.

**Secrets location:** Not applicable

No API keys, tokens, or secrets needed. Database is read-only local file.

## API Routes (Internal)

The application exposes internal Next.js API routes for client-side queries:

**`GET /api/episodes`** (`src/app/api/episodes/route.ts`)
- Returns: All 1,133 episodes
- Query: `getAllEpisodes()` from `src/lib/queries.ts`
- Response: JSON array of Episode objects

**`GET /api/search?q={query}`** (`src/app/api/search/route.ts`)
- Returns: Episodes matching FTS5 or LIKE search
- Query: `searchEpisodes(query)` from `src/lib/queries.ts`
- Response: JSON array of matching episodes

**`GET /api/category?name={categoryName}`** (`src/app/api/category/route.ts`)
- Returns: Episodes matching a category topic
- Query: `searchByCategory(keywords)` from `src/lib/queries.ts`
- Response: JSON object with episodes array

**`GET /api/format?name={formatName}`** (`src/app/api/format/route.ts`)
- Returns: Episodes matching a format (e.g., "Podcast", "Interview")
- Query: `searchByFormat(keywords)` from `src/lib/queries.ts`
- Response: JSON object with episodes array

**`GET /api/guest?name={guestName}`** (`src/app/api/guest/route.ts`)
- Returns: Episodes with specific guest
- Query: `searchByGuest(guestName)` from `src/lib/queries.ts`
- Response: JSON object with episodes array

**`GET /api/company?name={companyName}`** (`src/app/api/company/route.ts`)
- Returns: Episodes with specific company mention
- Query: `searchByCompany(companyName)` from `src/lib/queries.ts`
- Response: JSON object with episodes array

**`GET /api/format-counts`** (`src/app/api/format-counts/route.ts`)
- Returns: Counts and episode IDs for each format
- Query: `getFormatCounts()` from `src/lib/queries.ts`
- Response: JSON array of FormatCount objects with name, count, episodeIds

**`GET /api/stats`** (`src/app/api/stats/route.ts`)
- Returns: Aggregated statistics (total episodes, hours, duration averages)
- Query: Multiple stats queries from `src/lib/queries.ts`
- Response: JSON object with summary data

## Webhooks & Callbacks

**Incoming:** Not applicable

No webhook endpoints defined.

**Outgoing:** Not applicable

No external service callbacks or webhook registrations.

## Data Flow Summary

```
User Browser
  ↓
Next.js App Router (Client Components)
  ↓
Internal API Routes (/api/*)
  ↓
better-sqlite3 Client
  ↓
SQLite Database (data/odd_lots_episodes.db)
```

All data flows through internal API routes. No external services involved.

---

*Integration audit: 2026-02-01*
