# Interactive System Manual — Design Spec

**Date:** 2026-04-04
**Location:** `this15fine.dev/docs/`
**Audience:** Jason only (private reference at a convenient URL)

---

## Overview

A single-page interactive manual for Jason's research infrastructure. The page has two halves: an interactive system diagram at the top (the primary interaction component) and expandable reference sections below. Built as static HTML, generated from markdown by a Python build script.

## Architecture

### Page structure

```
+--------------------------------------------------+
|  Header: "How This System Works"                 |
+--------------------------------------------------+
|                                                  |
|  INTERACTIVE SYSTEM DIAGRAM (SVG + JS)           |
|  ┌──────────┐          ┌──────────┐              |
|  │Claude Code│          │Gemini CLI│   Agents     |
|  └─────┬────┘          └─────┬────┘              |
|        │                     │                    |
|  ┌─────┴──┐ ┌────────┐ ┌────┴───┐ ┌──────────┐  |
|  │ Zotero │ │Obsidian│ │Research│ │  Drive   │  Core
|  │        │ │        │ │  DB    │ │          │  Systems
|  └────────┘ └────────┘ └────────┘ └──────────┘  |
|                                                  |
|  Pipeline: Discover → Cite → EZProxy → Attach    |
|            → Extract → Embed → Vault Note         |
|                                                  |
|  Automated: [Token Refresh] [Obsidian Sync] ...  |
|                                                  |
+--------------------------------------------------+
|  DETAIL PANEL (appears on node click)            |
|  Description, commands, links for selected node  |
+--------------------------------------------------+
|                                                  |
|  EXPANDABLE REFERENCE SECTIONS                   |
|  ▸ Research Workflow                             |
|  ▸ Vault Habits                                 |
|  ▸ Maintenance                                  |
|  ▸ Best Practices                               |
|  ▸ Recovery Procedures                           |
|                                                  |
+--------------------------------------------------+
|  Footer: generated from docs/manual.md           |
+--------------------------------------------------+
```

### Interactive diagram

The diagram is the centerpiece. Built with vanilla JavaScript and CSS (no D3 dependency). SVG for connection lines between nodes. HTML divs for the node boxes.

**Three rows:**

1. **Agents** (top): Claude Code and Gemini CLI. Bordered cards showing name and domain.
2. **Core Systems** (middle): Zotero, Obsidian, Research DB, Google Drive. Each is a clickable card with icon, name, and one-line summary.
3. **Pipeline** (bottom): Horizontal flow of 7 stages. Left-to-right arrow progression. Each stage is a clickable pill.

**Interactions:**

- **Hover**: Node border brightens to `--frost`. Cursor changes to pointer.
- **Click**: Selected node gets a `--frost` border glow. Detail panel below the diagram slides open with content for that node.
- **Animated connections**: Thin SVG lines connect agents to their systems. On hover, the line pulses briefly.
- **Pipeline animation**: On page load, a subtle left-to-right highlight sweeps through the pipeline stages once (CSS animation, 2s duration, runs once).

**Automated services strip:**

Below the pipeline row. Small badges with green dot status indicators. Clicking opens the detail panel with the service description and relevant commands.

### Detail panel

A single panel below the diagram that shows content for whichever node is selected. Contains:

- **Title** (node name)
- **Description** (2-3 sentences)
- **Key commands** in copyable code blocks
- **Related files** as a list
- **Link** to the relevant expandable section below (if applicable)

Only one detail panel open at a time. Clicking a different node swaps the content. Clicking the same node again closes the panel.

### Expandable sections

Below the diagram. Standard `<details>/<summary>` elements styled with Nord theme. Content comes from the README markdown. Sections:

1. Research Workflow (finding, ingesting, searching, annotating, writing)
2. Vault Habits (linking, reference notes, daily notes)
3. Maintenance (automated, occasional, things to avoid)
4. Best Practices (session start, before writing, after adding papers, troubleshooting)
5. Recovery Procedures (Google auth, research DB, vault, Zotero, new machine)

