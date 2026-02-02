# Testing Patterns

**Analysis Date:** 2026-02-01

## Test Framework

**Runner:**
- Not configured; no test runner detected in `package.json` or `tsconfig.json`
- No test dependencies (Jest, Vitest, etc.) in dependencies or devDependencies

**Assertion Library:**
- Not applicable; no testing framework configured

**Run Commands:**
```bash
npm run lint              # Run ESLint (only linting, no testing)
npm run dev              # Development server
npm run build            # Production build
npm run start            # Start production server
```

## Test File Organization

**Status:**
- No test files found in `src/` directory
- No `*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx` files in project source
- Codebase has zero test coverage

**Testing Infrastructure:**
- No Jest, Vitest, or other test runner configuration files
- No test utilities or mock libraries installed
- ESLint is the only code quality tool in place

## Manual Testing Approach

**Current State:**
Based on codebase structure, testing is manual via:
1. Development server (`npm run dev`) with browser testing
2. ESLint static analysis (`npm run lint`)
3. TypeScript type checking during build

**Areas Without Tests:**

**API Routes (Critical Path):**
- `src/app/api/episodes/route.ts` - Fetch all episodes, error handling
- `src/app/api/search/route.ts` - Query parameter validation, FTS search fallback
- `src/app/api/category/route.ts` - Category-based filtering
- `src/app/api/format/route.ts` - Format-based filtering with matchField logic
- `src/app/api/guest/route.ts` - Guest name lookup
- `src/app/api/company/route.ts` - Company name lookup
- `src/app/api/stats/route.ts` - All statistics aggregation
- `src/app/api/format-counts/route.ts` - Format counting for exclude feature

**Query Functions (Database Layer):**
- `src/lib/queries.ts` - All database queries lack unit tests:
  - `getAllEpisodes()` - Basic query execution
  - `searchEpisodes()` - FTS5 and fallback LIKE search
  - `searchByFormat()` - Complex keyword/field matching
  - `searchByCategory()` - Multi-field keyword matching
  - `searchByGuest()` - Exact match search
  - `searchByCompany()` - Exact match search
  - `getStatsSummary()` - Data aggregation
  - `getMonthlyTimeline()` - Time-series data
  - `getTopGuests()` - Ranking with filters
  - `getTopCompanies()` - Ranking with filters
  - `getYearlyStats()` - Time grouping
  - `getTopTitles()` - Ranking with string length filters
  - `getDurationDistribution()` - Bucketing logic
  - `getLongestEpisodes()` - Sorting and limiting
  - `getFormatCounts()` - Iteration over formats with complex conditions

**Client Components:**
- `src/app/page.tsx` - Main dashboard with 35+ state variables, event handlers, calculations
  - Episode loading and highlighting logic
  - Category/format/guest/company selection handlers
  - Search debouncing and highlighting
  - Exclude mode calculations
  - Format count aggregation
- `src/components/SearchBar.tsx` - Debounced search input
- `src/components/EpisodeGrid.tsx` - Responsive grid layout calculation, resize observer logic
- `src/components/EpisodeRect.tsx` - Cell rendering, hover effects, tooltip content
- `src/components/StatsPanel.tsx` - Lazy data loading, chart rendering, pagination
- `src/components/CategoryPills.tsx` - Category selection (no tests found)
- `src/components/FormatPills.tsx` - Format selection with exclude mode (no tests found)
- `src/components/EpisodeDrawer.tsx` - Episode detail display (no tests found)

**Utility Functions:**
- `src/lib/categories.ts`:
  - `getGradientColor()` - Color interpolation algorithm (lines 120-148)
  - Category and format constant definitions
- `src/lib/utils.ts`:
  - `cn()` - clsx + tailwind-merge utility
- `src/lib/db.ts` - Database initialization (no tests)

## Testing Recommendations

**High Priority (Critical Path):**

1. **Query Functions** - Test database layer
   - Unit tests for each query function
   - Mock database responses
   - Test edge cases: empty results, NULL fields, malformed data
   - Test SQL injection protection with parameterized queries
   - Test COALESCE logic with null values

2. **API Routes** - Integration tests
   - Test parameter validation (required params, type checking)
   - Test error handling and response status codes
   - Test FTS5 fallback to LIKE search
   - Test aggregation logic in stats routes

3. **Search Logic** - Unit tests
   - Test debounce behavior in `SearchBar.tsx`
   - Test FTS5 query syntax and fallback handling
   - Test keyword matching for category/format filtering

**Medium Priority:**

1. **Component Logic** - Snapshot/integration tests
   - Grid layout calculation (`EpisodeGrid.tsx` lines 29-71)
   - Episode highlighting logic (`src/app/page.tsx` lines 62-69)
   - Stats data transformation for charts
   - Pagination logic in `StatsPanel.tsx`

2. **Utility Functions** - Unit tests
   - Color interpolation algorithm (`getGradientColor()`)
   - String utilities (`stripHtml()`, `truncate()`)
   - Date formatting (`formatDate()`)

**Low Priority:**

1. UI rendering and interaction tests
2. Accessibility testing
3. Visual regression testing

## Test Infrastructure Setup

**Recommended Stack:**
- **Runner:** Vitest (compatible with Vite/Next.js, faster than Jest)
- **Component Testing:** React Testing Library (for component logic without enzyme/Enzyme)
- **Database Testing:** Mock database or test database instance
- **E2E:** Playwright (`.playwright-mcp/` directory exists, suggesting setup started)

**Configuration Files Needed:**
- `vitest.config.ts` - Test runner configuration
- `src/__tests__/` or co-located `*.test.ts` files - Test files
- `src/lib/__mocks__/` - Mocked dependencies
- Setup test database or fixtures

**Missing Dependencies:**
```json
{
  "devDependencies": {
    "vitest": "^1.0.0",
    "@vitest/ui": "^1.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0"
  }
}
```

## Known Testing Gaps

**Database Testing:**
- No way to verify queries execute correctly without manual testing
- No test data fixtures or seeds
- No validation of NULL handling in COALESCE expressions
- No tests for LIKE search fallback when FTS5 fails

**Error Scenarios:**
- API error responses untested (caught by try-catch)
- Database connection failures not tested
- Network timeout handling in client (fetch with no retry logic)
- Invalid search query syntax not tested

**State Management:**
- Complex state logic in `src/app/page.tsx` (35+ state variables) not validated
- No tests for state consistency during filters
- No tests for race conditions in multiple concurrent searches
- Exclude mode calculations (`excludedEpisodeIds`, `adjustedTotal`) untested

**Edge Cases:**
- Empty dataset handling (1,133 episodes → what if zero?)
- Very large result sets (search matches 1000+ episodes)
- Special characters in search queries
- Unicode/emoji handling in titles and descriptions
- Null/undefined values in optional fields

## Existing Static Analysis

**ESLint:**
- Configured via `eslint.config.mjs`
- Uses `eslint-config-next` (core web vitals + TypeScript)
- Run with: `npm run lint`
- Catches:
  - Unused variables
  - Type errors (through TypeScript integration)
  - Next.js best practices
  - Does NOT catch business logic errors or integration issues

**TypeScript:**
- `tsconfig.json` with `"strict": true`
- Catches type mismatches at compile time
- Does NOT validate runtime behavior

---

*Testing analysis: 2026-02-01*
