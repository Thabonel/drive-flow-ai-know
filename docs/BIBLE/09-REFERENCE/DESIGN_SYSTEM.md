# Design System - AI Query Hub

**Last Updated**: 2024-12-24
**Status**: Production Ready
**Design Style**: Neumorphic Soft UI

---

## Overview

AI Query Hub uses a professional **neumorphic (soft UI) design system** with shadow-based depth across 6 theme variants. The default theme is **"Deep Corporate" Navy & Gold** for authoritative, professional branding.

---

## Design Philosophy

### Neumorphic Design Principles

**Neumorphism** = New + Skeuomorphism

Soft, extruded UI that appears to be molded from the background using subtle shadows rather than hard borders.

**Key Characteristics**:
- ✅ Soft shadows (not hard borders)
- ✅ Three depth states: raised, flat, pressed
- ✅ Subtle gradients for depth
- ✅ Monochromatic color schemes
- ✅ Micro-interactions on hover
- ✅ Accessibility-first (proper contrast)

**Implementation**: December 2024 (commit `d7a2485`)

---

## Color System

### Primary Theme: Deep Corporate (Navy & Gold)

**Purpose**: Professional, authoritative, trustworthy

**Colors**:
```css
/* Navy - Trust and Authority */
--primary: 213 74% 15%;           /* #0A2342 - Deep Navy */
--primary-foreground: 0 0% 100%;  /* White text on navy */

/* Gold - High-Value CTAs */
--accent: 46 100% 50%;            /* #FFC300 - Vibrant Gold */
--accent-foreground: 213 74% 15%; /* Navy text on gold */

/* Secondary */
--secondary: 213 74% 20%;         /* Lighter navy */
--secondary-foreground: 0 0% 100%;

/* Backgrounds */
--background: 0 0% 100%;          /* White */
--muted: 0 0% 97%;                /* Light gray #F8F8F8 */

/* Success/Error/Warning */
--success: 165 98% 30%;           /* Teal */
--destructive: 0 84% 60%;         /* Red */
--warning: 38 92% 50%;            /* Orange */
```

**Usage**:
- **Navy**: Headers, navigation, primary actions, main text
- **Gold**: CTAs, important highlights, hover states
- **White/Light Gray**: Clean backgrounds, cards
- **Teal**: Success states, positive feedback
- **Red**: Errors, destructive actions
- **Orange**: Warnings, alerts

---

### All 6 Theme Variants

#### 1. Default (Navy & Gold) - **Corporate Professional**
```css
:root {
  --primary: 213 74% 15%;    /* Navy */
  --accent: 46 100% 50%;     /* Gold */
}
```

#### 2. Pure Light - **Clean Minimalist**
```css
.pure-light {
  --primary: 0 0% 9%;        /* Near Black */
  --accent: 142 76% 36%;     /* Green */
}
```

#### 3. Magic Blue - **Modern Tech**
```css
.magic-blue {
  --primary: 222 47% 11%;    /* Deep Blue */
  --accent: 217 91% 60%;     /* Bright Blue */
}
```

#### 4. Classic Dark - **Professional Dark Mode**
```css
.classic-dark {
  --primary: 0 0% 98%;       /* Near White */
  --accent: 217 91% 60%;     /* Blue */
  --background: 0 0% 3.9%;   /* Almost Black */
}
```

#### 5. Dark Mode - **High Contrast**
```css
.dark {
  --primary: 0 0% 98%;       /* Near White */
  --accent: 217 91% 60%;     /* Blue */
  --background: 224 71% 4%;  /* Dark Navy */
}
```

#### 6. System - **OS Preference**
Uses `prefers-color-scheme` media query to match system settings.

---

## Neumorphic Shadow System

### Shadow Variables

**File**: `src/index.css`

