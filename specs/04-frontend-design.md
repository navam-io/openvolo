# OpenVolo Frontend Design Spec

## 1. Aesthetic Direction: "Luminous Glass"

Light and airy with subtle glass-morphism, gradient accents from the logo palette, clean typography, and purposeful micro-interactions. All neutrals carry a lavender tint (hue ~270) for warmth. Dark mode inverts to deep indigo-tinted backgrounds with brighter primaries for contrast.

## 2. Brand Palette (OKLCH)

| Color | Light Mode | Dark Mode | Role |
|-------|-----------|-----------|------|
| Cyan | `oklch(0.55 0.18 195)` | `oklch(0.65 0.18 195)` | Primary brand, chart-1 |
| Lavender | `oklch(0.65 0.12 280)` | same | Chart-2, neutral tint hue |
| Pink | `oklch(0.72 0.12 340)` | same | Accent, chart-3 |
| Coral | `oklch(0.72 0.13 45)` | same | Chart-4, warm accent |
| Periwinkle | `oklch(0.60 0.14 270)` | same | Chart-5, supporting |

### Color Token Strategy

- All neutrals tinted with lavender hue (~270) at low chroma (0.005-0.02)
- `--primary`: brand cyan — brighter in dark mode (0.65 L) for contrast
- `--accent`: soft pink (`oklch(0.96 0.03 340)`)
- Chart colors (1-5) map 1:1 to the 5 brand gradient stops, consistent across modes
- Destructive: `oklch(0.577 0.245 27.325)` — warm orange-red, same in both modes

### Complete Token Reference

| Token | Light | Dark |
|-------|-------|------|
| `--background` | `oklch(0.995 0.005 270)` | `oklch(0.15 0.02 270)` |
| `--foreground` | `oklch(0.17 0.02 270)` | `oklch(0.96 0.01 270)` |
| `--card` | `oklch(1 0.003 270)` | `oklch(0.18 0.02 270)` |
| `--border` | `oklch(0.91 0.01 270)` | `oklch(0.28 0.02 270)` |
| `--muted` | `oklch(0.96 0.01 270)` | `oklch(0.22 0.02 270)` |
| `--muted-foreground` | `oklch(0.52 0.02 270)` | `oklch(0.65 0.02 270)` |
| `--sidebar` | `oklch(0.985 0.005 270)` | `oklch(0.17 0.025 270)` |

### Radius Tokens

- `--radius: 0.625rem` (10px base)
- `--radius-sm: 6px`, `--radius-md: 8px`, `--radius-lg: 10px`, `--radius-xl: 14px`

## 3. Typography

| Role | Font | CSS Variable | Weights |
|------|------|-------------|---------|
| Display/Headings | Plus Jakarta Sans | `--font-display` | 400-800 |
| Body/UI | Inter | `--font-body` → `--font-sans` | default |
| Code/Technical | JetBrains Mono | `--font-mono` | default |

Loaded via `next/font/google` in `layout.tsx`, subset `"latin"`.

### Type Scale Classes

| Class | Size | Weight | Tracking | Line-height |
|-------|------|--------|----------|-------------|
| `.text-display` | inherit | 700 | -0.02em | 1.1 |
| `.text-heading-1` | 1.875rem | 700 | -0.02em | 1.2 |
| `.text-heading-2` | 1.25rem | 600 | -0.01em | 1.3 |
| `.text-heading-3` | 1rem | 600 | normal | 1.4 |
| `.text-label` | 0.8125rem | 500 | 0.01em | normal, uppercase |

## 4. Gradient & Utility Classes

| Class | Description |
|-------|-------------|
| `.gradient-brand` | 135deg 4-stop: cyan → purple → rose → gold |
| `.gradient-brand-subtle` | Light/dark adaptive low-opacity version |
| `.text-gradient-brand` | Text fill via `background-clip: text` |
| `.border-gradient-brand` | Gradient `border-image` |

## 5. Animation System

### Keyframes

| Name | Effect | Duration |
|------|--------|----------|
| `shimmer` | `background-position` slide (-200% → 200%) | 2s linear infinite |
| `fadeSlideIn` | `translateY(8px)` → 0 + opacity 0 → 1 | 0.5s ease-out forwards |

### Tailwind Tokens

- `--animate-shimmer: shimmer 2s linear infinite`
- `--animate-fade-slide-in: fadeSlideIn 0.5s ease-out forwards`

### Stagger Pattern

