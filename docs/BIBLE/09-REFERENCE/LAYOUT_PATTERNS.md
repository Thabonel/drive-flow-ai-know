# Layout Patterns - AI Query Hub

**Last Updated**: 2024-12-29
**Status**: Production
**Category**: Frontend Architecture

---

## Overview

This document captures critical CSS layout patterns and solutions used in AI Query Hub. These patterns ensure proper viewport fitting, responsive behavior, and clean layout architecture.

---

## Viewport Height Calculation Pattern

**Problem Solved**: Full-height pages with fixed headers require correct height calculation to prevent viewport overflow.

**Context**: The `/conversations` page requires perfect viewport fit (like ChatGPT/Claude) with no page-level scrolling. The input field must be fully visible at the bottom without requiring scroll.

### The Issue

When a page uses `h-screen` (100vh) but is rendered inside a container that has a fixed-height header above it, the total page height exceeds the viewport:

```
Header: 48px
+ Content: 100vh
= Total: viewport + 48px = OVERFLOW ❌
```

### The Solution

**Use `calc()` to subtract header height from viewport height:**

```tsx
// ❌ WRONG - Creates overflow
<div className="w-full h-screen overflow-hidden">

// ✅ CORRECT - Perfect viewport fit
<div className="w-full h-[calc(100vh-48px)] overflow-hidden">
```

### Implementation Details

**File**: `src/pages/Conversations.tsx`
**Line**: 138

**Layout Hierarchy**:
```tsx
// App.tsx - Root layout
<div className="min-h-screen flex flex-col w-full">
  <div className="flex flex-1 w-full">
    <AppSidebar />
    <main className="flex-1">
      <Header />  ← 48px tall (h-12 = 3rem)
      <div className={...padding...}>
        {children}  ← Conversations page
      </div>
    </main>
  </div>
</div>

// Conversations.tsx
<div className="w-full h-[calc(100vh-48px)] overflow-hidden">
  {/* Chat interface */}
</div>
```

**The Math**:
- Header: **48px** (from Header.tsx line 30: `className="h-12"`)
- Conversations: **calc(100vh - 48px)**
- **Total**: 48px + (100vh - 48px) = **100vh exactly** ✅

### When to Use This Pattern

Use `calc()` viewport height when:
1. ✅ Page needs full viewport height (no page scrolling)
2. ✅ Fixed header/nav exists OUTSIDE the page component
3. ✅ Page has internal scrolling areas (messages, content)
4. ✅ Must work across all screen sizes (laptop, desktop, mobile)

**Alternative Approaches**:

**Option 1: Use dvh (Dynamic Viewport Height)**
```tsx
// Better for mobile - accounts for browser chrome (URL bar)
<div className="w-full h-[calc(100dvh-48px)] overflow-hidden">
```

**Option 2: Flex Distribution (ChatGPT/Claude Pattern)**
```tsx
// Header INSIDE the viewport container
<div className="h-screen flex flex-col">
  <header className="flex-shrink-0">...</header>
  <div className="flex-1 min-h-0">...</div>  // Uses remaining space
</div>
```

**Why We Use calc() Instead**:
- Our Header is in App.tsx layout (shared across all pages)
- Keeps Header visible on all pages
- Maintains consistent app shell
- More surgical fix (only affects /conversations)

### Comparison with ChatGPT/Claude

**ChatGPT Pattern**:
- Root container: `h-screen overflow-hidden`
- Header: `flex-shrink-0` (inside viewport)
- Chat area: `flex-1 min-h-0` (fills remaining space)
- Input: `flex-shrink-0` (inside viewport)

**Claude Desktop Pattern**:
- Uses `h-[100dvh]` for mobile-safe viewport
- All sections inside viewport container
- Flex distribution for perfect space allocation

**AI Query Hub Pattern**:
- Header outside viewport container (in App.tsx)
- Page uses `calc(100vh - 48px)` to account for header
- Internal flex distribution for chat sections
- Same result: perfect viewport fit ✅

### Related Patterns

**Flex Column Height Containment**:
```tsx
// Parent must have defined height
<div className="h-[calc(100vh-48px)] flex flex-col">

  // Header - fixed height
  <header className="flex-shrink-0">
    {/* ... */}
  </header>

  // Scrollable area - fills remaining space
  <div className="flex-1 min-h-0 overflow-y-auto">
    {/* Messages */}
  </div>

  // Input - fixed at bottom
  <form className="flex-shrink-0">
    {/* ... */}
  </form>

</div>
```

**Key Rules**:
1. **min-h-0** on scrollable flex items (prevents content from expanding parent)
2. **flex-shrink-0** on fixed-height sections (prevents compression)
3. **flex-1** on sections that should fill remaining space
4. **overflow-hidden** on root to prevent page scroll

### Troubleshooting

**Problem**: Input still cut off after using calc()
- ✅ Check if header height changed (use browser DevTools)
- ✅ Verify no excessive padding/margins in child components
- ✅ Ensure `overflow-hidden` is on root container
- ✅ Check for `min-h-screen` instead of `h-screen` on parent

**Problem**: Page content gets cut off on mobile
- ✅ Use `dvh` instead of `vh` (accounts for mobile browser chrome)
- ✅ Test on actual mobile devices (not just responsive mode)
- ✅ Consider collapsible header on mobile

**Problem**: Header scrolls away with content
- ✅ Ensure header is position: sticky or outside scroll container
- ✅ Check z-index for proper layering

### Testing Checklist

When implementing this pattern:
- [ ] No page-level scrollbar appears
- [ ] Input/footer fully visible at bottom
- [ ] Internal scrolling works (messages, content)
- [ ] Header stays fixed at top
- [ ] Works on laptop screens (13", 15")
- [ ] Works on desktop monitors (27"+)
- [ ] Works on mobile (iOS Safari, Chrome)
- [ ] Resize window - layout adapts correctly

### Commit Reference

**Implementation**: Commit `4d6a60b`
**Date**: 2024-12-29
**Files Modified**: `src/pages/Conversations.tsx` (line 138)

**Commit Message**:
```
fix: Correct viewport height calculation for /conversations page

Root cause: Header (48px) + Content (100vh) = viewport + 48px overflow
Fix: Use h-[calc(100vh-48px)] to subtract header height from viewport.
Result: Perfect viewport fit, no scroll needed, input fully visible.
```

---

## Future Patterns

*This section will be expanded with additional layout patterns as they are identified and documented.*

Potential additions:
- Responsive sidebar patterns
- Grid layout breakpoints
- Mobile-first responsive patterns
- Sticky positioning best practices
