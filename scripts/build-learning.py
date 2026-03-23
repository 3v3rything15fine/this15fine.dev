#!/usr/bin/env python3
"""Build the /learning/ section of this15fine.dev.

Converts session archives (markdown + Jupyter notebooks) into styled HTML pages
and generates the session index.

Usage:
    python3 scripts/build-learning.py

Reads from: ~/Documents/CI 7303/ai-experiment-archive/
Outputs to:  public/learning/
"""

import json
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

try:
    from markdown_it import MarkdownIt
except ImportError:
    print("ERROR: markdown-it-py not installed. Run: pip install markdown-it-py")
    sys.exit(1)

# ── Paths ─────────────────────────────────────────────────────────────────────
REPO_ROOT = Path(__file__).resolve().parent.parent
PUBLIC = REPO_ROOT / "public"
LEARNING_DIR = PUBLIC / "learning"

# Source session archives
ARCHIVE_DIRS = [
    Path.home() / "Documents" / "CI 7303" / "ai-experiment-archive",
]

# ── Course metadata ───────────────────────────────────────────────────────────
COURSES = {
    "ci-7303": {
        "code": "CI 7303",
        "title": "Psychometric Methods",
        "color": "#88C0D0",
    },
    "ci-7354": {
        "code": "CI 7354",
        "title": "Qualitative Research Methods",
        "color": "#A3BE8C",
    },
}

# ── Markdown renderer ────────────────────────────────────────────────────────
md = MarkdownIt("commonmark", {"html": True}).enable("table").enable("strikethrough")

# ── HTML Templates ────────────────────────────────────────────────────────────

PAGE_TEMPLATE = """\
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title} — this15fine.dev</title>
<meta name="robots" content="noindex, nofollow, noarchive">
<meta name="theme-color" content="#2E3440">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet">
<style>
{css}
</style>
</head>
<body>
<div class="container">
{body}
</div>
</body>
</html>
"""

