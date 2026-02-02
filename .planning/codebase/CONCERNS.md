# Codebase Concerns

**Analysis Date:** 2026-02-01

## Tech Debt

**Database Connection Pooling:**
- Issue: Singleton pattern without proper resource cleanup; database connection is never closed
- Files: `src/lib/db.ts`
- Impact: Potential file descriptor exhaustion in long-running processes; memory leaks on hot module reloads
- Fix approach: Implement proper connection lifecycle management with initialization/cleanup hooks; consider reusing existing connection pattern but add explicit close() on application shutdown

**Repetitive Query Constants:**
- Issue: COALESCE expressions duplicated with/without table prefixes (GUEST_COALESCE vs GUEST_COALESCE_E) causing maintenance burden
- Files: `src/lib/queries.ts` (lines 5-14)
- Impact: Any change to coalesce logic requires updates in multiple places; error-prone
- Fix approach: Create helper function that builds coalesce expressions with optional table prefix parameter

**Magic String Filtering in Stats:**
- Issue: Hardcoded exclusion patterns ('N/A', 'Lots More', 'unknown') scattered across multiple query functions
- Files: `src/lib/queries.ts` (lines 233-234, 253-256, 369)
- Impact: Inconsistent filtering between queries; difficult to maintain centralized rules
- Fix approach: Create a constants file with standardized filter rules; export and reuse across all queries

**SVG Chart Rendering in Component:**
- Issue: Complex chart calculations (axis scaling, positioning, gradients) embedded directly in component render methods
- Files: `src/components/StatsPanel.tsx` (AreaChart, LineChart, VerticalBarChart, DurationChart functions, lines 76-326)
- Impact: Component is 676 lines; difficult to test, reuse, or modify chart logic independently
- Fix approach: Extract each chart type into separate, composable chart components; move calculations to pure utility functions

## Known Bugs

**FTS Search Fallback Bug:**
- Symptoms: When FTS5 query fails, fallback LIKE search executes but still has syntax error
- Files: `src/lib/queries.ts` (lines 56-78)
- Trigger: Malformed FTS query syntax or database without FTS5 extension
- Workaround: Search functionality partially broken on invalid FTS queries; returns LIKE results or empty set
- Note: Line 66 has indentation issue that could indicate copy-paste error

**Race Condition in Stats Panel:**
- Symptoms: Multiple identical stats API requests fired if component re-renders while loading
- Files: `src/components/StatsPanel.tsx` (lines 527-551)
- Trigger: Component receives isExpanded=true multiple times before first fetch completes
- Workaround: Relies on explicit comment to disable exhaustive-deps lint rule, masking the real issue
- Fix approach: Use AbortController to cancel in-flight requests on unmount or re-expansion

**HTML Stripping Vulnerability:**
- Symptoms: Regex-based HTML removal in episode descriptions could leave dangerous content
- Files: `src/components/EpisodeDrawer.tsx` (lines 10-26)
- Trigger: Description containing malicious HTML entities or JavaScript
- Current mitigation: Basic regex patterns, but not comprehensive sanitization
- Recommendations: Use DOMPurify or similar library for robust HTML sanitization

## Security Considerations

**SQL Injection via LIKE Parameters:**
- Risk: While parameterized queries are used, LIKE patterns with user input could enable injection
- Files: `src/lib/queries.ts` (lines 75-76, 139-142, 462-465)
- Current mitigation: Using parameterized query bindings (?)
- Recommendations: Add input validation to reject special LIKE characters (%, _) or escape them; implement allowlist for category/format keywords

**No Input Validation on API Routes:**
- Risk: Query parameters not validated before database execution
- Files: `src/app/api/search/route.ts`, `src/app/api/category/route.ts`, `src/app/api/guest/route.ts`, `src/app/api/company/route.ts`
- Current mitigation: Basic null checks only
- Recommendations: Add schema validation (Zod) on all API endpoints; validate parameter length and format

**External Link without Rel Attributes:**
- Risk: Episode drawer creates links to Google search with only basic rel="noopener noreferrer"
- Files: `src/components/EpisodeDrawer.tsx` (lines 82-92, 122-129)
- Current mitigation: Rel attributes present for popup prevention
- Recommendations: Add rel="noreferrer noopener" to all external links; consider sanitizing guest/company names before URL encoding