Cards and list items use inline `animationDelay` for sequential entrance:
```tsx
style={{ animationDelay: `${i * 80}ms` }}
className="animate-fade-slide-in"
```

### Stat Counter Animation

`AnimatedStat` uses `requestAnimationFrame` with ease-out-cubic easing (800ms default) to animate numbers from 0 to target value.

## 6. Layout Architecture

### Root Layout (`layout.tsx`)

- `ThemeProvider` from `next-themes` — `attribute="class"`, `defaultTheme="system"`, `disableTransitionOnChange`
- Font CSS variables applied on `<body>`: `font-sans antialiased`
- Metadata: "OpenVolo — AI-Native Social CRM"

### Dashboard Layout (`dashboard/layout.tsx`)

```
┌─────────────────────────────────────────────┐
│  SidebarProvider                             │
│  ┌──────┬──────────────────────────────────┐ │
│  │      │  SidebarInset                    │ │
│  │ App  │  ┌────────────────────────────┐  │ │
│  │ Side │  │  DashboardHeader (sticky)  │  │ │
│  │ bar  │  ├────────────────────────────┤  │ │
│  │      │  │  <main> p-6 overflow-auto  │  │ │
│  │      │  │  (page content)            │  │ │
│  │      │  └────────────────────────────┘  │ │
│  └──────┴──────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### Sidebar (`app-sidebar.tsx`)

- **Glass effect**: `bg-sidebar/30 backdrop-blur-sm` + `border-r border-sidebar-border`
- **Header**: Logo (32x32 `rounded-lg`) + gradient brand text
- **Navigation items**: Dashboard, Contacts, Content, Workflows
- **Footer items**: Settings, Help
- **Removed**: Campaigns and Agents (consolidated into Workflows — see [`specs/06-unified-workflows.md`](./06-unified-workflows.md))
- **Active state**: `border-l-2 border-primary bg-primary/8 text-primary font-display font-medium`
- **Transition**: `transition-all duration-200`
- **Responsive**: Collapses to trigger button on mobile via `SidebarProvider`

### Dashboard Header (`dashboard-header.tsx`)

- **Position**: Sticky, top-0, z-30, h-14
- **Glass**: `bg-background/80 backdrop-blur-sm` + `border-b border-border/50`
- **Left**: Sidebar trigger + vertical separator
- **Center**: Auto-generated breadcrumb from `usePathname()` — last segment bold, earlier segments are links
- **Right**: Search button (disabled placeholder) + theme toggle (Sun/Moon icons)

## 7. Page Structure

### Dashboard Overview (`/dashboard`)

1. **Greeting** — `DashboardGreeting`: time-based "Good morning/afternoon/evening", `animate-fade-slide-in`
2. **Stat Cards** — 4-column responsive grid (`md:grid-cols-2 lg:grid-cols-4`)
   - Gradient background wash: `bg-gradient-to-br from-chart-N/10 to-chart-N/5`
   - Icon in circular container: `rounded-full p-2 bg-chart-N/15 text-chart-N`
   - Animated counters + staggered entrance (80ms per card)
   - Stats: Contacts (Users/chart-1), Active Workflows (GitBranch/chart-3), Pending Tasks (CheckSquare/chart-2), Content (FileText/chart-4)
3. **Contact Pipeline** — `FunnelVisualization`: horizontal stacked bar (h-4 rounded-full) + color legend
4. **Activity Grid** — 2-column: Recent Contacts (with FunnelStageBadge) + Pending Tasks (with PriorityBadge)
   - Row hover: `hover:bg-accent/30 transition-colors`

### Contacts (`/dashboard/contacts`)

- Server-rendered list with `PaginationControls` (page window with ellipsis)
- Contact rows: name, company, platform badge, funnel stage, enrichment score
- Click → detail page

### Contact Detail (`/dashboard/contacts/[id]`)

- **Header**: Back button + name/company + EnrichButton (X contacts only) + FunnelStageBadge + EnrichmentScoreBadge
- **Tabs**: Details | Identities (count) | Tasks (count)
- **Details tab**: Contact info card (headline, bio, email, phone, location, website, platform, profile link, tags) + Edit form card (with save/delete)
- **Identities tab**: `IdentitiesSection` — table with add/delete, platform badges, external links
- **Tasks tab**: Task list with toggle (done/todo), priority badges, add/delete

### Content (`/dashboard/content`)

- Server-rendered list with filters (type, origin, status) + `PaginationControls`
- Compose button → `ComposeDialog` modal
- Tabs: Published | Drafts

### Content Detail (`/dashboard/content/[id]`)

- Post content display + engagement metrics
- Engagement actions (like, retweet, reply)
- Thread context (parent/child tweets)

### Settings (`/dashboard/settings`)

1. **API Configuration** — Anthropic API key status (env var / config / not set)
2. **Platform Connections** — X, LinkedIn, Gmail via `PlatformConnectionCard`
   - Connection status badges (connected/needs_reauth/disconnected)
   - Sync controls per platform
   - Granted permissions (collapsible scope display)
3. **Browser Enrichment** — Session setup/validate/clear + bulk enrich button
4. **Platform-specific sections**: X content sync, LinkedIn CSV import, Gmail metadata sync

### Workflows (`/dashboard/workflows`)

- Server-rendered hub page with `WorkflowQuickActions` for triggering sync/enrich
- `WorkflowViewSwitcher` — 3-view client component with Tabs + URL param `?view=list|kanban|swimlane`
- Empty state when no runs exist, populated by platform sync/enrich operations
- View components: `WorkflowListView` (table), `WorkflowKanbanView` (4-column status board), `WorkflowSwimlaneView` (horizontal type lanes)

### Workflow Detail (`/dashboard/workflows/[id]`)

- **Summary cards** — Status, type, item counts (processed/success/skipped/error), duration
- **Agent cards** — Model, token usage, cost in USD (shown for agent-type runs only)
- **Step visualization** — `WorkflowDetailSteps` client component with Timeline/Graph toggle
  - Timeline: `WorkflowStepTimeline` — chronological list with 15 step type icons
  - Graph: `WorkflowGraphView` — vertical pipeline with expandable nodes (pure CSS)

### Placeholder Pages

- Help — shell page, ready for future content

## 8. Component Inventory

### Custom Domain Components (26)

| Component | File | Purpose |
|-----------|------|---------|
| `AppSidebar` | `app-sidebar.tsx` | Main navigation sidebar (4 main + 2 footer items) |
| `DashboardHeader` | `dashboard-header.tsx` | Sticky header with breadcrumb + theme toggle |
| `DashboardGreeting` | `dashboard-greeting.tsx` | Time-based greeting message |
| `AnimatedStat` | `animated-stat.tsx` | Counter animation (ease-out-cubic, 800ms) |
| `FunnelVisualization` | `funnel-visualization.tsx` | Horizontal stacked bar + legend |
| `FunnelStageBadge` | `funnel-stage-badge.tsx` | Colored badge per funnel stage |
| `PriorityBadge` | `priority-badge.tsx` | Priority level badge (low/medium/high/urgent) |
| `EnrichmentScoreBadge` | `enrichment-score-badge.tsx` | Score display (Rich/Good/Basic/Sparse/Minimal) |
| `PlatformConnectionCard` | `platform-connection-card.tsx` | Connection status + sync + scopes UI |
| `ContactForm` | `contact-form.tsx` | Contact CRUD form (auto-syncs full name) |
| `AddTaskDialog` | `add-task-dialog.tsx` | Task creation dialog |
| `IdentitiesSection` | `identities-section.tsx` | Platform identities table with add/delete |
| `EnrichButton` | `enrich-button.tsx` | Single/bulk browser enrichment trigger |
| `ComposeDialog` | `compose-dialog.tsx` | Tweet/thread compose modal (draft + publish) |
| `TweetInput` | `tweet-input.tsx` | Auto-resize textarea with char counter |
| `PaginationControls` | `pagination-controls.tsx` | Page navigation with windowed numbers |
| `EmptyState` | `empty-state.tsx` | Centered icon + title + CTA |
| `WorkflowProgressCard` | `workflow-progress-card.tsx` | Card with type icon (6 types), progress bar, stats |
| `WorkflowStepTimeline` | `workflow-step-timeline.tsx` | Chronological step list (15 step types) with status/duration |
| `WorkflowRunCard` | `workflow-run-card.tsx` | Compact card for kanban/swimlane (two layout variants) |
| `WorkflowListView` | `workflow-list-view.tsx` | Table view with type, status, counts, duration columns |
| `WorkflowKanbanView` | `workflow-kanban-view.tsx` | 4-column status board (Pending/Running/Completed/Failed) |
| `WorkflowSwimlaneView` | `workflow-swimlane-view.tsx` | Horizontal lanes per workflow type with ScrollArea |
| `WorkflowGraphView` | `workflow-graph-view.tsx` | Vertical pipeline with expandable step nodes (pure CSS) |
| `WorkflowViewSwitcher` | `dashboard/workflows/workflow-view-switcher.tsx` | View mode tabs with URL param persistence |
| `WorkflowDetailSteps` | `dashboard/workflows/[id]/workflow-detail-steps.tsx` | Timeline/Graph toggle for run detail |

### shadcn/ui Primitives (19)

| Category | Components |
|----------|------------|
| **Input** | `button`, `input`, `textarea`, `label`, `select` |
| **Display** | `card`, `badge`, `avatar`, `table`, `skeleton`, `separator` |
| **Navigation** | `tabs`, `dropdown-menu`, `sidebar`, `scroll-area` |
| **Overlay** | `dialog`, `alert-dialog`, `tooltip` |

### Button Variants (CVA)

| Variant | Style |
|---------|-------|
| `default` | Primary background + foreground |
| `destructive` | Destructive colors |
| `outline` | Border + transparent bg, hover fills |
| `secondary` | Secondary background |
| `ghost` | Transparent, hover fills accent |
| `link` | Underline on hover |

Sizes: `default` (h-9), `xs` (h-6), `sm` (h-8), `lg` (h-10), `icon` (9x9), `icon-xs` (6x6), `icon-sm` (8x8), `icon-lg` (10x10)

### Badge Semantic Colors

| Context | Color Token | Examples |
|---------|-------------|----------|
| Low priority / Prospect | chart-1 (cyan) | `bg-chart-1/15 text-chart-1 border-chart-1/25` |
| Medium priority / Engaged | chart-2 (lavender) | `bg-chart-2/15 text-chart-2` |
| High priority / Customer | chart-4 (coral) | `bg-chart-4/15 text-chart-4` |
| Urgent / Destructive | destructive | `bg-destructive/15 text-destructive` |
| Advocate | primary | `bg-primary/15 text-primary` |

## 9. Platform Connection Card Pattern

The `PlatformConnectionCard` is the most complex reusable component. Key features:

- **Status badges**: `connected` (green), `needs_reauth` (amber), `disconnected` (gray)
- **Account handle**: Monospace font display
- **Last synced**: Relative time ("just now", "5m ago", "2h ago", "3d ago")
- **Granted permissions**: Collapsible section, scopes grouped by capability (Auth, Profile, Content, Tweets, Users, Engagement, Email, DMs, Contacts, Lists, Moderation, Other)
- **Tier indicators**: "Basic+" badge for advanced scopes
- **Actions**: Connect, Reconnect, Sync, Enable Contact Sync, Disconnect
- **Scope normalization**: LinkedIn returns comma-separated, X/Google return space-separated — normalized to spaces at storage boundary

## 10. Compose Dialog Pattern

The `ComposeDialog` supports single tweets and threads:

- **Single mode**: One `TweetInput` with 280 char limit
- **Thread mode**: Multiple `TweetInput` components with reordering (up/down arrows) + add/remove
- **Character counter**: Normal (gray), warning (>=260, yellow), over (>280, red)
- **Actions**: Save as Draft, Publish
- **Thread limits**: Max 25 tweets per thread
- **Partial failure**: If some tweets in a thread post but later ones fail, shows posted count + error

## 11. Dark Mode

- **Provider**: `next-themes` with `attribute="class"`, `defaultTheme="system"`, `enableSystem`
- **Toggle**: Sun/Moon icons in dashboard header
- **FOUC prevention**: `disableTransitionOnChange`
- **Token strategy**: All CSS custom properties have `.dark {}` overrides in `globals.css`
- **Key differences**: Background L: 0.995 → 0.15, borders L: 0.91 → 0.28, primary L: 0.55 → 0.65

## 12. Responsive Design

### Breakpoints Used

| Breakpoint | Width | Usage |
|------------|-------|-------|
| Default | < 640px | Mobile-first single column |
| `sm:` | 640px+ | Small screen overrides |
| `md:` | 768px+ | 2-column grids |
| `lg:` | 1024px+ | 4-column stat grid, full sidebar |

### Key Responsive Patterns

- **Stat cards**: 1 → 2 → 4 columns
- **Activity grid**: 1 → 2 columns
- **Contact form**: 1 → 2 column field grid
- **Sidebar**: Full panel (desktop) → trigger button (mobile)
- **Settings sync controls**: 1 → 2 column button grid

## 13. State Management Patterns

### Server Components (DB-direct)

- Query functions are sync (better-sqlite3)
- Pass data as props to client components
- `searchParams: Promise<{...}>` for Next.js 16 async params
- Pagination computed server-side, passed as props

### Client Components (API-fetch)

- `useState` for local UI state (forms, modals, loading, errors)
- `useSearchParams()` + `<Suspense>` boundary for URL-driven filters
- `useRouter()` for navigation + `router.refresh()` for server re-fetch
- `useTheme()` for dark mode toggle
- `usePathname()` for active nav detection
- `useRef` for form change tracking (avoids re-renders)

## 14. Accessibility

- **Focus rings**: `ring-ring/50 ring-[3px]` on buttons and inputs
- **Screen reader text**: `sr-only` class on icon-only buttons
- **ARIA attributes**: Radix primitives provide full ARIA support
- **Disabled states**: `opacity-50 pointer-events-none` (via `data-disabled` or `:disabled`)
- **Color contrast**: OKLCH tokens ensure sufficient contrast ratios in both modes
- **Keyboard navigation**: Tab order preserved, Enter/Space activation

## 15. Brand Assets

| File | Location | Purpose |
|------|----------|---------|
| `openvolo-logo-transparent.png` | `public/assets/` | Sidebar logo (32x32, rounded-lg) |
| `openvolo-logo-black.png` | `public/assets/` | Dark mode sidebar |
| `openvolo-logo-name.png` | `public/assets/` | Splash screens |
| `favicon.ico` | `public/` | Browser tab |
| `favicon-16x16.png` | `public/` | Small favicon |
| `favicon-32x32.png` | `public/` | Standard favicon |
| `apple-touch-icon.png` | `public/` | iOS home screen |
| `android-chrome-192x192.png` | `public/` | Android standard |
| `android-chrome-512x512.png` | `public/` | Android high-res |
| `site.webmanifest` | `public/` | PWA manifest (`theme_color: #6366f1`) |

