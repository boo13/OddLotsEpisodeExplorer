# Architecture

**Analysis Date:** 2026-02-01

## Pattern Overview

**Overall:** Client-Server with Server-Side Data Layer

**Key Characteristics:**
- Next.js 16 App Router with server-side API routes for data access
- Client-side React component state management for UI interactions
- SQLite database with ready-only access for podcast episode data
- Stateless API routes that delegate to query layer
- Keyword-based search and filtering system with pre-defined categories and formats

## Layers

**Presentation Layer:**
- Purpose: Render interactive UI components and manage client-side state
- Location: `src/app/page.tsx`, `src/components/`
- Contains: Page components, UI components, client state management
- Depends on: API routes (via fetch), type definitions
- Used by: Browser client

**API Layer:**
- Purpose: HTTP endpoints that handle requests and return JSON responses
- Location: `src/app/api/*/route.ts`
- Contains: Route handlers for 8 API endpoints (episodes, search, category, format, guest, company, stats, format-counts)
- Depends on: Query layer, categories/formats configuration
- Used by: Client components via fetch calls

**Query Layer:**
- Purpose: Database access abstraction with pre-built SQL queries
- Location: `src/lib/queries.ts`
- Contains: 18+ exported query functions, interfaces for query results
- Depends on: Database singleton, type definitions
- Used by: API routes

**Data Access Layer:**
- Purpose: SQLite connection management
- Location: `src/lib/db.ts`
- Contains: Database singleton initialization with read-only mode
- Depends on: better-sqlite3 package
- Used by: Query layer

**Configuration Layer:**
- Purpose: Define categories, formats, and color schemes
- Location: `src/lib/categories.ts`
- Contains: CATEGORIES array (15 topics), FORMATS array (4 formats), gradient color function
- Depends on: None (static data)
- Used by: Query layer (for keyword matching), API routes, client components (for coloring)

**Type Definitions:**
- Purpose: TypeScript interfaces for data structures
- Location: `src/types/episode.ts`
- Contains: Episode interface, EpisodeWithHighlight interface
- Depends on: None
- Used by: All layers

## Data Flow

**Initial Page Load:**

1. Browser loads `src/app/page.tsx`
2. Component mounts, initiates two parallel fetch calls:
   - GET `/api/episodes` → Query all episodes via `getAllEpisodes()`
   - GET `/api/format-counts` → Calculate episode counts per format via `getFormatCounts()`
3. Results populate React state (`episodes`, `formatCounts`)
4. Grid renders with all episodes

**Search Flow:**

1. User types in SearchBar (`src/components/SearchBar.tsx`)
2. Component calls `handleSearch()` callback
3. Fetch GET `/api/search?q=[query]`
4. API route calls `searchEpisodes(query)` from query layer
5. Query layer tries FTS5 search first, falls back to LIKE pattern if FTS fails
6. Results returned to client
7. Client applies gradient colors via `getGradientColor()` and highlights matching episodes

**Category/Format Selection Flow:**

1. User clicks category/format pill
2. Component calls `handleCategorySelect()` or `handleFormatSelect()`
3. Fetch GET `/api/category?name=[name]` or `/api/format?name=[name]`
4. API validates category/format exists in CATEGORIES/FORMATS config
5. Calls `searchByCategory(keywords)` or `searchByFormat(keywords, matchField)`
6. Results filtered by keyword matching against title/description fields
7. Client applies gradient highlighting to matches

**Guest/Company Selection Flow:**

1. StatsPanel loads top guests/companies via GET `/api/stats`
2. User clicks guest/company name
3. Calls `handleGuestSelect()` or `handleCompanySelect()`
4. Fetch GET `/api/guest?name=[name]` or `/api/company?name=[name]`
5. Queries episodes where guest_clean/guest or guest_company_clean/guest_company matches exactly
6. Client highlights results

**State Management:**

- Client-side state drives UI: `episodes`, `activeCategory`, `activeFormat`, `activeGuest`, `activeCompany`, `searchQuery`, `highlightedIds`, `selectedEpisode`
- Only one filter active at a time (category, format, guest, company, or search)
- `highlightedIds` Map stores gradient color for each matched episode
- `excludedFormats` Set tracks which formats to exclude from result percentage calculations
- Server state: Read-only SQLite database, cached on first connection

## Key Abstractions

**Episode Data:**
- Purpose: Represents a podcast episode with metadata
- Examples: `src/types/episode.ts`, returned from all query functions
- Pattern: Plain TypeScript interface with optional fields for nullable DB columns

**Search Query Functions:**
- Purpose: Encapsulate SQL query logic for different search types
- Examples: `getAllEpisodes()`, `searchEpisodes()`, `searchByCategory()`, `searchByGuest()`
- Pattern: Each query function constructs parameterized SQL with COALESCE fallbacks for null fields

**Category/Format Configuration:**
- Purpose: Define searchable topics and podcast formats as keyword-based filters
- Examples: `CATEGORIES` array with 15 entries, `FORMATS` array with 4 entries
- Pattern: Each entry has name, keywords array, color hex, and (for format) matchField strategy

**Gradient Coloring:**
- Purpose: Assign visual colors to search results based on position
- Examples: `getGradientColor(index, total)` blends through 7 color stops
- Pattern: Interpolates between violet→purple→cyan based on result position

## Entry Points

**Web Application:**
- Location: `src/app/page.tsx`
- Triggers: Browser navigation to `/`
- Responsibilities: Manage all application state, orchestrate component layout, handle all filter callbacks

**API Endpoints:**
- `/api/episodes` - Fetch all episodes
- `/api/search` - Full-text search with fallback to LIKE pattern
- `/api/category` - Search by category keywords
- `/api/format` - Search by format keywords
- `/api/guest` - Exact match by guest name
- `/api/company` - Exact match by company name
- `/api/stats` - Aggregated statistics (top guests, companies, timeline, distribution)
- `/api/format-counts` - Episode counts per format (for exclusion feature)

## Error Handling

**Strategy:** Try-catch blocks at API layer, console logging, generic error responses to client

**Patterns:**

- API routes wrap query execution in try-catch
- Failed queries return NextResponse.json({ error: 'message' }, { status: 500 })
- Client-side fetch calls log errors to console but don't break UI
- FTS5 search has graceful fallback to LIKE pattern if syntax error occurs

**Example (src/app/api/search/route.ts):**
```typescript
try {
  const episodes = searchEpisodes(query);
  return NextResponse.json(episodes);
} catch (error) {
  console.error('Error searching episodes:', error);
  return NextResponse.json({ error: 'Failed to search episodes' }, { status: 500 });
}
```

## Cross-Cutting Concerns

**Logging:** Console.error() for failures only, no structured logging

**Validation:**
- API routes validate required query parameters before querying
- Category/format endpoints validate name against known CATEGORIES/FORMATS
- No request body validation (all queries are GET with query params)

**Authentication:** None - read-only application, no user accounts

**Database Access:**
- Singleton pattern: `getDb()` returns cached connection
- Read-only mode: `new Database(dbPath, { readonly: true })`
- Connection reused across all query functions

**COALESCE Fallbacks:**
- Guest: `COALESCE(guest_clean, guest)` handles data quality issues
- Title: `COALESCE(guest_title_clean, guest_title)`
- Company: `COALESCE(guest_company_clean, guest_company)`
- Link: `COALESCE(omny_url, apple_podcasts_url)`

---

*Architecture analysis: 2026-02-01*
