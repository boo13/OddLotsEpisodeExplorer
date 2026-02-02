# Coding Conventions

**Analysis Date:** 2026-02-01

## Naming Patterns

**Files:**
- React components: PascalCase with .tsx extension (e.g., `SearchBar.tsx`, `EpisodeGrid.tsx`, `StatsPanel.tsx`)
- API routes: lowercase route handlers in `src/app/api/[endpoint]/route.ts` (e.g., `src/app/api/search/route.ts`, `src/app/api/stats/route.ts`)
- Library/utility files: camelCase with .ts extension (e.g., `queries.ts`, `categories.ts`, `utils.ts`, `db.ts`)
- UI components: PascalCase, organized in `src/components/ui/` subdirectory (e.g., `src/components/ui/button.tsx`, `src/components/ui/tooltip.tsx`)
- Type files: camelCase or descriptive names in `src/types/` (e.g., `episode.ts`)

**Functions:**
- camelCase for regular functions (e.g., `getAllEpisodes()`, `searchEpisodes()`, `getGradientColor()`)
- camelCase for React hooks and event handlers (e.g., `handleSearch()`, `handleSelectEpisode()`, `useRef()`)
- camelCase for internal utility functions (e.g., `stripHtml()`, `truncate()`, `formatDate()`)
- camelCase for exported helper functions (e.g., `getStatsSummary()`, `getMonthlyTimeline()`)

**Variables:**
- camelCase for state variables (e.g., `query`, `isFocused`, `selectedEpisode`, `highlightedIds`, `excludedFormats`)
- camelCase for props and parameters (e.g., `onSearch`, `onSelectEpisode`, `activeCategory`)
- UPPER_SNAKE_CASE for constants (e.g., `GUEST_COALESCE`, `TITLE_COALESCE`, `COMPANY_COALESCE`, `FORMATS`, `CATEGORIES`)
- Prefixed with `is`, `has`, `can` for boolean values (e.g., `isExpanded`, `isSelected`, `isHighlighted`, `isFocused`, `hasResults`)

**Types:**
- PascalCase for interface names (e.g., `Episode`, `EpisodeWithHighlight`, `SearchBarProps`, `StatsSummary`, `MonthlyData`)
- `Props` suffix for component prop interfaces (e.g., `SearchBarProps`, `EpisodeGridProps`, `EpisodeRectProps`, `StatsPanelProps`)
- PascalCase for exported interfaces in shared types file (e.g., `src/types/episode.ts`: `Episode`, `EpisodeWithHighlight`)

## Code Style

**Formatting:**
- No Prettier or ESLint config file found; relies on ESLint config only
- Single quotes for string literals (e.g., `'use client'`, `'Loading episodes...'`)
- Explicit semicolons at end of statements
- Two-space indentation (inferred from codebase)
- Multi-line strings use template literals with backticks

**Linting:**
- ESLint with Next.js configuration: `eslint-config-next` (v16.1.6)
- Config: `src/app/eslint.config.mjs` uses:
  - Next.js core web vitals rules (`nextVitals`)
  - TypeScript rules (`nextTs`)
  - Explicit global ignores for `.next/`, `out/`, `build/`, `next-env.d.ts`
- Lint command: `npm run lint` (runs `eslint` with defaults)

**Type System:**
- Strict TypeScript enabled in `tsconfig.json` (`"strict": true`)
- Type imports with `import type` for interfaces and type-only imports (e.g., `import type { Episode, EpisodeWithHighlight } from '@/types/episode'`)
- Regular imports for components and functions
- Target ES2017, lib: dom, dom.iterable, esnext

## Import Organization

**Order:**
1. React/Framework imports (e.g., `import React`, `import { useState }`)
2. Next.js imports (e.g., `import { NextResponse }`, `import type { Metadata }`)
3. Relative component/lib imports from `@/` alias (e.g., `import { SearchBar } from '@/components/SearchBar'`)
4. Type imports from `@/` alias (e.g., `import type { Episode } from '@/types/episode'`)

**Path Aliases:**
- `@/*` maps to `./src/*` (configured in `tsconfig.json`)
- Use `@/components/` for component imports
- Use `@/lib/` for utility and query functions
- Use `@/types/` for type definitions
- Example: `import { SearchBar } from '@/components/SearchBar'`

## Error Handling

**Patterns:**
- Try-catch blocks in API routes (e.g., `src/app/api/search/route.ts`)
- console.error() for logging errors with descriptive messages (e.g., `console.error('Error searching episodes:', error)`)
- Return NextResponse with 500 status on error (e.g., `NextResponse.json({ error: 'Failed to search episodes' }, { status: 500 })`)
- Early returns for validation errors with 400 status (e.g., check if query param is required before processing)
- Try-catch with fallback search strategy (e.g., `src/lib/queries.ts` falls back from FTS5 to LIKE search on error)
- Client-side fetch error handling with .catch() in useEffect hooks
- Conditional rendering for error states (checking for null/undefined values)

