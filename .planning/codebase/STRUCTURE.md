# Codebase Structure

**Analysis Date:** 2026-02-01

## Directory Layout

```
dashboard/
├── src/
│   ├── app/
│   │   ├── page.tsx           # Main application page, state management
│   │   ├── layout.tsx         # Root layout with fonts and metadata
│   │   ├── globals.css        # Global Tailwind styles
│   │   └── api/               # Next.js API routes
│   │       ├── episodes/
│   │       ├── search/
│   │       ├── category/
│   │       ├── format/
│   │       ├── guest/
│   │       ├── company/
│   │       ├── stats/
│   │       └── format-counts/
│   ├── components/
│   │   ├── ui/                # Reusable UI primitives (Radix UI)
│   │   ├── StatsPanel.tsx     # Guest/company/stats display
│   │   ├── EpisodeGrid.tsx    # Responsive grid layout
│   │   ├── EpisodeRect.tsx    # Individual episode cell
│   │   ├── EpisodeDrawer.tsx  # Episode detail panel
│   │   ├── SearchBar.tsx      # Search input
│   │   ├── CategoryPills.tsx  # Category filter buttons
│   │   └── FormatPills.tsx    # Format filter buttons
│   ├── lib/
│   │   ├── db.ts             # SQLite singleton
│   │   ├── queries.ts        # SQL query functions
│   │   ├── categories.ts     # Categories, formats, colors
│   │   └── utils.ts          # Utility: cn() for classname merging
│   ├── types/
│   │   └── episode.ts        # Episode interface definitions
│   └── public/               # Static assets
├── node_modules/
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.js
└── postcss.config.js
```

## Directory Purposes

**`src/app/`:**
- Purpose: Next.js App Router pages and API routes
- Contains: Root page component, layout, styles, all API endpoints
- Key files: `page.tsx` (main UI), `layout.tsx` (fonts setup)

**`src/app/api/`:**
- Purpose: RESTful API endpoints
- Contains: 8 route.ts files, one per endpoint
- Key files: `episodes/route.ts`, `search/route.ts`, `stats/route.ts`

**`src/components/`:**
- Purpose: React components for UI
- Contains: 9 component files (7 feature components, 2 UI files)
- Key files: `StatsPanel.tsx` (21KB, largest), `EpisodeGrid.tsx` (responsive layout)

**`src/components/ui/`:**
- Purpose: Reusable UI primitives from shadcn/ui + Radix UI
- Contains: Badge, button, input, tooltip components
- Pattern: Tailwind-styled components with Radix UI base

**`src/lib/`:**
- Purpose: Business logic, data access, configuration
- Contains: Database connection, 18+ query functions, category/format definitions
- Key files: `queries.ts` (407 lines, all SQL queries), `categories.ts` (149 lines, data definitions)

**`src/types/`:**
- Purpose: TypeScript interfaces
- Contains: Episode-related types
- Key files: `episode.ts` (2 interfaces)

## Key File Locations

**Entry Points:**
- `src/app/page.tsx`: Main application page (420 lines, manages all state)
- `src/app/layout.tsx`: Root layout with Next.js metadata

**Configuration:**
- `tsconfig.json`: TypeScript config with `@/*` path alias
- `next.config.js`: Next.js app configuration
- `tailwind.config.js`: Tailwind CSS theme
- `postcss.config.js`: PostCSS with Tailwind plugin
- `package.json`: Dependencies (React 19, Next 16, better-sqlite3, Radix UI)

**Core Logic:**
- `src/lib/queries.ts`: All SQL queries (407 lines)
- `src/lib/db.ts`: Database singleton (13 lines)
- `src/lib/categories.ts`: Category/format definitions (149 lines)

**Testing:**
- Not found - no test files in codebase

## Naming Conventions

**Files:**
- Component files: PascalCase + .tsx extension (`EpisodeGrid.tsx`, `SearchBar.tsx`)
- Library/utility files: camelCase + .ts extension (`queries.ts`, `categories.ts`)
- API route files: Always named `route.ts` in directory
- Type definition files: PascalCase matching interface name (`episode.ts`)