### Code blocks

All code blocks and shell commands get a copy-to-clipboard button (top-right corner, clipboard icon). On click, copies the command text and shows a brief "Copied" tooltip.

## Build system

### Source file

`docs/manual.md` — the single markdown source. Contains all content for both the expandable sections and the detail panel data. Detail panel content is defined in a YAML-like frontmatter block or fenced code blocks with a `node:` tag.

Structure:
```markdown
# How This System Works

<!-- Diagram node data (parsed by build script) -->

```node:claude-code
title: Claude Code
icon: terminal
description: Local filesystem work. Research pipeline, vault operations, code, analysis.
commands:
  - claude
files:
  - ~/.claude/CLAUDE.md
  - ~/.claude/skills/
```

```node:research-db
title: Research DB
icon: database
description: 253 papers, 4,253 sections, 6,657 chunks. FTS5 + sqlite-vec hybrid search.
commands:
  - cd ~/projects/research-library && python3 extract.py --stats
  - "from research_db import search_hybrid"
files:
  - ~/projects/research-library/research_db.py
  - ~/projects/research-library/research.db
```

## Research Workflow

### Finding papers
...

## Recovery Procedures
...
```

### Build script

`build-docs.py` in the project root. Python 3, single dependency: `markdown` (pip install markdown).

Responsibilities:
1. Parse `docs/manual.md`
2. Extract `node:` blocks into a JSON structure for the diagram
3. Convert markdown sections to HTML
4. Inject into an HTML template that includes the diagram JS, Nord CSS, and page structure
5. Write output to `public/docs/index.html`

Run: `python3 build-docs.py`

### Template

`docs/template.html` — the page shell. Contains:
- Nord CSS variables (from DESIGN.md)
- Diagram layout and JS (inline or linked)
- Detail panel component
- Expandable section container
- Copy-to-clipboard JS
- Pipeline animation CSS

### Diagram JS

`docs/diagram.js` — separate file, loaded via `<script src>` in the template. Vanilla JS. Responsibilities:
- Render node cards from JSON data
- Draw SVG connection lines
- Handle click/hover interactions
- Manage detail panel show/hide/swap
- Run pipeline animation on load

No external dependencies. No build toolchain.

## Styling

Follows `DESIGN.md` exactly:
- Background: `--nord0-deep` (#1e2430) for page, `--nord0` (#2E3440) for diagram area
- Cards: `--nord1` (#3B4252) background, `--nord3` (#4C566A) border
- Text: `--nord4` (#D8DEE9) body, `--nord6` (#ECEFF4) headings
- Accent: `--frost` (#88C0D0) for interactive elements, links, selected states
- Secondary accent: `--frost-deep` (#5E81AC) for pipeline stages, connection lines
- Success: `--aurora-green` (#A3BE8C) for status dots, pipeline endpoint
- Font: JetBrains Mono throughout, 14px body, 12px metadata
- Max width: 960px
- Border radius: 6px cards, 4px pills/buttons

## Deployment

Same as existing site. Git push to the repo triggers Cloudflare Pages build. No build step on Cloudflare side (it serves `public/` directly). The `build-docs.py` script runs locally before push.

Workflow: edit `docs/manual.md` → run `python3 build-docs.py` → verify locally → git push.

## Files created

```
docs/
  manual.md           # markdown source (content + node data)
  template.html       # page shell with diagram JS and CSS
  diagram.js          # interactive diagram logic
  build-docs.py       # markdown → HTML build script (project root or docs/)
public/
  docs/
    index.html        # generated output (do not edit directly)
```

## Not in scope

- Sidebar navigation
- Search
- Tabs
- Multi-page structure
- Analytics or tracking
- Mobile-specific layout (page works on mobile via responsive CSS, but not optimized for touch interaction with the diagram)
- Live status checks (green dots are static, updated when the page is rebuilt)