SHARED_CSS = """\
:root {
  --nord0: #2E3440;
  --nord0-deep: #1e2430;
  --nord1: #3B4252;
  --nord2: #434C5E;
  --nord3: #4C566A;
  --nord4: #D8DEE9;
  --nord5: #E5E9F0;
  --nord6: #ECEFF4;
  --frost: #88C0D0;
  --frost-deep: #5E81AC;
  --frost-warm: #8FBCBB;
  --aurora-green: #A3BE8C;
  --aurora-yellow: #EBCB8B;
  --aurora-red: #BF616A;
  --aurora-magenta: #B48EAD;
  --aurora-orange: #D08770;
  --burgundy: #6B3040;
  --shadow-subtle: 0 1px 3px rgba(0, 0, 0, 0.3);
  --shadow-elevated: 0 4px 16px rgba(0, 0, 0, 0.5);
  --transition-fast: 150ms ease;
  --transition-normal: 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: var(--nord0-deep);
  color: var(--nord4);
  font-family: 'JetBrains Mono', 'Liberation Mono', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.6;
  min-height: 100vh;
}

a { color: var(--frost); text-decoration: none; transition: color var(--transition-fast); }
a:hover { text-decoration: underline; }
a:visited { color: var(--frost-deep); }
a:focus-visible { outline: 2px solid #B048A8; outline-offset: 2px; }

.container {
  max-width: 860px;
  margin: 0 auto;
  padding: 48px;
}

@media (max-width: 768px) {
  .container { padding: 24px 20px; }
}

/* ── Typography ────────────────────────────────────────────────── */
h1 { font-size: 28px; font-weight: 700; color: var(--nord6); line-height: 1.2; margin-bottom: 8px; }
h2 { font-size: 20px; font-weight: 600; color: var(--nord6); margin-top: 48px; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid var(--nord2); }
h3 { font-size: 16px; font-weight: 600; color: var(--frost); margin-top: 32px; margin-bottom: 12px; }
h4 { font-size: 14px; font-weight: 600; color: var(--frost-warm); margin-top: 20px; margin-bottom: 8px; }

p { margin-bottom: 12px; }
ul, ol { margin-left: 20px; margin-bottom: 12px; }
li { margin-bottom: 4px; }

strong { color: var(--nord5); }
em { color: var(--frost-warm); }
code { background: var(--nord1); padding: 1px 5px; border-radius: 3px; font-size: 13px; }
pre { background: var(--nord1); border: 1px solid var(--nord3); border-radius: 6px; padding: 16px; overflow-x: auto; margin-bottom: 16px; }
pre code { background: none; padding: 0; }

hr { border: none; border-top: 1px solid var(--nord3); margin: 32px 0; }

blockquote {
  border-left: 3px solid var(--frost);
  padding: 8px 16px;
  margin-bottom: 16px;
  background: var(--nord1);
  border-radius: 0 6px 6px 0;
  font-style: italic;
  color: var(--nord5);
}

table {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0 20px;
  font-size: 12px;
}
th { text-align: left; color: var(--nord6); font-weight: 600; padding: 8px 12px; border-bottom: 2px solid var(--nord3); background: var(--nord2); }
td { padding: 6px 12px; border-bottom: 1px solid var(--nord2); }
tr:hover td { background: rgba(136, 192, 208, 0.05); }

/* ── Breadcrumb ────────────────────────────────────────────────── */
.breadcrumb {
  font-size: 12px;
  color: var(--nord3);
  margin-bottom: 16px;
}
.breadcrumb a { color: var(--frost-deep); }

/* ── Session header ────────────────────────────────────────────── */
.session-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
  padding: 16px 0;
  border-top: 2px solid var(--burgundy);
  border-bottom: 1px solid var(--nord3);
}
.session-meta .meta-item {
  font-size: 12px;
}
.session-meta .meta-label {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--nord3);
  margin-right: 6px;
}
.session-meta .meta-value { color: var(--nord5); }

/* ── Entry blocks ──────────────────────────────────────────────── */
.entry-block {
  background: var(--nord1);
  border: 1px solid var(--nord3);
  border-radius: 8px;
  padding: 20px 24px;
  margin-bottom: 20px;
}

.entry-header {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--nord3);
  margin-bottom: 12px;
}

/* ── Learning moments ──────────────────────────────────────────── */
.learning-moment {
  background: var(--nord0-deep);
  border-left: 3px solid var(--aurora-yellow);
  padding: 12px 16px;
  margin: 16px 0;
  border-radius: 0 6px 6px 0;
}
.learning-moment .lm-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--aurora-yellow);
  font-weight: 600;
  margin-bottom: 4px;
}

/* ── Artifact links ────────────────────────────────────────────── */
.artifact-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 12px;
  margin: 20px 0;
}

.artifact-card {
  background: var(--nord1);
  border: 1px solid var(--nord3);
  border-radius: 6px;
  padding: 14px 18px;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  display: block;
}

.artifact-card:hover {
  border-color: var(--frost);
  box-shadow: var(--shadow-elevated);
  text-decoration: none;
}

.artifact-card .artifact-type {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--aurora-magenta);
  margin-bottom: 4px;
}

.artifact-card .artifact-name {
  font-size: 14px;
  color: var(--frost);
  font-weight: 500;
}

.artifact-card .artifact-desc {
  font-size: 11px;
  color: var(--nord3);
  margin-top: 4px;
}

/* ── Footer ────────────────────────────────────────────────────── */
.footer {
  border-top: 1px solid var(--nord3);
  padding-top: 24px;
  margin-top: 64px;
  font-size: 12px;
  color: var(--nord3);
  text-align: center;
}
.footer a { color: var(--frost-deep); }

/* ── Index page specifics ──────────────────────────────────────── */
.hero-subtitle {
  font-size: 14px;
  color: var(--nord4);
  max-width: 640px;
  margin-bottom: 8px;
}

.experiment-frame {
  background: var(--nord1);
  border: 1px solid var(--nord3);
  border-left: 3px solid var(--frost);
  border-radius: 0 8px 8px 0;
  padding: 20px 24px;
  margin: 24px 0 48px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--nord5);
}

.session-timeline {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.timeline-card {
  background: var(--nord1);
  border: 1px solid var(--nord3);
  border-radius: 8px;
  overflow: hidden;
  transition: border-color var(--transition-normal), box-shadow var(--transition-normal), transform var(--transition-normal);
  display: block;
}

.timeline-card:hover {
  border-color: var(--frost);
  box-shadow: var(--shadow-elevated);
  transform: translateY(-2px);
  text-decoration: none;
}

.timeline-accent {
  height: 3px;
  width: 100%;
}

.timeline-body {
  padding: 16px 20px;
}

.timeline-date {
  font-size: 12px;
  color: var(--nord3);
  margin-bottom: 4px;
}

.timeline-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--nord6);
  margin-bottom: 8px;
}

.timeline-desc {
  font-size: 13px;
  color: var(--nord4);
  margin-bottom: 12px;
  line-height: 1.5;
}

.timeline-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.timeline-tag {
  display: inline-block;
  background: var(--nord2);
  border: 1px solid var(--nord3);
  border-radius: 3px;
  padding: 2px 8px;
  font-size: 10px;
  color: var(--nord4);
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition-duration: 0.01ms !important; }
  .timeline-card:hover { transform: none; }
}
"""

