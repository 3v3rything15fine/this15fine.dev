# this15fine.dev — Design Language

> Visual identity guidelines for `this15fine.dev` and related web properties.
> Derived from the Nord-GitHub Dark desktop theme, terminal palette, and
> email signature system built 2026-03-15. Not a rigid spec — a compass.

---

## Philosophy

Minimal, legible, accessible, privacy-first. No tracking, no analytics JS, no cookies.
Monospace-forward. Dark by default. Curious and experimental, but never noisy.

> "More Real Genius with Val Kilmer than Beautiful Mind with Russell Crowe."

---

## Color Palette

### Core (Nord-GitHub Dark)

The foundation. These are the system desktop colors — use them as the primary palette
for `this15fine.dev` and any web UI that should feel native to the ecosystem.

| Token | Hex | Role |
|-------|-----|------|
| `--nord0` | `#2E3440` | Deep background — page, hero sections |
| `--nord1` | `#3B4252` | Surface — cards, panels, nav |
| `--nord2` | `#434C5E` | Elevated surface — hover states, inputs |
| `--nord3` | `#4C566A` | Border, divider, subtle UI chrome |
| `--nord4` | `#D8DEE9` | Primary text |
| `--nord5` | `#E5E9F0` | Secondary text (slightly brighter) |
| `--nord6` | `#ECEFF4` | Bright text — headings, emphasis |
| `--frost` | `#88C0D0` | Accent — links, cursor, interactive elements |
| `--frost-deep` | `#5E81AC` | Secondary accent — visited links, muted interactive |
| `--frost-warm` | `#8FBCBB` | Tertiary accent — subtle highlights |
| `--aurora-green` | `#A3BE8C` | Success, growth, positive states |
| `--aurora-yellow` | `#EBCB8B` | Warning, attention, in-progress |
| `--aurora-red` | `#BF616A` | Error, danger, critical |
| `--aurora-magenta` | `#B48EAD` | Tags, metadata, decorative |
| `--burgundy` | `#6B3040` | Signature accent — borders, brand mark |
| `--magenta-bright` | `#B048A8` | Active states, focus rings (use sparingly) |

### Signature Palette (Email / Documents)

Used in email signatures and document footers. Derived from the TXST maroon
aesthetic with the Nord system as a backdrop.

| Token | Hex | Role |
|-------|-----|------|
| `--sig-border` | `#501214` | Image ring, link color in signatures |
| `--sig-text` | `#1a1a1a` | Body text (light-bg email context) |
| `--sig-muted` | `#444444` | Italic tagline text |
| `--sig-dim` | `#666666` | AI disclosure text |
| `--sig-rule` | `#aaaaaa` | Dashed divider |
| `--sig-outline` | `#cccccc` | Containing border |

### Terminal / SSH Palette (Reference)

When building terminal-adjacent UI (code blocks, CLI output, pipeline status):

| Token | Hex | Role |
|-------|-----|------|
| `--term-bg` | `#2d3440` | Terminal background |
| `--term-fg` | `#d8dee9` | Terminal foreground |
| `--term-cursor` | `#87c0d0` | Cursor / active element |
| `--term-red` | `#bf616a` | Errors |
| `--term-green` | `#a3be8c` | Success |
| `--term-yellow` | `#ebcb8b` | Warnings |
| `--term-blue` | `#5e81ac` | Info |
| `--term-magenta` | `#b48eac` | Decorative |
| `--term-cyan` | `#88c0d0` | Links, accents |

---

## Typography

### Primary Stack

```css
font-family: 'JetBrains Mono', 'Liberation Mono', 'Courier New', monospace;
```

Monospace everywhere. This is the identity. Use it for body text, headings,
navigation, code, everything. Vary weight and size, not family.

### Sizing

| Element | Size | Weight | Notes |
|---------|------|--------|-------|
| Body text | 14px | 400 | 1.6 line-height |
| Small text / metadata | 12px | 400 | 1.4 line-height |
| Headings (h1) | 24px | 700 | 1.2 line-height |
| Headings (h2) | 18px | 600 | 1.3 line-height |
| Headings (h3) | 16px | 600 | 1.4 line-height |
| Code blocks | 13px | 400 | 1.5 line-height, `--nord1` background |
| Nav items | 14px | 500 | uppercase tracking: 0.05em (optional) |

### Fallback for long-form reading

If a page has substantial prose (blog post, documentation), consider:
```css
font-family: 'Noto Sans', system-ui, sans-serif;
```
But default to monospace. Only break the rule for readability on 500+ word blocks.

