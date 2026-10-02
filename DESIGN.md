# Living+: Design

Light mode only. Ultra-premium, Apple-like resident experience. Sky blue is the **only** accent colour.

## Feel
Quiet, precise, and generous — like a well-made iOS app, not a property-management dashboard.
- Near-white canvas (`#FBFBFD`), white cards, charcoal text. Hierarchy comes from **size and weight**, not colour.
- One accent: **sky blue** (`#0284C7`). Soft tint at 10% opacity. Pressed state ~8% darker. No teal, indigo, terracotta, or violet accents.
- Status (quiet / moderate / busy / error) appears **only** as an 8px dot — never as a filled badge.
- Rounded cards (22px), no card borders, two-layer soft shadows. Glass material on chrome (sidebar, sticky title).
- Real photographs for people and events. Lucide icons only (`strokeWidth` 1.5). **No emoji** in UI copy or icons.
- Brand name in the product: **Living+**. The assistant is **Ask Living+**.

## Tokens

### Colour
| Token | Value | Use |
|---|---|---|
| `--bg` | `#FBFBFD` | Page canvas |
| `--card` | `#FFFFFF` | Cards, sheets |
| `--text` | `#1D1D1F` | Primary copy |
| `--text-secondary` | `#6E6E73` | Supporting copy, icons |
| `--text-tertiary` | `#86868B` | Meta (time, tower, hints) |
| `--hairline` | `rgba(0,0,0,0.08)` | Dividers, glass edge |
| `--fill-quiet` | `rgba(0,0,0,0.04)` | Active nav, shimmer, quiet fills |
| `--primary` | `#0284C7` | Accent only |
| `--primary-tint` | primary at 10% | Secondary buttons, icon tiles |
| `--primary-pressed` | ~8% darker primary | Button press |
| `--status-green` / `--status-amber` / `--status-red` | reserved | 8px dots only |

### Type
Stack: `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, system-ui, sans-serif`. Inter via `next/font` as fallback. `font-feature-settings: "ss01", "cv11"`; antialiased.

| Class | Size / line | Weight | Tracking |
|---|---|---|---|
| `text-large-title` | 40 / 44 | semibold | -0.025em |
| `text-title` | 22 / 28 | semibold | -0.015em |
| `text-headline` | 17 / 22 | semibold | — |
| `text-body` | 15 / 22 | regular | — |
| `text-callout` | 14 / 20 | regular | — |
| `text-caption` | 13 / 18 | regular | — (`text-secondary`) |

### Shape, shadow, material
- Radius: card **22px**, inner tile **14px**, pill **full**.
- `shadow-card`: `0 1px 2px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.04)`
- `shadow-hover`: `0 2px 4px rgba(0,0,0,.05), 0 16px 40px rgba(0,0,0,.08)`
- `.glass`: `background rgba(255,255,255,0.72)`, `backdrop-filter blur(20px) saturate(180%)`, hairline edge.

### Spacing & motion
- 8pt grid. Card padding 24–28px. Section gap 56–64px. Content max-width ~1120px.
- Motion: **250ms** `cubic-bezier(.2,.8,.2,1)`. Cards: hover `translateY(-2px)` + `shadow-hover`. Buttons: active `scale(0.98)`. Honour `prefers-reduced-motion`.

## Navigation
- Desktop: glass sidebar, hairline right edge. Spotlight field **Ask Living+…** with ⌘K (also Cmd/Ctrl+K).
- Mobile bottom nav: **Home · Community · Ask · Events · More**
- Active nav: `--fill-quiet` pill, primary text, semibold. No blue fills.

## Screens
1. **Login / onboarding:** email/password, Google; find society; tower/flat; role; interests.
2. **Home:** date + large greeting; Today summary (Living+); happening-soon photo cards; amenity widgets; neighbour posts; neighbours-like-you. No rent card on Home.
3. **Community:** groups, feed, WhatsApp directory.
4. **Events:** list + detail; create; stalls.
5. **Amenities:** live tiles + booking.
6. **Ask Living+:** chat, citations, suggestion chips.
7. **More:** grouped list (help desk, marketplace, rent · coming soon, profile).
8. **Committee console (web):** approvals, members, documents, vendors.

## Primitives
Button (primary / secondary / tertiary — max **one** primary per screen), Card, Badge (neutral + optional status dot), IconTile, Avatar, AvatarStack, GroupedList + ListRow, SectionHeader, EmptyState, LoadingSkeleton (shimmer in `--fill-quiet`).

Icons: Lucide only, 20px, `strokeWidth` 1.5, `text-secondary`.

## Required states
Every data screen: **loading skeleton**, **empty state** (IconTile + one line + tertiary action), **error state**.
