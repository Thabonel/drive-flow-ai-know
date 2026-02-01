# PRD — Comprehensive Performance Optimization

**Status:** Draft
**Created:** February 1, 2026
**Owner:** AI Agent

## 1. Context & Goals

### What Problem This Solves
AI Query Hub currently has a **Lighthouse Performance Score of 61/100**, which significantly impacts user experience, SEO rankings, and conversion rates. Core Web Vitals are severely degraded (5.8s across FCP/LCP/TTI), primarily due to **unused JavaScript bloat** (3.48s potential savings) and **unoptimized images** (4.98s total potential savings).

### Who It's For
- **Primary**: End users experiencing slow loading times, especially on mobile/slow connections
- **Secondary**: SEO performance and business metrics (bounce rate, conversion)
- **Tertiary**: Development team maintaining clean, optimized codebase

### Why Now
- Current 61/100 performance score hurts user acquisition and retention
- Bundle size has grown to 1MB+ with office libraries and animation frameworks loaded eagerly
- External images lack modern optimizations (WebP, lazy loading, proper sizing)
- Enterprise customers expect sub-3s loading times for professional applications

### In-Scope Goals
- ✅ Achieve **Lighthouse Performance Score 85-95** (24-34 point improvement)
- ✅ Reduce **First Contentful Paint (FCP)** from 5.8s to <2.5s (56% improvement)
- ✅ Reduce **Largest Contentful Paint (LCP)** from 5.8s to <3.0s (48% improvement)
- ✅ Reduce **Time to Interactive (TTI)** from 5.8s to <3.5s (40% improvement)
- ✅ Implement **code splitting** and **dynamic imports** for large libraries
- ✅ Optimize **images** with WebP format, lazy loading, and proper dimensions
- ✅ Maintain **100% functionality** with zero regressions

### Out-of-Scope / Non-Goals
- ❌ **No feature changes** - purely optimization focused
- ❌ **No accessibility degradation** - maintain 96/100 score minimum
- ❌ **No design changes** - preserve neumorphic UI and branding
- ❌ **No backend optimization** - focus on frontend performance only
- ❌ **No new dependencies** - use existing tools and patterns
- ❌ **No breaking changes** - all APIs and interfaces remain stable

## 2. Current State (Repo-informed)

### Existing Performance Infrastructure
- **Build Tool**: Vite with TypeScript and React
- **Bundle Size Limit**: 1000KB (too permissive)
- **Image Assets**: PNG icons, external Supabase images
- **Animation Framework**: Framer Motion (296KB) loaded eagerly
- **Office Libraries**: pptxgenjs, docx, @react-pdf/renderer (~500KB in main bundle)
- **Large Components**: ConversationChat (1,790 lines), TimelineManager (1,296 lines)

### Identified Performance Bottlenecks
1. **DocumentFlowHero** component in `src/pages/Landing.tsx` loads framer-motion eagerly
2. **Office export libraries** bundled in main JavaScript instead of dynamic imports
3. **External image** at `https://fskwutnoxbbflzqrphro.supabase.co/storage/v1/object/public/assets/wheels.jpg`
   - No lazy loading, dimensions, or modern formats
4. **Large components** not optimally code-split
5. **Missing resource hints** for external domains

### Where Changes Will Land
- **`src/pages/Landing.tsx`** - Hero lazy loading, image optimization
- **`index.html`** - Resource hints and preconnect links
- **`vite.config.ts`** - Bundle size limits and chunk splitting
- **`src/components/hero/`** - New lazy wrapper components
- **`src/pages/PitchDeck.tsx`** - Dynamic office library imports
- **`src/components/DocumentVisualizationPanel.tsx`** - Lazy chart components
- **`public/`** - WebP icon conversion
- **Large components** - Split into smaller, focused modules

### Risks / Unknowns / Assumptions
- **ASSUMPTION**: Office export features used by <20% of users (can be lazy loaded)
- **RISK**: Dynamic imports may introduce loading delays for power users
- **ASSUMPTION**: External Supabase images can be optimized with minimal coordination
- **UNKNOWN**: Real-world performance impact vs. Lighthouse lab conditions
- **RISK**: Component splitting may affect existing state management

## 3. User Stories

**US1**: As a **first-time visitor**, I want the landing page to load quickly (<3s) so I can evaluate the product without abandoning due to slow performance.

**US2**: As a **mobile user on 3G**, I want essential features available within 5 seconds so I can use the app effectively on slower connections.

**US3**: As a **power user**, I want office export features to load on-demand so daily usage isn't slowed by features I rarely use.