## Logging

**Framework:** Native console object

**Patterns:**
- `console.error()` for error logging with context (e.g., `console.error('Failed to load episodes:', err)`)
- No INFO or DEBUG logging observed; error logging only
- Errors logged in API routes and client-side fetch handlers
- Simple message + error object pattern (e.g., `console.error('Search failed:', err)`)

## Comments

**When to Comment:**
- Inline comments for SQL COALESCE patterns clarifying field selection (e.g., lines 4-14 in `src/lib/queries.ts`)
- Section comments to organize query groups (e.g., `// ============================================` / `// STATS QUERIES` in `src/lib/queries.ts`)
- Component-level comments for complex layout structure (e.g., `{/* Header */}` in main page)
- SQL structure comments before complex queries (e.g., `// FTS5 search` before FTS implementation)

**JSDoc/TSDoc:**
- Not used in this codebase; relies on TypeScript interface definitions and type annotations instead

## Function Design

**Size:** Medium to large; functions range from 10-100 lines
- Simple utilities: 5-10 lines (e.g., `stripHtml()`, `truncate()`)
- Query functions: 15-30 lines with SQL statements
- Component render logic: 50-100+ lines with complex conditional rendering
- Event handlers: 10-30 lines (e.g., `handleSearch()`, `handleCategorySelect()`)

**Parameters:**
- Props passed as single object destructured in function signature (e.g., `function SearchBar({ onSearch }: SearchBarProps)`)
- Optional parameters using TypeScript `?` syntax (e.g., `selectedEpisodeId?: number | null`)
- Callback functions passed as props with `on` prefix (e.g., `onSearch`, `onSelectEpisode`)
- Database query functions take minimal parameters: simple strings or arrays (e.g., `searchByCategory(keywords: string[])`)

**Return Values:**
- Components return JSX (tsx files)
- Utility functions return typed values (e.g., `Episode[]`, `StatsSummary`, `string`)
- API handlers return `NextResponse.json()` with typed objects
- Database queries return arrays of typed interfaces (e.g., `Episode[]`, `MonthlyData[]`)

## Module Design

**Exports:**
- Named exports for components: `export function SearchBar({ ... })`
- Named exports for utilities: `export function getGradientColor(...)`
- Default export for page components: `export default function Home()`
- No barrel files used (no index.ts re-exports)

**Barrel Files:**
- Not used in this codebase; imports directly reference specific files

## Client/Server Boundaries

**Client Components:**
- `'use client'` directive at top of interactive components (e.g., `src/app/page.tsx`, `src/components/SearchBar.tsx`, `src/components/StatsPanel.tsx`)
- All React hooks usage confined to client components
- Event handlers and interactivity defined in client components

**Server Components:**
- Layout files (`src/app/layout.tsx`) use metadata and font imports (server-side)
- API routes in `src/app/api/` are server functions
- Database queries in `src/lib/queries.ts` are called from server-side API routes and client components

## Props and Interface Patterns

**Component Props:**
- Defined as separate interfaces with `Props` suffix (e.g., `SearchBarProps`, `EpisodeGridProps`)
- Props interface lists all expected props with required/optional markers
- Optional props use `?` syntax (e.g., `onSelect?: (episode: EpisodeWithHighlight) => void`)
- Callbacks prefixed with `on` (e.g., `onSearch`, `onSelectEpisode`, `onHover`)

**Data Interfaces:**
- Shared in `src/types/` for models used across components/API (e.g., `src/types/episode.ts`)
- Query result interfaces defined in `src/lib/queries.ts` near query functions (e.g., `StatsSummary`, `MonthlyData`, `GuestCount`)
- UI-specific data interfaces defined in component files (e.g., `FormatCount` in `src/app/page.tsx`, `StatsData` in `src/components/StatsPanel.tsx`)

## Async Patterns

**Client-side:**
- useEffect hooks with async fetch patterns (fetch → .then() → .catch())
- AbortController pattern with `cancelled` flag to prevent state updates after unmount (e.g., `src/components/StatsPanel.tsx` lines 530-551)
- useCallback for debounced/memoized functions (e.g., `handleSearch()` in main page)

**Server-side:**
- API routes defined as `async function GET()`
- Direct function calls (no async patterns in query layer)
- Try-catch wrapping entire handler logic

---

*Convention analysis: 2026-02-01*