# ── Notebook post-processing CSS ──────────────────────────────────────────────
NOTEBOOK_CSS = """\
/* Override Jupyter defaults for Nord theme */
body { background: var(--nord0-deep) !important; color: var(--nord4) !important; }
.jp-Notebook, .jp-Cell, #notebook-container { background: transparent !important; }
.jp-Cell { border: none !important; }
.jp-InputArea, .jp-InputPrompt, .input_area { background: var(--nord1) !important; border-color: var(--nord3) !important; }
.jp-OutputArea, .output_area, .jp-OutputPrompt { background: var(--nord0) !important; }
.jp-InputPrompt, .jp-OutputPrompt, .input_prompt, .output_prompt { color: var(--nord3) !important; }
div.input_area, .jp-Editor { background: var(--nord1) !important; border: 1px solid var(--nord3) !important; border-radius: 6px !important; }
.highlight, .cm-s-ipython { background: var(--nord1) !important; }
.highlight .k, .cm-keyword { color: var(--frost) !important; }
.highlight .n, .cm-variable { color: var(--nord4) !important; }
.highlight .s, .cm-string { color: var(--aurora-green) !important; }
.highlight .c, .cm-comment { color: var(--nord3) !important; font-style: italic; }
.highlight .mi, .cm-number { color: var(--aurora-magenta) !important; }
.highlight .o, .cm-operator { color: var(--frost-warm) !important; }
.highlight .nb, .cm-builtin { color: var(--aurora-yellow) !important; }
.highlight .nf, .cm-def { color: var(--frost) !important; }
div.output_text, div.output_text pre { color: var(--nord4) !important; }
div.output_html { color: var(--nord4) !important; }
div.output_html table { border-collapse: collapse !important; width: 100% !important; }
div.output_html th { background: var(--nord2) !important; color: var(--nord6) !important; padding: 6px 10px !important; border-bottom: 2px solid var(--nord3) !important; text-align: left !important; font-size: 12px !important; }
div.output_html td { padding: 4px 10px !important; border-bottom: 1px solid var(--nord2) !important; font-size: 12px !important; color: var(--nord4) !important; }
div.output_html tr:hover td { background: rgba(136, 192, 208, 0.05) !important; }
.rendered_html h1, .rendered_html h2, .rendered_html h3, .rendered_html h4 { color: var(--nord6) !important; }
.rendered_html p, .rendered_html li { color: var(--nord4) !important; }
.rendered_html a { color: var(--frost) !important; }
.rendered_html code { background: var(--nord2) !important; color: var(--frost-warm) !important; padding: 1px 4px !important; border-radius: 3px !important; }
div.output_png, div.output_jpeg { text-align: center; }
div.output_stderr, div.output_stderr pre { color: var(--aurora-red) !important; background: rgba(191, 97, 106, 0.1) !important; }
#notebook { padding: 0 !important; }
.container { width: 100% !important; max-width: 860px !important; padding: 0 !important; }
"""