**Unsafe HTML in Drawer:**
- Risk: Description text parsed with regex but rendered directly as text (safer) but guest HTML entities still processed
- Files: `src/components/EpisodeDrawer.tsx` (lines 59)
- Current mitigation: Using textContent-safe rendering
- Recommendations: Implement proper HTML entity decoding with allowlist approach

## Performance Bottlenecks

**All Episodes Loaded on Mount:**
- Problem: Entire 1,133 episode dataset fetched immediately on page load
- Files: `src/app/page.tsx` (lines 38-49)
- Cause: No pagination, filtering, or virtual scrolling
- Impact: Large initial bundle; blocks rendering; poor performance on slow connections
- Improvement path: Implement pagination; lazy load data as needed; use virtualized grid for rendering

**Full Dataset Search on Every Query:**
- Problem: Search operations scan all episodes sequentially with no indexing optimization
- Files: `src/lib/queries.ts` (lines 35-78, 115-145)
- Cause: SQLite FTS5 used but fallback LIKE scan is full-table
- Impact: Search latency increases linearly with dataset size
- Improvement path: Ensure FTS5 is always available; add query result caching; implement debounced search

**Redundant API Calls for Format Counts:**
- Problem: Format counts fetched on mount even if user never expands format pills
- Files: `src/app/page.tsx` (lines 52-59)
- Cause: No lazy loading of secondary features
- Impact: Wasted bandwidth and processing for ~40+ format queries
- Improvement path: Defer format counts fetch until FormatPills component expands

**Stats API Recalculates All Aggregations:**
- Problem: Stats endpoint runs expensive aggregations (top guests, yearly stats, distribution) on every request
- Files: `src/app/api/stats/route.ts`, `src/lib/queries.ts` (lines 222-429)
- Cause: No caching, pre-computation, or materialized views
- Impact: First stats panel expansion slow; mobile users experience lag
- Improvement path: Cache stats in memory with invalidation strategy; consider pre-computing on build

**Gradient Color Assignment O(n):**
- Problem: For each search result, index used to assign gradient colors
- Files: `src/app/page.tsx` (lines 62-68)
- Cause: Function called inside Map in component rendering
- Impact: Recalculates for every query; unnecessary allocations
- Improvement path: Memoize color assignments; use consistent hashing instead of array index

## Fragile Areas

**EpisodeGrid Component:**
- Files: `src/components/EpisodeGrid.tsx` (122 lines)
- Why fragile: Complex SVG generation with hardcoded positioning; dynamic column calculation could break with layout changes; no tests
- Safe modification: Keep grid sizing logic separate from rendering; add unit tests for column calculation
- Test coverage: Zero tests; no coverage for column count logic or hover state

**StatsPanel Component:**
- Files: `src/components/StatsPanel.tsx` (676 lines)
- Why fragile: Monolithic component with inline chart calculations, no separation of concerns; mutating state in useEffect with eslint-disable comments
- Safe modification: Break into smaller chart components first; add data transformation layer
- Test coverage: No tests; 8+ internal helper components untested; chart math not validated

**Query String Building in queries.ts:**
- Files: `src/lib/queries.ts` (lines 87-113, 119-145, 451-465)
- Why fragile: Dynamic SQL construction with string interpolation; conditions array joined with OR makes logic hard to follow
- Safe modification: Add helper function to build WHERE conditions; test all clause combinations
- Test coverage: No tests for different keyword combinations; edge cases untested

**Page Component State Management:**
- Files: `src/app/page.tsx` (419 lines)
- Why fragile: 11+ useState calls managing interdependent state (activeCategory, activeFormat, activeGuest, activeCompany, all cleared together)
- Safe modification: Consider state reducer pattern or context to manage filter state atomically
- Test coverage: No tests; filter clearing logic untested; edge cases like rapid filter changes untested

**HTML Stripping Regex:**
- Files: `src/components/EpisodeDrawer.tsx` (lines 10-26)
- Why fragile: Multiple regex replacements run sequentially; order matters; missing edge cases (nested HTML, entities)
- Safe modification: Use proper HTML parser instead; test against real episode descriptions
- Test coverage: No tests; various boilerplate patterns hardcoded

## Scaling Limits

**Database Query N+1 Pattern:**
- Current capacity: Works fine with 1,133 episodes
- Limit: Format counts fetched in loop calling database 20+ times (one per format)
- Scaling path: Batch queries or pre-compute; get all format counts in single pass (see lines 443-475 in queries.ts)

