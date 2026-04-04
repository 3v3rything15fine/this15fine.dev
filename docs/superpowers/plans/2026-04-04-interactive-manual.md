# Interactive System Manual Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an interactive system manual at this15fine.dev/docs/ with a JS-driven system diagram as the primary interaction, expandable reference sections below, and a Python build script generating the page from markdown.

**Architecture:** Single-page app generated from `docs/manual.md` by `build-docs.py`. The diagram is vanilla JS/CSS reading node data from a JSON object embedded in the page. Expandable sections use native `<details>` elements. All styling follows the existing Nord theme from `DESIGN.md` and the current `public/docs/index.html`.

**Tech Stack:** Python 3 + `markdown` library for build. Vanilla JS for diagram interactions. CSS for animations. No frameworks, no bundler, no dependencies beyond what's installed.

---

## File Structure

```
docs/
  manual.md              # Markdown source with node: frontmatter blocks
  template.html          # Page shell (HTML/CSS/JS skeleton)
  diagram.js             # Interactive diagram logic
build-docs.py            # Build script (project root)
public/
  docs/
    index.html           # Generated output (replaced by build)
```

---

### Task 1: Create the markdown source file

**Files:**
- Create: `docs/manual.md`

This is the content source. Contains node data blocks (parsed by the build script) and standard markdown sections.

- [ ] **Step 1: Write `docs/manual.md`**

Adapt the README content from `~/projects/system-audit/README.md` into the manual format. Add node data blocks at the top for each diagram node. Each node block uses a custom fenced syntax: triple-backtick with `node:id` language tag.

Content structure:
1. Node data blocks (claude-code, gemini-cli, zotero, obsidian, research-db, google-drive, pipeline stages, automated services)
2. Markdown sections: Research Workflow, Vault Habits, Maintenance, Best Practices, Recovery Procedures

The node blocks contain: title, icon (emoji), color (Nord variable name), description, commands (array), files (array), related-section (anchor link to expandable section below).

- [ ] **Step 2: Verify the file parses as valid markdown**

Run: `python3 -c "import markdown; print(markdown.markdown(open('docs/manual.md').read())[:200])"`
Expected: HTML output without errors.

- [ ] **Step 3: Commit**

```bash
cd ~/projects/this15fine.dev
git add docs/manual.md
git commit -m "feat: add manual markdown source with node data blocks"
```

---

### Task 2: Build the Python build script

**Files:**
- Create: `build-docs.py`

Parses `docs/manual.md`, extracts node data blocks into a JSON structure, converts remaining markdown to HTML, injects both into the template, writes `public/docs/index.html`.

- [ ] **Step 1: Write `build-docs.py`**

