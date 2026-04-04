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


def parse_node_value(raw: str) -> str | list[str]:
    """Parse a value string. Returns a list if wrapped in [], else a string."""
    raw = raw.strip()
    if raw.startswith("[") and raw.endswith("]"):
        inner = raw[1:-1]
        return [item.strip() for item in inner.split(",") if item.strip()]
    return raw


def extract_nodes(text: str) -> tuple[list[dict], str]:
    """Find all ```node:id blocks, return (nodes_list, cleaned_text)."""
    pattern = re.compile(r"```node:(\S+)\n(.*?)```", re.DOTALL)
    nodes = []
    for match in pattern.finditer(text):
        node_id = match.group(1)
        body = match.group(2)
        node = {"id": node_id}
        for line in body.strip().splitlines():
            if ":" not in line:
                continue
            key, _, val = line.partition(":")
            node[key.strip()] = parse_node_value(val)
        nodes.append(node)
    cleaned = pattern.sub("", text)
    return nodes, cleaned


def slugify(title: str) -> str:
    """Convert a heading title to a URL-friendly id."""
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower())
    return slug.strip("-")


def build_sections(text: str) -> tuple[str, list[str]]:
    """Split markdown on ## headings, return (page_title, sections_html_list)."""
    md = markdown.Markdown(extensions=["fenced_code", "tables"])

    # Extract H1 title
    title = "System Manual"
    h1_match = re.search(r"^#\s+(.+)$", text, re.MULTILINE)
    if h1_match:
        title = h1_match.group(1).strip()
        text = text[: h1_match.start()] + text[h1_match.end() :]

    # Split on ## headings
    parts = re.split(r"^##\s+", text, flags=re.MULTILINE)

    sections_html = []
    for part in parts[1:]:  # skip text before first ##
        lines = part.split("\n", 1)
        heading = lines[0].strip()
        body_md = lines[1] if len(lines) > 1 else ""
        body_md = body_md.strip()
        if not heading:
            continue
        section_id = slugify(heading)
        md.reset()
        body_html = md.convert(body_md)
        section = (
            f'<details id="{section_id}">\n'
            f"  <summary>{heading}</summary>\n"
            f'  <div class="detail-body">{body_html}</div>\n'
            f"</details>"
        )
        sections_html.append(section)

    return title, sections_html


def main() -> None:
    if not SOURCE.exists():
        print(f"Error: {SOURCE} not found.")
        raise SystemExit(1)

    raw = SOURCE.read_text(encoding="utf-8")

    # Extract node blocks
    nodes, cleaned = extract_nodes(raw)

    # Build HTML sections from remaining markdown
    title, sections_html = build_sections(cleaned)

    # Read template and diagram JS
    template = TEMPLATE.read_text(encoding="utf-8")
    diagram_js = DIAGRAM_JS.read_text(encoding="utf-8")

    # Substitute placeholders
    html = template.replace("{{TITLE}}", title)
    html = html.replace("{{NODES_JSON}}", json.dumps(nodes, indent=2))
    html = html.replace("{{SECTIONS}}", "\n".join(sections_html))
    html = html.replace("{{DIAGRAM_JS}}", diagram_js)

    # Write output
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(html, encoding="utf-8")
    print(f"Built {OUTPUT} -- {len(nodes)} nodes, {len(sections_html)} sections.")


if __name__ == "__main__":
    main()