def build_session_page(session_dir: Path, session_date: str) -> dict | None:
    """Convert a session directory into HTML. Returns session metadata for the index."""
    log_file = session_dir / "coursework-ai-experiment-log.md"
    if not log_file.exists():
        print(f"  SKIP: no experiment log in {session_dir}")
        return None

    log_text = log_file.read_text()

    # Parse frontmatter
    frontmatter = {}
    if log_text.startswith("---"):
        parts = log_text.split("---", 2)
        if len(parts) >= 3:
            for line in parts[1].strip().split("\n"):
                if ":" in line and not line.strip().startswith("-"):
                    key, val = line.split(":", 1)
                    frontmatter[key.strip()] = val.strip().strip("'\"")
            log_text = parts[2]

    course_key = frontmatter.get("course", "").lower().replace(" ", "-").split("-")[0:2]
    course_key = "-".join(course_key) if course_key else "unknown"

    course_info = COURSES.get(course_key, {"code": "Unknown", "title": "Unknown", "color": "#4C566A"})

    # Convert markdown to HTML
    log_html = md.render(log_text)

    # Check for notebook
    notebooks = list(session_dir.glob("*.ipynb"))
    notebook_html_name = None

    if notebooks:
        nb = notebooks[0]
        notebook_html_name = nb.stem + ".html"
        convert_notebook(nb, LEARNING_DIR / session_date / notebook_html_name)

    # Check for other markdown artifacts
    artifacts = []
    for md_file in session_dir.glob("*.md"):
        if md_file.name == "coursework-ai-experiment-log.md":
            continue
        if md_file.name == "CHAT_LOG_README.md":
            continue
        artifacts.append({
            "name": md_file.stem.replace("-", " ").title(),
            "file": md_file.name,
            "type": "document",
        })

    # Build artifact cards HTML
    artifact_html = ""
    if notebook_html_name or artifacts:
        cards = []
        if notebook_html_name:
            cards.append(f"""
            <a class="artifact-card" href="{notebook_html_name}">
              <div class="artifact-type">Jupyter Notebook</div>
              <div class="artifact-name">SPSS Assignment 1</div>
              <div class="artifact-desc">Full analysis notebook with code and output</div>
            </a>""")

        for art in artifacts:
            cards.append(f"""
            <a class="artifact-card" href="https://github.com/3v3rything15fine/this15fine.dev/blob/main/public/learning/{session_date}/{art['file']}" target="_blank" rel="noopener">
              <div class="artifact-type">{art['type']}</div>
              <div class="artifact-name">{art['name']}</div>
              <div class="artifact-desc">View on GitHub</div>
            </a>""")

        artifact_html = f'<h2>Session Artifacts</h2>\n<div class="artifact-grid">{"".join(cards)}</div>'

    # Build the page
    body = f"""
    <nav class="breadcrumb">
      <a href="/">this15fine.dev</a> /
      <a href="/learning/">learning</a> /
      {session_date}
    </nav>

    <h1>{frontmatter.get('title', 'AI-Assisted Coursework Session')}</h1>

    <div class="session-meta">
      <div class="meta-item">
        <span class="meta-label">Date</span>
        <span class="meta-value">{session_date}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Course</span>
        <span class="meta-value" style="color: {course_info['color']}">{course_info['code']} — {course_info['title']}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Source</span>
        <span class="meta-value"><a href="https://github.com/3v3rything15fine/this15fine.dev/tree/main/public/learning/{session_date}" target="_blank" rel="noopener">GitHub</a></span>
      </div>
    </div>

    <article>
      {log_html}
    </article>

    {artifact_html}

    <footer class="footer">
      <p><a href="/">this15fine.dev</a> &middot; <a href="/learning/">learning</a></p>
      <p style="margin-top: 8px; font-size: 11px;">AI Disclosure: This content was composed with AI assistance.
      Content has been reviewed for accuracy and FERPA compliance.</p>
    </footer>
    """

    # Write session page
    out_dir = LEARNING_DIR / session_date
    out_dir.mkdir(parents=True, exist_ok=True)

    page_html = PAGE_TEMPLATE.format(
        title=f"Session {session_date}",
        css=SHARED_CSS,
        body=body,
    )
    (out_dir / "index.html").write_text(page_html)

    # Copy markdown artifacts for GitHub viewing
    for md_file in session_dir.glob("*.md"):
        if md_file.name != "CHAT_LOG_README.md":
            (out_dir / md_file.name).write_text(md_file.read_text())

    print(f"  Session page: learning/{session_date}/index.html")

    # Extract a summary for the index
    summary = extract_summary(log_text)
    tags = extract_tags(log_text)

    return {
        "date": session_date,
        "title": frontmatter.get("title", "AI-Assisted Coursework Session"),
        "course": course_info,
        "course_key": course_key,
        "summary": summary,
        "tags": tags,
        "has_notebook": notebook_html_name is not None,
    }