---

## Layout

### Grid

- Max content width: `960px` (narrower than typical — monospace reads tighter)
- Side padding: `24px` (mobile), `48px` (desktop)
- Section spacing: `64px` vertical
- Card padding: `20px`

### Borders & Corners

| Element | Radius | Border |
|---------|--------|--------|
| Cards / panels | `6px` | 1px solid `--nord3` |
| Buttons | `4px` | 1px solid `--nord3`, hover → `--frost` |
| Images / avatars | `50%` (circular) | 2px solid `--burgundy` |
| Code blocks | `6px` | 1px solid `--nord3` |
| Window-like containers | `12px` top, `0` bottom | 2px solid `--burgundy` |

### Shadows

Use sparingly. Dark backgrounds don't need much depth.

```css
--shadow-subtle: 0 1px 3px rgba(0, 0, 0, 0.3);
--shadow-elevated: 0 4px 12px rgba(0, 0, 0, 0.4);
```

---

## Interactive States

| State | Treatment |
|-------|-----------|
| Default link | `--frost` text, no underline |
| Link hover | `--frost` text, underline |
| Link visited | `--frost-deep` text |
| Button default | `--nord1` bg, `--nord4` text, 1px `--nord3` border |
| Button hover | `--nord2` bg |
| Button active | `--nord3` bg |
| Button primary | `--frost` bg, `--nord0` text |
| Focus ring | 2px solid `--magenta-bright`, 2px offset |
| Selection | `--frost-deep` bg, `--nord6` text |

---

## Iconography

- Prefer text/emoji over icon libraries
- If icons needed: simple line icons, stroke width 1.5–2px, `--nord4` color
- No filled/solid icons — keep it light

---

## Motion

Minimal. Functional, not decorative.

```css
--transition-fast: 150ms ease;
--transition-normal: 250ms ease;
```

Use for: hover states, focus transitions, panel reveals.
Never use for: page transitions, loading spinners, attention-grabbers.

---

## Accessibility

- All text meets **WCAG AA** contrast against its background (minimum)
- `--nord4` on `--nord0` = 9.5:1 (AAA)
- `--frost` on `--nord0` = 7.3:1 (AAA)
- `--aurora-red` on `--nord0` = 4.8:1 (AA)
- Focus indicators always visible (never `outline: none`)
- No motion without `prefers-reduced-motion` respect
- Dark mode is the default (matches system preference)

---

## Image Treatment

### Avatars
- Circular crop with `--burgundy` (#6B3040) border ring
- 2px border width
- Sizes: 120px (email), 52px (inline signature), 72px (document footer)

### Screenshots / Figures
- `6px` border radius
- 1px `--nord3` border
- Optional: subtle `--shadow-subtle`

---

## Patterns to Avoid

- No gradients (flat only)
- No background textures or noise
- No icon fonts (use SVG or emoji)
- No rounded pill shapes (too playful — keep angular)
- No white backgrounds (always dark)
- No tracking scripts, analytics, cookies, or third-party resources
- No web fonts loaded from external CDNs — self-host or use system stack
- No autoplay media

---

## Brand Elements

### Domain Identity
- Domain: `this15fine.dev`
- GitHub: `3v3rything15fine`
- Personality: The "15" substitution is a recurring motif — a quiet inside joke, not a brand identity

### Signature Tagline
> *"Sent with the utmost digital formality, on behalf of Jason,
> by an AI assistant that takes its job perhaps a touch too seriously."*

### AI Disclosure (Standard)
> **AI Disclosure:** This content was composed with AI assistance.
> Content has been reviewed for accuracy and FERPA compliance.

---

## File Reference

| Source | Location |
|--------|----------|
| GTK3 CSS (Nord) | `~/.config/gtk-3.0/gtk.css` |
| GTK4 CSS (Nord) | `~/.config/gtk-4.0/gtk.css` |
| Firefox userChrome | `~/.mozilla/firefox/ewny9ef6.default-release/chrome/userChrome.css` |
| Terminal palette | `~/.config/cosmic/com.system76.CosmicTerm/v1/profile_nord` |
| Wallpaper SVG | `~/.local/share/backgrounds/nord-geometric.svg` |
| Window border CSS | `~/.config/gtk-4.0/tilingshell-border.css` |
| Email signature | `~/.local/share/email-templates/signature.html` |
| Theme audit | `~/Documents/nord-theme-audit.md` |
| Theme apply script | `~/Documents/apply-nord-theme.sh` |
