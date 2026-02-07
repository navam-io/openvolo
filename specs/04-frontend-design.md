# OpenVolo Frontend Design Spec

## Aesthetic Direction: "Luminous Glass"

Light and airy with subtle glass-morphism, gradient accents from the logo palette, clean typography, and purposeful micro-interactions.

## Brand Palette (OKLCH)

| Color | Value | Usage |
|-------|-------|-------|
| Cyan | `oklch(0.75 0.15 195)` | Primary brand, chart-1 |
| Lavender | `oklch(0.70 0.12 280)` | Chart-2, neutral tint hue |
| Pink | `oklch(0.78 0.12 340)` | Accent, chart-3 |
| Coral | `oklch(0.78 0.13 45)` | Chart-4, warm accent |
| Periwinkle | `oklch(0.60 0.14 270)` | Chart-5, supporting |

## Color Token Strategy

- All neutrals tinted with lavender hue (~270) at low chroma (0.005-0.02)
- `--primary`: brand cyan (`oklch(0.55 0.18 195)`)
- `--accent`: soft pink (`oklch(0.96 0.03 340)`)
- Chart colors map 1:1 to the 5 brand gradient stops
- Dark mode: deep indigo-tinted darks, brighter primary for contrast

## Typography

| Role | Font | CSS Variable |
|------|------|-------------|
| Display/Headings | Plus Jakarta Sans | `--font-display` |
| Body/UI | Inter | `--font-body` (maps to `--font-sans`) |
| Code | JetBrains Mono | `--font-mono` |

### Type Scale Classes

- `.text-display` — 700, -0.02em tracking, 1.1 line-height
- `.text-heading-1` — 700, 1.875rem, -0.02em
- `.text-heading-2` — 600, 1.25rem, -0.01em
- `.text-heading-3` — 600, 1rem
- `.text-label` — 500, 0.8125rem, uppercase, 0.01em

## Utility Classes

- `.gradient-brand` — full 4-stop gradient (cyan→lavender→pink→coral)
- `.gradient-brand-subtle` — light/dark adaptive subtle version
- `.text-gradient-brand` — gradient text fill (cyan→lavender→pink)
- `.border-gradient-brand` — gradient border-image

## Animation

- `shimmer` — background-position slide for loading skeletons
- `fadeSlideIn` — translateY(8px) → 0 + opacity 0→1
- `.animate-fade-slide-in` — Tailwind shorthand with `animationDelay` staggering

## Component Patterns

### Sidebar
- Logo: `openvolo-logo-transparent.png` image (32x32)
- Brand name: `.text-gradient-brand` gradient text
- Active state: `border-l-2 border-primary bg-primary/8 text-primary`
- Glass: `bg-sidebar/30 backdrop-blur-sm`

### Dashboard Header
- Sticky with `backdrop-blur-sm bg-background/80`
- Dynamic breadcrumb from pathname
- Dark mode toggle (Sun/Moon icons via next-themes)
- Search placeholder (disabled, ready for Phase 2)

### Stat Cards
- Gradient background wash from chart tokens (`bg-gradient-to-br from-chart-N/10 to-chart-N/5`)
- Icon in circular gradient container (`rounded-full p-2 bg-chart-N/15 text-chart-N`)
- Animated countup numbers via `requestAnimationFrame`
- Staggered entrance with `animationDelay`

### Badges
- Funnel stages and priorities use chart tokens: `bg-chart-N/15 text-chart-N border-chart-N/25`
- Auto-adapts to dark mode through CSS custom properties

### Empty States
- Gradient orb icon circle (matches logo aesthetic)
- `.text-heading-2` title + muted description + optional CTA button

## Dark Mode

- Powered by `next-themes` with `attribute="class"`, `defaultTheme="system"`
- All tokens defined in `.dark {}` block
- `disableTransitionOnChange` prevents FOUC

## Brand Assets

| File | Location | Purpose |
|------|----------|---------|
| `openvolo-logo-transparent.png` | `public/assets/` | Sidebar logo |
| `openvolo-logo-black.png` | `public/assets/` | Dark mode sidebar |
| `openvolo-logo-name.png` | `public/assets/` | Splash screens |
| `favicon.ico` | `public/` | Browser tab |
| `site.webmanifest` | `public/` | PWA manifest |

## Dependencies Added

- `next-themes` — dark mode provider