def convert_notebook(nb_path: Path, output_path: Path):
    """Convert a Jupyter notebook to Nord-styled HTML."""
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Use nbconvert to get base HTML
    result = subprocess.run(
        ["jupyter-nbconvert", "--to", "html", "--stdout", str(nb_path)],
        capture_output=True, text=True,
    )

    if result.returncode != 0:
        print(f"  WARN: nbconvert failed for {nb_path}: {result.stderr[:200]}")
        return

    html = result.stdout

    # Inject Nord CSS before </head>
    nord_style = f"<style>\n{NOTEBOOK_CSS}\n</style>"
    html = html.replace("</head>", f"{nord_style}\n</head>")

    # Add breadcrumb navigation at top of body
    session_date = output_path.parent.name
    breadcrumb = f"""
    <div style="background: var(--nord1); padding: 12px 24px; border-bottom: 1px solid var(--nord3);
                font-family: 'JetBrains Mono', monospace; font-size: 12px;">
      <a href="/" style="color: var(--frost-deep); text-decoration: none;">this15fine.dev</a> /
      <a href="/learning/" style="color: var(--frost-deep); text-decoration: none;">learning</a> /
      <a href="/learning/{session_date}/" style="color: var(--frost-deep); text-decoration: none;">{session_date}</a> /
      <span style="color: var(--nord3);">notebook</span>
    </div>
    """
    html = html.replace("<body>", f"<body>{breadcrumb}")
    html = html.replace("<body ", f"<body style=\"background: #1e2430;\" ")

    output_path.write_text(html)
    print(f"  Notebook: learning/{session_date}/{output_path.name}")


def extract_summary(log_text: str) -> str:
    """Pull a one-line summary from the experiment log."""
    # Look for the experiment description
    for line in log_text.split("\n"):
        line = line.strip()
        if line.startswith("Jason is demonstrating"):
            return line
        if line.startswith("This log documents"):
            return line
    return "AI-assisted coursework session documented with full transparency."


def extract_tags(log_text: str) -> list[str]:
    """Extract topic tags from the log content."""
    tags = set()
    tag_keywords = {
        "cronbach": "reliability",
        "alpha": "reliability",
        "missing data": "missing-data",
        "mcar": "missing-data",
        "regression": "regression",
        "notebook": "jupyter",
        "python": "python",
        "spss": "spss-alternative",
        "reflection": "reading-reflection",
        "zotero": "zotero",
        "scale score": "scale-construction",
    }
    lower = log_text.lower()
    for keyword, tag in tag_keywords.items():
        if keyword in lower:
            tags.add(tag)
    return sorted(tags)