```css
:root {
  /* Neumorphic Shadows */
  --shadow-neu-raised:
    6px 6px 12px rgba(0, 0, 0, 0.1),
    -6px -6px 12px rgba(255, 255, 255, 0.7);

  --shadow-neu-flat:
    inset 0 0 0 rgba(0, 0, 0, 0);

  --shadow-neu-pressed:
    inset 4px 4px 8px rgba(0, 0, 0, 0.15),
    inset -4px -4px 8px rgba(255, 255, 255, 0.5);

  /* Legacy Shadows */
  --shadow-glow: 0 0 60px -10px hsl(213 74% 15% / 0.5);
  --shadow-card: 0 4px 20px -2px hsl(213 74% 15% / 0.15);
}
```

### Shadow States

#### Raised (Default State)
**Purpose**: Buttons, cards, interactive elements
**Effect**: Appears to float above background
**CSS**: `shadow-neu-raised`

**Example**:
```tsx
<Button className="shadow-neu-raised">
  Click Me
</Button>
```

#### Flat (Neutral State)
**Purpose**: Disabled elements, placeholders
**Effect**: Flush with background
**CSS**: `shadow-neu-flat`

#### Pressed (Active State)
**Purpose**: Active buttons, selected items, inputs
**Effect**: Appears pressed into background
**CSS**: `shadow-neu-pressed`

**Example**:
```tsx
<Input className="shadow-neu-pressed" />
```

---

## Component Styling

### Buttons

**File**: `src/components/ui/button.tsx`

**Neumorphic Enhancement**:
```tsx
// Default button
<Button className="shadow-neu-raised rounded-2xl">
  Primary Action
</Button>

// On hover
className="shadow-neu-raised hover:shadow-neu-flat"

// On active (pressed)
className="active:shadow-neu-pressed"
```

**States**:
- Default: Raised shadow
- Hover: Reduces to flat (subtle)
- Active: Pressed shadow
- Disabled: Flat shadow with opacity

**Micro-interactions**:
- Smooth transition (150ms)
- Scale slightly on hover (scale-[1.02])
- Instant press feedback

---

### Cards

**File**: `src/components/ui/card.tsx`

**Neumorphic Enhancement**:
```tsx
<Card className="shadow-neu-raised rounded-2xl">
  <CardHeader>...</CardHeader>
  <CardContent>...</CardContent>
</Card>
```

**Features**:
- Soft raised shadow by default
- 16px border radius (`rounded-2xl`)
- Subtle background gradient
- Hover: Slight lift effect

---

### Inputs

**File**: `src/components/ui/input.tsx`

**Neumorphic Enhancement**:
```tsx
<Input className="shadow-neu-pressed rounded-xl" />
```

**Inset Appearance**:
- Pressed shadow (appears recessed)
- 12px border radius (`rounded-xl`)
- Focus: Subtle glow + accent border
- Smooth transition on focus

**States**:
- Default: Pressed (inset)
- Focus: Accent border + glow
- Error: Red border + pressed shadow
- Disabled: Flat shadow + opacity

---

### Select Dropdowns

**File**: `src/components/ui/select.tsx`

**Matching Input Style**:
```tsx
<Select>
  <SelectTrigger className="shadow-neu-pressed rounded-xl">
    <SelectValue />
  </SelectTrigger>
  <SelectContent className="shadow-neu-raised rounded-xl">
    <SelectItem>...</SelectItem>
  </SelectContent>
</Select>
```

**Features**:
- Trigger: Inset appearance (pressed)
- Content: Raised (floats above)
- Smooth open/close animation

---

### Dialogs

**File**: `src/components/ui/dialog.tsx`

**Neumorphic Enhancement**:
```tsx
<DialogContent className="shadow-neu-raised rounded-2xl">
  <DialogHeader>...</DialogHeader>
  ...
</DialogContent>
```

**Features**:
- Strong raised shadow (floats)
- 16px border radius
- Dark overlay (80% black)
- Smooth zoom-in animation

---

## Theming

### CSS Variables Location

**File**: `src/index.css`

All theme colors and shadows defined as CSS variables in HSL format.

### Theme Structure

```css
:root {
  /* Colors (HSL format, no wrapper) */
  --primary: 213 74% 15%;
  --accent: 46 100% 50%;

  /* Shadows */
  --shadow-neu-raised: ...;
  --shadow-neu-pressed: ...;

  /* Gradients */
  --gradient-primary: ...;
}
```