## 16. Dependencies

| Package | Purpose |
|---------|---------|
| `next-themes` | Dark mode provider |
| `@radix-ui/*` | Headless UI primitives (via shadcn/ui) |
| `class-variance-authority` | Component variant styling |
| `clsx` + `tailwind-merge` | Conditional class merging (`cn()` utility) |
| `lucide-react` | Icon library |
| `tw-animate-css` | Tailwind animation utilities |

## 17. Tailwind v4 Configuration

No `tailwind.config.js` — all theme values defined in `globals.css` via `@theme inline {}`:

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-body);
  --font-mono: var(--font-mono);
  --font-display: var(--font-display);
  --color-sidebar-*: var(--sidebar-*);
  --color-chart-*: var(--chart-*);
  --animate-shimmer: shimmer 2s linear infinite;
  --animate-fade-slide-in: fadeSlideIn 0.5s ease-out forwards;
}
```

## 18. Design Improvement Opportunities

### Visual Polish
- **Loading states**: Extend `shimmer` skeleton to all list views (contacts, content, tasks)
- **Page transitions**: Add `fadeSlideIn` to route changes for smoother navigation
- **Micro-interactions**: Hover lift effect on cards (`hover:-translate-y-0.5 hover:shadow-md`)
- **Avatar system**: Show contact profile photos where available, gradient fallback for missing

### Information Density
- **Contact list**: Add inline enrichment sparkline or score bar alongside names
- **Dashboard stats**: Add trend indicators (up/down arrows with percentage change)
- **Timeline view**: Activity feed showing cross-platform interactions chronologically

### Platform Visual Identity
- **Platform icons**: Use official X, LinkedIn, Gmail brand icons instead of generic Globe
- **Platform color coding**: Subtle tint cards by platform (cyan for X, blue for LinkedIn, red for Gmail)

### Mobile Experience
- **Bottom navigation**: Consider tab bar for mobile instead of hamburger sidebar
- **Swipe gestures**: Card swiping for quick actions (archive, snooze, assign)
- **Compact mode**: Denser list view for small screens

### Advanced Components (Phase 3+)
- **Chat interface**: AI conversation UI for agent interactions (Vercel AI SDK streaming)
- **Notification center**: Toast/popover for sync results, enrichment completions
- **Command palette**: `Cmd+K` global search across contacts, content, tasks
- **Data visualization**: Charts for engagement trends, enrichment score distribution, funnel conversion