def build_index(sessions: list[dict]):
    """Generate the /learning/ index page."""
    # Sort sessions newest-first
    sessions.sort(key=lambda s: s["date"], reverse=True)

    timeline_html = ""
    for s in sessions:
        color = s["course"]["color"]
        tags = "".join(f'<span class="timeline-tag">{t}</span>' for t in s["tags"])

        artifacts = []
        if s["has_notebook"]:
            artifacts.append("notebook")
        artifacts.append("experiment log")
        artifact_str = " + ".join(artifacts)

        timeline_html += f"""
        <a class="timeline-card" href="/learning/{s['date']}/">
          <div class="timeline-accent" style="background: {color}"></div>
          <div class="timeline-body">
            <div class="timeline-date">{format_date(s['date'])} &middot; {s['course']['code']}</div>
            <div class="timeline-title">{s['title']}</div>
            <div class="timeline-desc">{s['summary']}</div>
            <div style="font-size: 11px; color: var(--nord3); margin-bottom: 8px;">{artifact_str}</div>
            <div class="timeline-tags">{tags}</div>
          </div>
        </a>
        """

    body = f"""
    <nav class="breadcrumb">
      <a href="/">this15fine.dev</a> / learning
    </nav>

    <h1>Learning</h1>
    <p class="hero-subtitle">Documenting AI-assisted PhD coursework — the process is the deliverable.</p>

    <div class="experiment-frame">
      <p>A doctoral student who understands broad concepts guides an AI through completing
      graduate-level work. The benchmark: understanding the concepts well enough to know
      what needs to be done, explain why, guide how, and catch when something looks wrong.</p>
      <p style="margin-bottom: 0;">Every session is documented with full transparency — experiment logs, code notebooks,
      reading reflections, and version histories. All source materials are available on
      <a href="https://github.com/3v3rything15fine/this15fine.dev/tree/main/public/learning" target="_blank" rel="noopener">GitHub</a>.</p>
    </div>

    <h2 style="margin-top: 0;">Sessions</h2>
    <div class="session-timeline">
      {timeline_html}
    </div>

    <footer class="footer">
      <p><a href="/">this15fine.dev</a> &middot; learning</p>
      <p style="margin-top: 8px; font-size: 11px;">AI Disclosure: This content was composed with AI assistance.
      Content has been reviewed for accuracy and FERPA compliance.</p>
    </footer>
    """

    page = PAGE_TEMPLATE.format(
        title="Learning",
        css=SHARED_CSS,
        body=body,
    )
    LEARNING_DIR.mkdir(parents=True, exist_ok=True)
    (LEARNING_DIR / "index.html").write_text(page)
    print(f"  Index: learning/index.html ({len(sessions)} sessions)")


def format_date(date_str: str) -> str:
    """Format YYYY-MM-DD to human readable."""
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        return dt.strftime("%B %d, %Y")
    except ValueError:
        return date_str


def main():
    print("[build-learning] Building /learning/ section...")

    sessions = []

    for archive_dir in ARCHIVE_DIRS:
        if not archive_dir.exists():
            print(f"  WARN: archive dir not found: {archive_dir}")
            continue

        for session_dir in sorted(archive_dir.iterdir()):
            if not session_dir.is_dir() or not session_dir.name.startswith("session-"):
                continue

            date = session_dir.name.replace("session-", "")
            print(f"  Processing session {date}...")

            meta = build_session_page(session_dir, date)
            if meta:
                sessions.append(meta)

    build_index(sessions)
    print(f"[build-learning] Done. {len(sessions)} sessions built.")


if __name__ == "__main__":
    main()