### Dark Mode Overrides

```css
.dark {
  /* Inverted shadows for dark backgrounds */
  --shadow-neu-raised:
    6px 6px 12px rgba(0, 0, 0, 0.3),
    -6px -6px 12px rgba(255, 255, 255, 0.05);

  --shadow-neu-pressed:
    inset 4px 4px 8px rgba(0, 0, 0, 0.3),
    inset -4px -4px 8px rgba(255, 255, 255, 0.05);
}
```

---

## Usage Guidelines

### When to Use Neumorphic Shadows

**DO Use**:
- ✅ Buttons (primary actions)
- ✅ Cards (content containers)
- ✅ Inputs (form fields)
- ✅ Dialogs (modal windows)
- ✅ Navigation items
- ✅ Interactive elements

**DON'T Use**:
- ❌ Text elements
- ❌ Icons alone
- ❌ Backgrounds
- ❌ Borders (use shadows instead)
- ❌ Small UI elements (<24px)

### Accessibility

**Contrast Requirements** (WCAG AA):
- Text on primary: 4.5:1 minimum ✅
- Text on accent: 4.5:1 minimum ✅
- Interactive elements: Clear focus states ✅

**Focus States**:
```tsx
focus:ring-2 focus:ring-accent focus:ring-offset-2
```

**Disabled States**:
- Reduced opacity (60%)
- Flat shadow
- Cursor: not-allowed

---

## Component Examples

### Button Variants

```tsx
// Primary (Raised)
<Button className="bg-accent text-accent-foreground shadow-neu-raised">
  Primary Action
</Button>

// Secondary (Outline + Raised)
<Button variant="outline" className="shadow-neu-raised">
  Secondary Action
</Button>

// Ghost (No Shadow)
<Button variant="ghost">
  Tertiary Action
</Button>

// Destructive (Raised + Red)
<Button variant="destructive" className="shadow-neu-raised">
  Delete
</Button>
```

### Card Variations

```tsx
// Default Card
<Card className="shadow-neu-raised rounded-2xl">
  <CardContent>Content</CardContent>
</Card>

// Interactive Card (Hover Effect)
<Card className="shadow-neu-raised rounded-2xl hover:shadow-neu-flat transition-shadow cursor-pointer">
  <CardContent>Clickable Content</CardContent>
</Card>

// Pressed Card (Active State)
<Card className="shadow-neu-pressed rounded-2xl">
  <CardContent>Selected Item</CardContent>
</Card>
```

### Input Variations

```tsx
// Text Input
<Input
  type="text"
  className="shadow-neu-pressed rounded-xl"
  placeholder="Enter text..."
/>

// Search Input with Icon
<div className="relative">
  <Search className="absolute left-3 top-3" />
  <Input
    className="shadow-neu-pressed rounded-xl pl-10"
    placeholder="Search..."
  />
</div>

// Textarea
<Textarea
  className="shadow-neu-pressed rounded-xl"
  rows={4}
/>
```

---

## Animation & Transitions

### Micro-Interactions

**Buttons**:
```css
transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
hover:scale-[1.02]
active:scale-[0.98]
```

**Cards**:
```css
transition: shadow 200ms ease-in-out;
hover:shadow-neu-flat
```

**Inputs**:
```css
transition: border-color 200ms, box-shadow 200ms;
focus:border-accent
focus:shadow-neu-pressed
```

### Loading States

```tsx
<Button disabled className="shadow-neu-flat">
  <Loader2 className="h-4 w-4 animate-spin" />
  Loading...
</Button>
```

---

## Responsive Design

### Breakpoints

```css
sm: 640px   /* Mobile landscape */
md: 768px   /* Tablet */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
2xl: 1536px /* Extra large */
```

### Mobile Optimizations

**Touch Targets**:
- Minimum 44x44px (iOS)
- Minimum 48x48px (Android)

**Shadows on Mobile**:
- Slightly reduced intensity
- Faster transitions (100ms)

---

## Typography

### Font System

**Font Family**:
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI',
             Arial, sans-serif;