**US4**: As a **developer**, I want build times and bundle analysis to clearly show performance improvements so I can maintain optimization gains.

**US5**: As an **enterprise customer**, I want professional loading times (<2.5s FCP) so the app feels enterprise-grade and reliable.

## 4. Success Criteria (Verifiable)

### Performance Metrics
- [ ] **Lighthouse Performance Score: 85+** (target 90+, current 61)
- [ ] **First Contentful Paint (FCP): <2.5s** (current 5.8s)
- [ ] **Largest Contentful Paint (LCP): <3.0s** (current 5.8s)
- [ ] **Time to Interactive (TTI): <3.5s** (current 5.8s)
- [ ] **Main bundle size: <600KB** (down from 1MB+)
- [ ] **Total Blocking Time (TBT): <200ms** (currently 0ms - maintain)
- [ ] **Cumulative Layout Shift (CLS): <0.1** (currently 0 - maintain)

### Functionality Preservation
- [ ] **All export features** (PDF, PPTX, DOCX) work identically after dynamic imports
- [ ] **Hero animations** play smoothly with lazy loading and skeleton states
- [ ] **Image display** maintains quality and responsive behavior
- [ ] **Accessibility score 95+** (current 96, no regression)
- [ ] **Zero console errors** in production build

### Edge Cases
- [ ] **Slow 3G network** performance under 5s TTI
- [ ] **Large documents** (1000+ pages) export without memory issues
- [ ] **Multiple simultaneous exports** handle resource loading gracefully
- [ ] **Browser cache** properly handles lazy-loaded components on repeat visits
- [ ] **Error boundaries** gracefully handle dynamic import failures

### Business Impact
- [ ] **Bounce rate** improvement measured via analytics
- [ ] **SEO rankings** maintained or improved via Core Web Vitals
- [ ] **Conversion funnel** performance maintained through optimization

## 5. Test Plan (Design BEFORE build)

### Required Test Categories
- **Unit Tests**: Component lazy loading, dynamic import utilities
- **Integration Tests**: Full page loading, bundle size validation
- **Performance Tests**: Lighthouse CI, WebPageTest benchmarks
- **Manual Tests**: Cross-browser functionality, mobile responsiveness

### Concrete Test Cases

#### Unit Tests (`src/tests/performance/`)
```typescript
// lazy-components.test.tsx
describe('Lazy Component Loading', () => {
  it('DocumentFlowHero loads with skeleton', async () => { ... });
  it('Office exports import dynamically', async () => { ... });
  it('Chart components lazy load on demand', async () => { ... });
});

// bundle-analysis.test.js
describe('Bundle Size Validation', () => {
  it('Main bundle under 600KB', () => { ... });
  it('Lazy chunks under 200KB each', () => { ... });
  it('No duplicate dependencies', () => { ... });
});
```

#### Integration Tests
```typescript
// landing-performance.test.tsx
describe('Landing Page Performance', () => {
  it('FCP under 2.5s on throttled 3G', async () => { ... });
  it('Images lazy load below fold', async () => { ... });
  it('Hero animation plays after skeleton', async () => { ... });
});

// export-functionality.test.tsx
describe('Export Feature Integrity', () => {
  it('PDF export works after dynamic import', async () => { ... });
  it('PPTX generation maintains quality', async () => { ... });
  it('Export UI shows loading states', async () => { ... });
});
```

### Performance Test Suite
```bash
# Lighthouse CI configuration
npm run lighthouse:ci     # Automated Lighthouse testing
npm run webpagetest:run   # Real-world network testing
npm run bundle:analyze    # Bundle composition analysis
npm run perf:benchmark    # Core Web Vitals monitoring
```

### What to Mock vs Integrate
- **Mock**: Actual file exports (use fixtures for performance tests)
- **Integrate**: Dynamic imports, image loading, bundle splitting
- **Mock**: External APIs (Supabase storage) for consistent testing
- **Integrate**: Real browser rendering for accurate performance measurement

### Test Data/Fixtures
```
tests/fixtures/
├── sample-documents/     # Test files for export functionality
├── performance-baselines/  # Lighthouse score history
├── bundle-snapshots/     # Build size tracking
└── user-flows/          # Critical path scenarios
```

## 6. Implementation Plan (Small slices)

### **Slice 1: Resource Hints & Quick Wins** (30 min)
**What changes**: Add preconnect links, image attributes, bundle limits
**Tests FIRST**: Lighthouse score baseline, bundle size validation
**Commands**:
```bash
npm run lighthouse:baseline  # Record current scores
npm run bundle:analyze       # Record current bundle size
```
**Expected outputs**: Baseline metrics documented
**Commit**: `perf: add resource hints and bundle size limits`