**Directories:**
- Component folders: PascalCase (`EpisodeGrid`, `StatsPanel`)
- Feature folders: kebab-case (`src/app/api/category/`)
- Utility folders: camelCase (`lib`, `types`)

**Functions:**
- Query functions: camelCase, prefixed with query type (`getAllEpisodes`, `searchByCategory`)
- Component functions: PascalCase (React components are functions)
- Utility functions: camelCase (`getGradientColor`, `getDb`, `cn`)

**Variables:**
- State variables: camelCase (`episodes`, `highlightedIds`, `activeCategory`)
- Constants: UPPER_SNAKE_CASE (`CATEGORIES`, `FORMATS`, `GUEST_COALESCE`)

**Types:**
- Interfaces: PascalCase (`Episode`, `EpisodeWithHighlight`, `Category`, `Format`)
- Type aliases: PascalCase (none currently)

## Where to Add New Code

**New API Endpoint:**
1. Create directory: `src/app/api/[endpoint-name]/`
2. Create file: `route.ts` with GET/POST function
3. Import query functions from `src/lib/queries.ts`
4. Add validation and error handling pattern from existing routes
5. Return NextResponse.json() with data or error

**New Search/Filter Feature:**
1. Add query function to `src/lib/queries.ts`:
   - Follow parameterized SQL pattern
   - Include COALESCE fallbacks where applicable
   - Use `const db = getDb()` for connection
2. Create API route in `src/app/api/[feature]/route.ts`
3. Create client component in `src/components/[Feature].tsx` if UI needed
4. Add state handler in `src/app/page.tsx` (following pattern of `handleCategorySelect`, `handleSearch`)

**New Component:**
- Place in `src/components/` as PascalCase .tsx file
- Use 'use client' directive if component uses hooks
- Import types from `src/types/episode.ts`
- Import UI primitives from `src/components/ui/`
- Follow existing component patterns (props interface, memo for perf if needed)

**New Category/Format:**
- Edit `src/lib/categories.ts`
- Add entry to CATEGORIES or FORMATS array
- Include name, keywords array, color hex code
- Specify matchField for formats (title or title_or_description)

**Utilities:**
- Shared functions: `src/lib/utils.ts`
- Constants: `src/lib/categories.ts` or new file in `src/lib/`

**Tests:**
- Create `src/**/__tests__/` or `src/**/*.test.ts` (currently no test files)

## Special Directories

**`node_modules/`:**
- Purpose: Installed dependencies
- Generated: Yes (by npm/yarn)
- Committed: No (in .gitignore)

**`.next/`:**
- Purpose: Next.js build output and cache
- Generated: Yes (by next build/dev)
- Committed: No (in .gitignore)

**`public/`:**
- Purpose: Static assets (images, favicon, etc.)
- Generated: No
- Committed: Yes

**`.planning/`:**
- Purpose: GSD analysis documents (ARCHITECTURE.md, STRUCTURE.md, etc.)
- Generated: Yes (by GSD agents)
- Committed: Yes

## URL Structure

**Pages:**
- `/` - Main dashboard (served by `src/app/page.tsx`)

**API Routes:**
- `GET /api/episodes` - All episodes
- `GET /api/search?q=[query]` - Search episodes
- `GET /api/category?name=[name]` - Episodes by category
- `GET /api/format?name=[name]` - Episodes by format
- `GET /api/guest?name=[name]` - Episodes by guest
- `GET /api/company?name=[name]` - Episodes by company
- `GET /api/stats` - Aggregated statistics
- `GET /api/format-counts` - Format counts for exclusion

## Path Aliases

**Configured in tsconfig.json:**
- `@/*` → `./src/*`

**Usage Examples:**
- `import { Episode } from '@/types/episode'`
- `import { EpisodeGrid } from '@/components/EpisodeGrid'`
- `import { searchEpisodes } from '@/lib/queries'`

---

*Structure analysis: 2026-02-01*