```

### Scale

```css
text-xs:   0.75rem  (12px)
text-sm:   0.875rem (14px)
text-base: 1rem     (16px)
text-lg:   1.125rem (18px)
text-xl:   1.25rem  (20px)
text-2xl:  1.5rem   (24px)
text-3xl:  1.875rem (30px)
text-4xl:  2.25rem  (36px)
```

### Font Weights

```css
font-normal:    400
font-medium:    500
font-semibold:  600
font-bold:      700
```

---

## Spacing System

### Padding/Margin Scale

```css
p-1:  0.25rem (4px)
p-2:  0.5rem  (8px)
p-3:  0.75rem (12px)
p-4:  1rem    (16px)
p-6:  1.5rem  (24px)
p-8:  2rem    (32px)
p-12: 3rem    (48px)
```

### Component Spacing

**Buttons**: `px-4 py-2` (16px/8px)
**Cards**: `p-6` (24px)
**Inputs**: `px-3 py-2` (12px/8px)
**Dialogs**: `p-6` (24px)

---

## Border Radius

### Neumorphic Rounded Corners

```css
rounded-xl:  12px  /* Inputs, small cards */
rounded-2xl: 16px  /* Buttons, large cards */
rounded-3xl: 24px  /* Dialogs, modals */
```

### Usage

- **Inputs**: `rounded-xl` (12px)
- **Buttons**: `rounded-2xl` (16px)
- **Cards**: `rounded-2xl` (16px)
- **Dialogs**: `rounded-2xl` (16px)
- **Images**: `rounded-lg` (8px)

---

## Implementation Files

### Modified Files (December 2024)

1. **`src/index.css`** (+40 lines)
   - Neumorphic shadow variables
   - 6 theme variants updated
   - Dark mode shadow overrides

2. **`src/components/ui/button.tsx`**
   - Added `shadow-neu-raised`
   - Added `rounded-2xl`
   - Hover/active states

3. **`src/components/ui/card.tsx`**
   - Added `shadow-neu-raised`
   - Added `rounded-2xl`

4. **`src/components/ui/input.tsx`**
   - Added `shadow-neu-pressed`
   - Added `rounded-xl`
   - Focus state enhancements

5. **`src/components/ui/select.tsx`**
   - Matching input styling
   - Pressed trigger, raised content

6. **`src/components/ui/dialog.tsx`**
   - Added `shadow-neu-raised`
   - Added `rounded-2xl`

**Total Changes**: 6 files, +101 lines, -29 lines
**Commit**: `d7a2485`

---

## Color Conversion Reference

### HSL Format

**AI Query Hub uses HSL** (Hue, Saturation, Lightness) without the `hsl()` wrapper:

```css
/* CORRECT */
--primary: 213 74% 15%;

/* INCORRECT */
--primary: hsl(213, 74%, 15%);
```

### Hex to HSL

**Navy** `#0A2342`:
- Hex: #0A2342
- RGB: rgb(10, 35, 66)
- HSL: 213 74% 15%

**Gold** `#FFC300`:
- Hex: #FFC300
- RGB: rgb(255, 195, 0)
- HSL: 46 100% 50%

**Tool**: https://www.w3schools.com/colors/colors_hsl.asp

---

## Future Enhancements

### Planned Improvements

1. **Theme Builder UI**
   - User-customizable themes
   - Live preview
   - Export CSS

2. **Additional Shadow Variants**
   - `shadow-neu-deep` (more pronounced)
   - `shadow-neu-subtle` (less pronounced)

3. **Component Library**
   - Standalone neumorphic component package
   - Storybook documentation

4. **Animation Library**
   - Pre-built transitions
   - Loading states
   - Page transitions

---

## Related Documentation

- [../01-FRONTEND/COMPONENTS.md](../01-FRONTEND/COMPONENTS.md) - Component library
- [../01-FRONTEND/FRONTEND_ARCHITECTURE.md](../01-FRONTEND/FRONTEND_ARCHITECTURE.md) - Architecture
- [CLAUDE.md](../../../CLAUDE.md) - Design principles (project root)

---

**Neumorphic design system deployed December 24, 2024. Used across all 6 themes for consistent professional appearance.**