### **Slice 2: Landing Page Image Optimization** (45 min)
**What changes**: Add lazy loading, dimensions, WebP formats to external image
**Tests FIRST**: Image loading performance test, visual regression test
**Commands**:
```bash
npm run test -- src/tests/performance/image-loading.test.tsx
npm run dev  # Manual verification
```
**Expected outputs**: Image optimization tests pass, no visual regressions
**Commit**: `perf: optimize landing page images with lazy loading and WebP`

### **Slice 3: Hero Component Lazy Loading** (2 hours)
**What changes**: Create LazyDocumentFlowHero wrapper with Suspense + skeleton
**Tests FIRST**: Lazy component test, animation integrity test
**Commands**:
```bash
npm run test -- src/tests/performance/lazy-components.test.tsx
npm run lighthouse:test  # Verify FCP improvement
```
**Expected outputs**: Hero lazy loads, FCP improves 1-2 seconds
**Commit**: `perf: implement lazy loading for DocumentFlowHero component`

### **Slice 4: Dynamic Office Export Imports** (3 hours)
**What changes**: Replace static imports with dynamic imports in PitchDeck, DocumentExport
**Tests FIRST**: Export functionality test, bundle size test
**Commands**:
```bash
npm run test -- src/tests/performance/export-functionality.test.tsx
npm run bundle:analyze  # Verify main bundle reduction
```
**Expected outputs**: Exports work identically, main bundle reduces ~500KB
**Commit**: `perf: implement dynamic imports for office export libraries`

### **Slice 5: Chart Component Lazy Loading** (1 hour)
**What changes**: Dynamic import recharts in DocumentVisualizationPanel
**Tests FIRST**: Chart loading test, visualization integrity test
**Commands**:
```bash
npm run test -- src/tests/performance/chart-loading.test.tsx
npm run dev  # Manual chart testing
```
**Expected outputs**: Charts load on-demand, bundle size further reduced
**Commit**: `perf: add lazy loading for chart visualization components`

### **Slice 6: Icon WebP Conversion** (45 min)
**What changes**: Convert PNG icons to WebP format
**Tests FIRST**: Icon display test, PWA manifest validation
**Commands**:
```bash
npm run test -- src/tests/performance/icon-loading.test.tsx
npm run build && npm run preview  # Verify icon loading
```
**Expected outputs**: Icons display correctly, reduced file sizes
**Commit**: `perf: convert PNG icons to WebP format for bandwidth savings`

### **Slice 7: Component Code Splitting** (4 hours)
**What changes**: Split ConversationChat into focused sub-components
**Tests FIRST**: Component functionality test, bundle chunk test
**Commands**:
```bash
npm run test -- src/tests/components/conversation-chat.test.tsx
npm run bundle:analyze  # Verify chunk splitting
```
**Expected outputs**: Component works identically, better chunk distribution
**Commit**: `perf: split large ConversationChat component for better chunking`

### **Slice 8: Performance Validation & Cleanup** (2 hours)
**What changes**: Final performance testing, documentation updates
**Tests FIRST**: Full Lighthouse CI run, regression test suite
**Commands**:
```bash
npm run lighthouse:final  # Compare against baseline
npm run test:regression   # Ensure no functionality loss
npm run bundle:final-analysis  # Document improvements
```
**Expected outputs**: 85+ Lighthouse score, all tests passing
**Commit**: `perf: complete performance optimization with validation results`

## 7. Git Workflow Rules

### Branch Naming
```
perf/lighthouse-performance-optimization
```

### Commit Cadence
- **Commit after every slice completion** (8 commits total)
- **Run targeted tests before each commit**
- **Include performance metrics in commit messages**

### Commit Message Format
```
perf: <description>

- <specific change>
- Performance impact: <metric improvement>
- Bundle size: <before → after>

Refs: Performance Optimization PRD
```

### Regression Checking
**After each slice**:
```bash
npm run test:targeted     # Tests for changed components
npm run lighthouse:quick  # Fast performance check
npm run dev && manual smoke test  # Visual verification
```

**After every 3-5 slices**:
```bash
npm run test              # Full test suite
npm run lighthouse:ci     # Complete Lighthouse run
npm run build && npm run preview  # Production build verification
```

### Break/Revert Policy
- **If Lighthouse score drops >5 points**: Revert immediately, analyze
- **If any functionality breaks**: Fix immediately before proceeding
- **If bundle size increases**: Investigate and resolve before next slice

## 8. Commands (Repo-specific)

### Install & Setup
```bash
npm install                    # Install dependencies
npm run types:generate         # Generate Supabase types
```