```python
#!/usr/bin/env python3
"""Build the interactive system manual.

Reads docs/manual.md, extracts node data blocks, converts markdown
sections to HTML, and generates public/docs/index.html from the template.

Usage: python3 build-docs.py
"""

import json
import re
from pathlib import Path

import markdown

PROJECT = Path(__file__).parent
SOURCE = PROJECT / "docs" / "manual.md"
TEMPLATE = PROJECT / "docs" / "template.html"
DIAGRAM_JS = PROJECT / "docs" / "diagram.js"
OUTPUT = PROJECT / "public" / "docs" / "index.html"


def extract_nodes(text: str) -> tuple[list[dict], str]:
    """Extract ```node:id blocks and return (nodes, remaining_markdown)."""
    nodes = []
    pattern = re.compile(
        r'```node:(\S+)\n(.*?)```',
        re.DOTALL,
    )

    for match in pattern.finditer(text):
        node_id = match.group(1)
        body = match.group(2).strip()
        node = {"id": node_id}
        for line in body.split("\n"):
            line = line.strip()
            if not line:
                continue
            if ":" in line:
                key, _, value = line.partition(":")
                key = key.strip()
                value = value.strip()
                if value.startswith("[") and value.endswith("]"):
                    # Parse simple array: [item1, item2]
                    items = [v.strip().strip("'\"") for v in value[1:-1].split(",")]
                    node[key] = [i for i in items if i]
                else:
                    node[key] = value
        nodes.append(node)

    remaining = pattern.sub("", text).strip()
    return nodes, remaining


def md_to_html_sections(md_text: str) -> list[dict]:
    """Convert markdown into expandable section dicts.

    Splits on ## headings. Each section gets: id, title, html.
    """
    sections = []
    current_title = None
    current_id = None
    current_lines = []

    for line in md_text.split("\n"):
        if line.startswith("## "):
            if current_title:
                body_md = "\n".join(current_lines).strip()
                body_html = markdown.markdown(
                    body_md,
                    extensions=["fenced_code", "tables", "toc"],
                )
                sections.append({
                    "id": current_id,
                    "title": current_title,
                    "html": body_html,
                })
            current_title = line[3:].strip()
            current_id = re.sub(r'[^a-z0-9]+', '-', current_title.lower()).strip('-')
            current_lines = []
        else:
            current_lines.append(line)

    # Last section
    if current_title:
        body_md = "\n".join(current_lines).strip()
        body_html = markdown.markdown(
            body_md,
            extensions=["fenced_code", "tables", "toc"],
        )
        sections.append({
            "id": current_id,
            "title": current_title,
            "html": body_html,
        })

    return sections


def build():
    """Main build: parse source, inject into template, write output."""
    source_text = SOURCE.read_text()

    # Strip the H1 title line
    lines = source_text.split("\n")
    h1_title = "How This System Works"
    for i, line in enumerate(lines):
        if line.startswith("# "):
            h1_title = line[2:].strip()
            lines[i] = ""
            break
    source_text = "\n".join(lines)

    nodes, remaining_md = extract_nodes(source_text)
    sections = md_to_html_sections(remaining_md)

    # Build sections HTML
    sections_html = []
    for sec in sections:
        sections_html.append(
            f'<details id="{sec["id"]}">\n'
            f'  <summary>{sec["title"]}</summary>\n'
            f'  <div class="detail-body">{sec["html"]}</div>\n'
            f'</details>'
        )
    sections_block = "\n".join(sections_html)

    # Read template and JS
    template = TEMPLATE.read_text()
    diagram_js = DIAGRAM_JS.read_text()

    # Inject
    output = template.replace("{{TITLE}}", h1_title)
    output = output.replace("{{NODES_JSON}}", json.dumps(nodes, indent=2))
    output = output.replace("{{SECTIONS}}", sections_block)
    output = output.replace("{{DIAGRAM_JS}}", diagram_js)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(output)
    print(f"Built {OUTPUT} ({len(nodes)} nodes, {len(sections)} sections)")


if __name__ == "__main__":
    build()
```

- [ ] **Step 2: Verify the script runs without errors on an empty template**

Create a minimal template placeholder first:
```bash
echo '<!DOCTYPE html><html><body>{{TITLE}} {{NODES_JSON}} {{SECTIONS}} <script>{{DIAGRAM_JS}}</script></body></html>' > docs/template.html
echo '// placeholder' > docs/diagram.js
```

Run: `cd ~/projects/this15fine.dev && python3 build-docs.py`
Expected: "Built public/docs/index.html (N nodes, N sections)"

- [ ] **Step 3: Commit**

```bash
git add build-docs.py
git commit -m "feat: add build script for docs manual"
```

---

### Task 3: Build the HTML template

**Files:**
- Create: `docs/template.html`

The page shell. Contains all CSS (Nord theme matching existing docs page), the diagram container, the sections container, and script tags. Uses `{{PLACEHOLDER}}` tokens replaced by the build script.

- [ ] **Step 1: Write `docs/template.html`**

Port the CSS from the existing `public/docs/index.html` (lines 11-334). Keep the same design language: Nord colors, JetBrains Mono, `.detail-body`, `details/summary` styling, `.ref-table`, `code` styling, `.callout` classes, responsive breakpoints.

Add new CSS for:
- `.diagram` container (background `--nord0`, border, border-radius)
- `.diagram-row` (flexbox row for node groups)
- `.node` (clickable card: `--nord1` bg, `--nord2` border, hover brightens to `--frost`)
- `.node.selected` (border `--frost`, box-shadow glow)
- `.node-icon` (emoji, larger font)
- `.node-label` (name + sublabel)
- `.pipeline` (horizontal flex with arrow separators)
- `.pipeline-stage` (pill shape, `--nord2` bg, `--frost-deep` border)
- `.pipeline-stage.endpoint` (green background for final stage)
- `.automated-strip` (small badge row)
- `.status-dot` (green circle)
- `.detail-panel` (slide-open panel below diagram, `--frost` left border)
- `.copy-btn` (clipboard button on code blocks)
- `@keyframes pipeline-sweep` (left-to-right highlight, runs once on load)
- SVG connection lines styled with `--nord3` stroke, animate on hover

Template structure:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>docs :: this15fine.dev</title>
  <meta name="robots" content="noindex, nofollow, noarchive">
  <!-- JetBrains Mono font -->
  <!-- Full CSS (ported + new diagram styles) -->
</head>
<body>
  <div class="page">
    <div class="header">
      <h1>{{TITLE}}</h1>
      <div class="subtitle">Click any node. Scroll for full reference.</div>
    </div>

    <div class="diagram" id="diagram">
      <!-- Populated by diagram.js from NODES_JSON -->
    </div>

    <div class="detail-panel" id="detail-panel" style="display:none;">
      <!-- Populated by diagram.js on node click -->
    </div>

    <div class="sections-header">Full Reference</div>
    <div class="sections">
      {{SECTIONS}}
    </div>

    <div class="footer">
      <p>last updated: <span>2026-04-04</span> // generated from docs/manual.md</p>
    </div>
  </div>

  <script>
    const NODES = {{NODES_JSON}};
    {{DIAGRAM_JS}}
  </script>
</body>
</html>
```

- [ ] **Step 2: Rebuild and verify page renders**

Run: `cd ~/projects/this15fine.dev && python3 build-docs.py`
Open: `public/docs/index.html` in browser.
Expected: Page renders with Nord theme, diagram container visible (empty or with placeholder nodes), sections render as expandable `<details>`.

- [ ] **Step 3: Commit**

```bash
git add docs/template.html
git commit -m "feat: add page template with Nord theme and diagram container"
```

---

### Task 4: Build the interactive diagram

**Files:**
- Create: `docs/diagram.js`

Vanilla JS that reads the `NODES` global, renders the diagram into `#diagram`, handles click/hover interactions, manages the detail panel.

- [ ] **Step 1: Write `docs/diagram.js`**

The script should:

1. **Categorize nodes by type** (parsed from node id prefixes or a `type` field): agents, systems, pipeline, automated.

2. **Render agent row**: Two cards at top. Each card shows icon, title, subtitle. Flexbox centered with gap.

3. **Render SVG connection lines**: Thin lines from each agent down to their connected systems. Use `<svg>` overlay positioned absolutely over the diagram. Lines are `--nord3` colored, 1px stroke. On hover of an agent node, its lines pulse to `--frost` briefly (CSS transition on stroke-opacity).

4. **Render core systems row**: Four cards. Each card: icon (emoji), title, one-line description. Clickable.

5. **Render pipeline row**: Horizontal flex. Each stage is a pill with icon + label. Arrow separators between stages (`→` character, `--nord3` colored). The last stage gets `--aurora-green` background.

6. **Pipeline sweep animation**: On page load, a CSS class `.sweep` is added to each stage sequentially with 200ms delay. The `.sweep` class triggers a brief highlight (border flashes `--frost` then fades). Uses `requestAnimationFrame` or `setTimeout` chain.

7. **Render automated strip**: Small badge row at bottom of diagram. Each badge: green dot + label. Clickable.

8. **Click handler**: Clicking any node:
   - Adds `.selected` class to that node (removes from others)
   - Populates `#detail-panel` with: title, description, commands as code blocks (with copy button), files list, link to related section
   - Shows the detail panel with a slide-down animation (CSS `max-height` transition)
   - Clicking the same node again hides the panel

9. **Copy-to-clipboard**: For every `<code>` block inside the detail panel and the expandable sections, add a small copy button. On click, use `navigator.clipboard.writeText()` and show a "Copied" tooltip for 1.5s.

10. **Hover states**: Nodes get `--frost` border on hover. Cursor pointer. Pipeline stages get slightly brighter background.

All rendering uses `document.createElement` and `innerHTML` for the detail panel content. No template literals in the HTML source (everything is JS-driven from the NODES data).

- [ ] **Step 2: Rebuild and test all interactions**

Run: `cd ~/projects/this15fine.dev && python3 build-docs.py`
Open: `public/docs/index.html` in browser.

Test checklist:
- [ ] Agent cards render in top row
- [ ] Core system cards render in middle row
- [ ] Pipeline stages render horizontally with arrows
- [ ] Automated services render as badge strip
- [ ] Clicking a node opens detail panel with correct content
- [ ] Clicking same node closes detail panel
- [ ] Clicking different node swaps detail panel content
- [ ] Copy button works on code blocks
- [ ] Pipeline sweep animation plays on load
- [ ] Hover states work on all interactive elements
- [ ] SVG lines connect agents to systems
- [ ] Page is scrollable, sections below diagram work

- [ ] **Step 3: Commit**

```bash
git add docs/diagram.js
git commit -m "feat: add interactive system diagram with click/hover interactions"
```

---

### Task 5: Polish and deploy

**Files:**
- Modify: `docs/manual.md` (content refinements)
- Modify: `docs/template.html` (CSS polish)
- Modify: `public/docs/index.html` (rebuild)

- [ ] **Step 1: Test responsive behavior**

Check at 320px, 768px, and 1200px widths. The diagram should:
- Stack vertically on mobile (< 600px): agent cards full width, system cards 2-column, pipeline wraps
- Horizontal layout on tablet and desktop

Add responsive CSS if needed in `template.html`.

- [ ] **Step 2: Verify all content from README is present**

Compare `docs/manual.md` sections against `~/projects/system-audit/README.md`. Every section should be represented. The detail panel nodes should cover: Claude Code, Gemini CLI, Zotero, Obsidian, Research DB, Google Drive, all 7 pipeline stages, and the 4 automated services.

- [ ] **Step 3: Final rebuild**

Run: `cd ~/projects/this15fine.dev && python3 build-docs.py`
Open in browser. Full visual inspection.

- [ ] **Step 4: Add build-docs.py to .gitignore exclusions if needed**

Check: `cat .gitignore` -- make sure `public/docs/index.html` is not gitignored (it's the generated output that gets deployed).

- [ ] **Step 5: Commit and push**

```bash
git add -A
git commit -m "feat: interactive system manual at /docs/"
git push origin main
```

- [ ] **Step 6: Verify deployment**

Wait 1-2 minutes for Cloudflare Pages build.
Open: `https://this15fine.dev/docs/`
Expected: Interactive manual live with diagram, detail panels, expandable sections.

---

## Summary

| Task | What it produces | Estimated time |
|------|-----------------|----------------|
| 1 | `docs/manual.md` (content source) | 5 min |
| 2 | `build-docs.py` (build script) | 5 min |
| 3 | `docs/template.html` (page shell + CSS) | 10 min |
| 4 | `docs/diagram.js` (interactive diagram) | 15 min |
| 5 | Polish, test, deploy | 5 min |