**SVG Chart DOM Nodes:**
- Current capacity: Charts render ~50-200 SVG elements each
- Limit: Multiple charts on same page could exceed browser efficient rendering limit
- Scaling path: Implement canvas-based charts or virtualization

**In-Memory Episode Filtering:**
- Current capacity: All 1,133 episodes in memory as JavaScript array
- Limit: Filtering/highlighting operations become slow at ~10k+ episodes
- Scaling path: Implement server-side filtering; pagination; lazy loading

**Regex-Based Search Fallback:**
- Current capacity: Works for 1,133 episodes
- Limit: LIKE pattern matching becomes slow at 100k+ rows
- Scaling path: Ensure FTS5 is always available; implement pagination for large result sets

## Dependencies at Risk

**better-sqlite3:**
- Risk: Requires native compilation; can cause installation failures on different OS/architecture combinations
- Impact: Build pipeline breaks; deployment requires build environment with C++ compiler
- Migration plan: Consider sql.js (pure JavaScript SQLite) for better portability, but with performance trade-off

**Next.js 16.1.6:**
- Risk: Rapid major version releases; breaking changes between versions
- Impact: Security updates in dependencies; eventual need for expensive major upgrades
- Migration plan: Lock patch versions; test carefully before upgrading minors

## Missing Critical Features

**No Testing Infrastructure:**
- Problem: Zero test files; no test runners configured (jest/vitest); no CI/CD pipeline
- Blocks: Cannot safely refactor StatsPanel (676 lines); cannot validate search logic changes
- Recommendation: Add Jest or Vitest; start with critical path (search, filters, stats API)

**No Error Boundary:**
- Problem: Any component error crashes entire page
- Blocks: Graceful degradation if stats API fails or chart rendering breaks
- Recommendation: Wrap major sections in React.ErrorBoundary

**No Accessibility (a11y):**
- Problem: ARIA labels missing on interactive components; no keyboard navigation for grid
- Blocks: Screen reader users cannot navigate; compliance issues
- Recommendation: Add ARIA labels to buttons; implement keyboard navigation for filters

**No Analytics or Monitoring:**
- Problem: No error tracking, performance monitoring, or usage analytics
- Blocks: Cannot detect issues in production; no metrics for optimization priorities
- Recommendation: Add Sentry for error tracking; implement basic performance metrics

**No Dark Mode Toggle:**
- Problem: Hardcoded dark theme; no way for users to switch
- Blocks: Users preferring light mode have degraded experience
- Recommendation: Add system preference detection and manual toggle using CSS variables

## Test Coverage Gaps

**Search Functionality Not Tested:**
- What's not tested: FTS5 vs LIKE fallback; empty query handling; special character handling; result highlighting
- Files: `src/lib/queries.ts` (searchEpisodes), `src/app/api/search/route.ts`
- Risk: Search behavior could regress; fallback LIKE search untested
- Priority: High

**Filter State Management Not Tested:**
- What's not tested: Multiple filter combinations; clearing filters; filter switching order; exclusion mode calculations
- Files: `src/app/page.tsx` (lines 77-184)
- Risk: Filter edge cases could create incorrect result sets (e.g., filter A applied, then B, then clear A)
- Priority: High

**Chart Rendering Not Tested:**
- What's not tested: Chart calculations with edge cases (zero data, single data point, extreme values); SVG generation
- Files: `src/components/StatsPanel.tsx` (AreaChart, LineChart, VerticalBarChart, DurationChart)
- Risk: Charts could render incorrectly or crash with certain data distributions
- Priority: Medium

**API Route Error Handling Not Tested:**
- What's not tested: Missing query parameters; database errors; malformed input; concurrent requests
- Files: All files in `src/app/api/`
- Risk: Errors could leak sensitive information or crash endpoint
- Priority: Medium

**Episode Drawer HTML Sanitization Not Tested:**
- What's not tested: Various HTML entities; edge cases in boilerplate removal; malicious HTML injection
- Files: `src/components/EpisodeDrawer.tsx` (stripHtml function)
- Risk: Unsafe HTML rendering or failed sanitization could leak data or corrupt display
- Priority: High

---

*Concerns audit: 2026-02-01*