### Testing Commands
```bash
npm run test                   # Run Vitest test suite
npm run test:watch             # Watch mode for development
npm run test -- <file>         # Run specific test file
npm run test:regression        # Run critical path tests
```

### Performance Commands
```bash
npm run lighthouse:ci          # Lighthouse CI testing
npm run lighthouse:baseline    # Record baseline metrics
npm run bundle:analyze         # Bundle composition analysis
npm run webpagetest:run        # Real-world network testing
npm run perf:benchmark         # Core Web Vitals monitoring
```

### Build Commands
```bash
npm run build                  # Production build
npm run build:dev              # Development build
npm run preview                # Preview production build
npm run lint                   # ESLint + TypeScript checking
```

### Development Commands
```bash
npm run dev                    # Start development server
npm run dev -- --host         # Dev server with network access
```

## 9. Observability / Logging

### Performance Monitoring
- **Lighthouse CI**: Automated performance tracking on each build
- **Core Web Vitals**: Real user monitoring through Google Analytics
- **Bundle Analysis**: Size tracking and dependency analysis
- **Error Tracking**: Console errors and failed resource loads

### Verification During Smoke Test
```javascript
// Browser console verification
console.log('Performance metrics:', window.performance.timing);
console.log('Bundle chunks loaded:', window.__CHUNK_LOAD_TIMES__);
console.log('Image loading stats:', window.__IMAGE_PERFORMANCE__);

// Check for errors
window.addEventListener('error', (e) => console.error('Performance error:', e));
window.addEventListener('unhandledrejection', (e) => console.error('Import error:', e));
```

### Success Indicators
- **Green Lighthouse scores**: Performance 85+, Accessibility 95+
- **Fast loading indicators**: FCP <2.5s, LCP <3.0s in DevTools
- **Small bundle messages**: Vite build output shows <600KB main bundle
- **Clean console**: No errors, warnings, or failed imports

## 10. Rollout / Migration Plan

### Feature Flags
```typescript
// Gradual rollout via environment variables
const ENABLE_LAZY_HERO = process.env.VITE_ENABLE_LAZY_HERO !== 'false';
const ENABLE_DYNAMIC_EXPORTS = process.env.VITE_ENABLE_DYNAMIC_EXPORTS !== 'false';
```

### Safe Rollout Steps
1. **Development**: Full implementation with feature flags
2. **Staging**: Deploy with flags enabled, full testing
3. **Production 25%**: Enable for 25% of users, monitor metrics
4. **Production 100%**: Full rollout after 48h monitoring period

### Rollback Plan
- **Performance regression**: Revert to previous Git commit
- **Functionality issues**: Disable feature flags via environment variables
- **Build failures**: Fallback to static imports in emergency build
- **User reports**: Emergency hotfix process with pre-tested fallbacks

### Data Compatibility
- **No database changes**: Pure frontend optimization
- **No API changes**: All endpoints remain identical
- **No user data impact**: Existing workflows unaffected

## 11. Agent Notes

### Session Log
```
[PLACEHOLDER - Agent will fill during implementation]
- 2026-02-01 [TIME]: Started performance optimization PRD creation
- 2026-02-01 [TIME]: Completed baseline Lighthouse analysis
- 2026-02-01 [TIME]: Implemented slice 1 - resource hints
- [Additional entries during implementation...]
```

### Decisions
```
[PLACEHOLDER - Agent will fill during implementation]
- Decision: Use React.lazy() vs. dynamic imports for components
  Rationale: Better integration with Suspense and error boundaries
  Alternatives: Code splitting at route level, webpack chunks

- Decision: WebP vs. AVIF for image optimization
  Rationale: Broader browser support, easier implementation
  Alternatives: AVIF for better compression, progressive JPEG
```

### Open Questions
```
[PLACEHOLDER - Agent will fill during implementation]
- TBD: Should we optimize Supabase storage images server-side?
- TBD: Impact of lazy loading on SEO crawlers?
- TBD: Service worker caching strategy for dynamic chunks?
- TBD: Real User Monitoring implementation approach?
```

### Regression Checklist
```
[PLACEHOLDER - Agent will fill during implementation]
- [ ] Landing page hero animation plays smoothly
- [ ] PDF export generates correctly from PitchDeck
- [ ] PPTX export maintains formatting quality
- [ ] Document charts render without errors
- [ ] All icons display across browsers
- [ ] Mobile responsiveness maintained
- [ ] Accessibility features work (keyboard nav, screen readers)
- [ ] Team collaboration features unaffected
- [ ] AI query functionality preserved
- [ ] Authentication flows work correctly
```