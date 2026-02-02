# Technology Stack

**Analysis Date:** 2026-02-01

## Languages

**Primary:**
- TypeScript 5 - Main language for all backend and frontend code
- JavaScript (JSX/TSX) - React component syntax via TypeScript

**Secondary:**
- CSS - Styling via Tailwind CSS (processed through PostCSS)
- SQL - SQLite database queries via better-sqlite3

## Runtime

**Environment:**
- Node.js - Required for Next.js framework (no specific version constraint in package.json)

**Package Manager:**
- npm - Dependency management with lockfile present (`package-lock.json`)

## Frameworks

**Core:**
- Next.js 16.1.6 - Full-stack React framework with App Router
  - Production runtime: `npm start` (requires `npm run build` first)
  - Development: `npm run dev` (dev server on default port)

**Frontend Library:**
- React 19.2.3 - UI component library with Server and Client components
- React DOM 19.2.3 - React rendering for web

**UI Component Library:**
- Radix UI - Headless component primitives used for:
  - `@radix-ui/react-tooltip` (v1.2.8) - Tooltip positioning and behavior
  - `@radix-ui/react-slot` (v1.2.4) - Component composition utility

**Styling:**
- Tailwind CSS 4 - Utility-first CSS framework
  - PostCSS integration: `@tailwindcss/postcss` (v4)
  - Processed via PostCSS with `tailwindcss` plugin
  - Config: `src/app/globals.css`
  - Variable prefix: CSS custom properties for colors/spacing

**Icon Library:**
- Lucide React 0.563.0 - React icon components (SVG-based)

**Utility Libraries:**
- class-variance-authority 0.7.1 - Type-safe CSS class composition
- clsx 2.1.1 - Conditional className builder
- tailwind-merge 3.4.0 - Merge Tailwind classes intelligently (overrides)

## Key Dependencies

**Critical:**
- better-sqlite3 12.6.2 - Server-side SQLite client (primary data source)
  - TypeScript types: `@types/better-sqlite3` (v7.6.13)
  - Database: Read-only connection to `data/odd_lots_episodes.db`
  - Used for FTS5 (full-text search), LIKE queries, aggregations

**Fonts:**
- next/font/google - Integrated Google Fonts loading:
  - Outfit font family (weights 300-800)
  - JetBrains Mono monospace (weights 300-700)

## Configuration

**Environment:**
- No .env file required - database path is relative to cwd
- Database path: `path.join(process.cwd(), 'data', 'odd_lots_episodes.db')`
- No external API keys or service credentials needed

**Build:**
- `tsconfig.json` - TypeScript compilation with:
  - Target: ES2017
  - JSX: react-jsx
  - Module resolution: bundler (Next.js standard)
  - Path aliases: `@/*` → `./src/*`
  - Strict mode enabled
- `eslint.config.mjs` - ESLint v9 with:
  - Next.js core web vitals config
  - Next.js TypeScript config
- `postcss.config.mjs` - PostCSS with Tailwind CSS v4 plugin
- `next.config.ts` - Minimal config (defaults only)
- `components.json` - shadcn/ui configuration:
  - Style: new-york
  - Base color: neutral
  - Icon library: lucide
  - Component path aliases defined

**Component Framework:**
- shadcn/ui - Pre-built Radix UI components (installed via components.json)
  - Location: `src/components/ui/`
  - Includes: button, input, tooltip, badge (custom implementations)

## Platform Requirements

**Development:**
- Node.js (no version specified in package.json)
- npm (any recent version)
- SQLite database file at `data/odd_lots_episodes.db` (relative to project)
- 333 node_modules dependencies installed

**Production:**
- Node.js with Next.js 16+ support
- Same database file location requirement
- Compiled Next.js build artifact (`.next/` directory)

## Scripts

**Development:**
```bash
npm run dev      # Start Next.js dev server with hot reload
npm run lint     # Run ESLint checks
```

**Production:**
```bash
npm run build    # Build Next.js application to .next/
npm start        # Start production server (requires build first)
```

---

*Stack analysis: 2026-02-01*
