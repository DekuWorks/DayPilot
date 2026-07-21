# DayPilot Brand Guidelines

**Last updated:** 2026-07-21

## Positioning

- **Statement:** Plan. Pilot. Perform.
- **Feel:** Premium, fast, modern, focused, intelligent, minimal, slightly futuristic
- **Quality references:** Linear, Raycast, Superhuman, Cron/Notion Calendar, Arc (inspiration only)

## Logo

The mark is a stylized **D** with an integrated forward arrow / aircraft shape (direction, momentum, navigation).

| Asset | Path |
|-------|------|
| Logo mark (PNG reference) | `assets/brand/daypilot-logo-mark.png` |
| Logo mark (SVG) | `assets/brand/daypilot-logo-mark.svg` |
| Horizontal wordmark | `assets/brand/daypilot-logo-horizontal.svg` |
| White mono | `assets/brand/daypilot-logo-white.svg` |
| Black mono | `assets/brand/daypilot-logo-black.svg` |
| Favicon | `assets/brand/favicon.svg` |
| iOS app icon source | `assets/brand/daypilot-app-icon-ios.png` |
| Dashboard mockup | `assets/brand/daypilot-dashboard-mockup.png` |
| iOS UI showcase | `assets/brand/daypilot-ios-ui-showcase.png` |

### Rules

- Do not distort the mark; keep clear space ≈ ¼ mark height
- Prefer green mark on dark surfaces; use mono white/black for contrast
- Do not place the green logo on low-contrast green backgrounds
- Prefer SVG on web; use PNG sources for iOS icon / splash rasterization

## Color

Primary experience is **dark UI + electric green**.

| Token | Approx hex | Use |
|-------|------------|-----|
| `brand-400` | `#8CFF3F` | Highlight / gradient top |
| `brand-500` | `#42E85F` | Primary accent |
| `brand-600` | `#16B947` | Pressed / deep |
| `background-primary` | `#0A0B0D` | App background |
| `surface-primary` | `#14161A` | Cards |
| `text-primary` | `#F4F5F7` | Body on dark |

Semantic category colors: meetings blue, tasks green, projects purple, focus cyan, personal orange, work blue, school purple.

Web tokens: `apps/web/src/styles/tokens.css` (imported from `globals.css`).

## Typography

- **Web:** Inter (or Geist Sans if adopted)
- **iOS (Flutter):** System / SF Pro via platform defaults unless bundling Inter

Scale: Display → Page title → Section → Card → Body → Small → Caption → Button → Nav → Data value/label

## Surfaces

- Large radii (~12–16px) on cards and controls
- Subtle borders, not heavy shadows
- Lucide-style line icons
