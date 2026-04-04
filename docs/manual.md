# How This System Works

```node:claude-code
title: Claude Code
type: agent
icon: 🤖
color: frost
description: CLI agent for local filesystem work. Research pipeline, vault operations, code, and analysis. Context loads from project-level CLAUDE.md.
commands: [/ingest, /lit-search, /cite, search_hybrid, search_text]
files: [~/.claude/CLAUDE.md, ~/.claude.json]
related-section: research-workflow
```

```node:gemini-cli
title: Gemini CLI
type: agent
icon: 💬
color: frost
description: CLI agent for Google Workspace. Drive, Docs, Calendar, and email. Context from GEMINI.md.
commands: [gemini]
files: [~/.gemini/GEMINI.md]
related-section: maintenance
```

```node:zotero
title: Zotero
type: system
icon: 📚
color: frost-deep
description: Reference manager and canonical PDF store. Library ID 13099250. Syncs PDFs to iOS via Zotero Storage.
commands: [zotero-mcp serve]
files: [~/Zotero/storage/]
related-section: research-workflow
```

```node:obsidian
title: Obsidian Vault
type: system
icon: 🧠
color: frost-deep
description: Knowledge graph at ~/brain-external/. Synced via Obsidian Sync. 14 inquiry hubs, ~404 reference notes.
files: [~/brain-external/]
related-section: vault-habits
```

```node:research-db
title: Research DB
type: system
icon: 🔍
color: frost-deep
description: 253 papers, 6,657 chunks. FTS5 keyword search and sqlite-vec semantic search with Reciprocal Rank Fusion. Lives at ~/projects/research-library/research.db.
files: [~/projects/research-library/research.db, ~/projects/research-library/research_db.py]
related-section: research-workflow
```

```node:google-drive
title: Google Drive
type: system
icon: ☁️
color: frost-deep
description: rclone FUSE mount at ~/google-drive/. Bidirectional sync via systemd service. Starts on boot.
files: [~/google-drive/]
related-section: maintenance
```

```node:discover
title: Discover
type: pipeline
icon: 🔎
color: aurora-green
description: Find papers via /lit-search (Semantic Scholar + Crossref), Zotero Connector in browser, or manual discovery from conferences and colleagues.
related-section: research-workflow
```

```node:cite
title: Save Citation
type: pipeline
icon: 📎
color: aurora-green
description: Save citation to Zotero via the browser connector. Captures metadata, tags, and collection assignment.
related-section: research-workflow
```

```node:ezproxy
title: EZProxy Download
type: pipeline
icon: 🔐
color: aurora-green
description: Download PDF through TXST EZProxy using Shibboleth SSO. Cookies expire every 8-12 hours.
related-section: research-workflow
```

```node:attach
title: Attach PDF
type: pipeline
icon: 📄
color: aurora-green
description: Attach downloaded PDF to the Zotero item via pyzotero API. File lands in ~/Zotero/storage/ and syncs to iOS.
related-section: research-workflow
```

```node:extract
title: Extract Text
type: pipeline
icon: 📝
color: aurora-green
description: Extract text via PyMuPDF. Detects sections and creates ~1000-token chunks. Stores in research.db with FTS5 index.
related-section: research-workflow
```

```node:embed
title: Embed Chunks
type: pipeline
icon: 🧮
color: aurora-green
description: Embed chunks with all-MiniLM-L6-v2 (384-dim vectors) into the chunks_vec table for semantic search.
related-section: research-workflow
```

```node:vault-note
title: Create Reference Note
type: pipeline
icon: 🗒️
color: aurora-green
description: Create reference note at references/@citekey.md via Obsidian MCP. Includes frontmatter with status, themes, and citekey.
related-section: vault-habits
```

```node:token-refresh
title: Google Token Refresh
type: automated
icon: 🔑
color: aurora-yellow
description: Refreshes Google OAuth access token non-interactively. Runs weekly on Wednesdays at 3am via systemd timer.
related-section: maintenance
```

```node:obsidian-sync
title: Obsidian Sync
type: automated
icon: 🔄
color: aurora-yellow
description: Automatic vault synchronization. No manual intervention needed.
related-section: maintenance
```

```node:zotero-sync
title: Zotero Storage Sync
type: automated
icon: 🔄
color: aurora-yellow
description: Automatic PDF sync to cloud and iOS. Requires Zotero desktop to be running.
related-section: maintenance
```

```node:pika-backup
title: Pika Backup
type: automated
icon: 💾
color: aurora-yellow
description: Automated local backup. No manual intervention needed.
related-section: maintenance
```

---

## Research Workflow

### Finding papers

Three entry points:

1. `/lit-search` in Claude Code. Searches Semantic Scholar and Crossref. Good for targeted queries when you know roughly what you want.
2. Zotero Connector in the browser. Save citations directly from publisher pages, Google Scholar, or library databases.
3. Manual discovery. Conferences, colleague recommendations, reading lists.

### Ingesting papers

After saving citations via Zotero Connector, run `/ingest` in Claude Code. The pipeline:

1. Detects new Zotero items not yet in the research DB.
2. Assigns domain folders (you confirm).
3. Downloads PDFs through TXST EZProxy.
4. Attaches each PDF to its Zotero item (cloud storage, syncs to iPad).
5. Extracts text into research.db (sections, chunks, FTS5 index).
6. Embeds chunks for semantic search.
7. Creates a reference note in the vault.

If EZProxy cookies expire mid-batch, the pipeline stops and tells you to re-authenticate. Run the login script from Claude Code, complete SSO in the browser, and resume.

```bash
python ~/projects/research-library/ezproxy_login.py --login
```

### Searching the literature

Two search modes in `research_db.py`:

- `search_text(conn, "query")` runs keyword search with BM25 ranking. Good when you know the terminology.
- `search_hybrid(conn, "query")` combines keyword and semantic search via Reciprocal Rank Fusion. Finds conceptually related passages even when they use different vocabulary.

Hybrid search is the better default. The first call takes a few seconds to load the embedding model. Subsequent calls in the same session are fast.

For broad topic exploration, `/lit-search` queries external databases and finds papers not yet in your collection.

### Annotating on iPad

Zotero syncs PDFs to iOS automatically. Six-color annotation system:

| Color | Meaning |
|-------|---------|
| Yellow | Findings |
| Red | Methods |
| Green | Theory |
| Blue | Definitions |
| Purple | Gaps |
| Orange | Quotable |

These are Zotero's built-in colors. No plugin needed. The mapping also lives in `annotation-color-system.md` in the vault.

### Writing from research

The vault is for discovery, not synthesis. Reference notes are annotated bibliography entries: citation, summary, themes, method, findings. They link to inquiry hubs and concept notes. Synthesis happens in Google Docs, coursework, and writing sessions.

Use `/cite` to pull APA 7 citations from Zotero. Use `search_hybrid()` to find supporting evidence across the research DB.

---

## Vault Habits

### Linking with aliases

The 14 inquiry hub notes are the backbone of the vault. Each represents a research question. They connect to reference notes, concept notes, and each other.

All inquiry hubs and 12 key concept notes have aliases. When typing `[[` in Obsidian, alternate phrasings like "bounce back," "SDT," "bandwidth tax," or "Baxter Magolda" will surface the right note.

### Reference notes lifecycle

Reference notes live at `references/@citekey.md`. Created by `/ingest`. Each note starts with `status: unread` in frontmatter and moves through five stages:

1. **unread** - Freshly ingested. Not yet opened.
2. **reading** - Actively being read.
3. **growing** - Partially annotated. Key points captured.
4. **read** - Finished reading. Summary complete.
5. **annotated** - Full annotations integrated. Linked to inquiry hubs.

The reading dashboard (Bases view) tracks progress across all reference notes.

### Daily notes

Use for thinking, linking, and capturing ideas. When an idea connects to a research question, link the relevant inquiry hub. Aliases make this faster.

---

## Maintenance

### Things that run themselves

- **Google token refresh.** Wednesdays at 3am via systemd timer. If the refresh token itself expires (rare, only if revoked by Google), the timer logs a clear error.
- **Obsidian Sync.** Automatic. No intervention needed.
- **Zotero Storage sync.** Automatic when Zotero desktop is running.
- **Pika Backup.** Automated.
- **Google Drive mount.** rclone FUSE via systemd. Starts on boot.

### Things needing occasional attention

- **EZProxy cookies** expire every 8-12 hours. Re-authenticate when the ingest pipeline or a download fails. The `check_cookies_or_warn()` pre-flight catches this before wasting time on failed requests.
- **Zotero desktop** must be running for the Zotero MCP server to work. If Claude Code reports Zotero connection errors, check that the app is open.
- **Quarterly system review** is on the calendar (every 3 months starting July 4, 2026). The event description has a checklist.

### Things to avoid

- Do not write directly to `~/brain-external/` without specifying a path. The vault syncs via Obsidian Sync. Use the Obsidian MCP tools or provide an explicit path.
- Do not edit `~/.claude.json` unless adding or removing an MCP server.
- Do not mix fall and spring comparisons in any B3 analysis. The semesters differ structurally.

---

## Best Practices

### Start of session

Open Claude Code in the relevant project directory. For research work: `~/projects/research-library/`. For vault work: `~/brain-external/`. Context loads automatically from the local CLAUDE.md.

### Before writing

Load the writing voice skill (`/writing-voice`) or it loads automatically for human-facing output. Run the post-draft audit checklist against any draft before submitting. The checklist catches editorial modifiers, causal language violations, and SB17 compliance issues.

### After adding papers

Run `/ingest` promptly. Papers sitting in Zotero without extraction are invisible to the research DB and hybrid search. The pipeline takes about 30 seconds per paper.

### Search strategy

Start with `search_hybrid()`. If you need exact phrase matching or boolean logic, fall back to `search_text()`. For broad topic exploration, `/lit-search` queries external databases (Semantic Scholar + Crossref) and finds papers not yet in your collection.

### Troubleshooting

Check the system map recovery procedures first. For Google auth issues:

```bash
systemctl --user status google-token-refresh.service
```

For research DB issues:

```bash
python3 ~/projects/research-library/extract.py --stats
```

For vault issues, Obsidian Sync is the source of truth. Close Obsidian, delete `~/brain-external/`, reopen, and let it re-sync.

---

## Recovery Procedures

### Google auth (interactive)

Opens browser for OAuth consent. Use when the refresh token itself has expired or been revoked.

```bash
python3 ~/scripts/google-reauth.py
```

Writes token to `~/.config/google-api/token.json`.

### Google auth (non-interactive)

Uses existing refresh token to get a new access token. Runs automatically via timer but can be triggered manually.

```bash
python3 ~/scripts/google-token-refresh.py
```

Or trigger the systemd service directly:

```bash
systemctl --user start google-token-refresh.service
```

### Rebuild research.db

Full rebuild re-extracts all PDFs from `~/Zotero/storage/` into research.db.

```bash
cd ~/projects/research-library
python3 extract.py --rebuild
```

Then re-embed all chunks (~50 seconds):

```bash
python3 embed_chunks.py
```

Single paper extraction:

```bash
python3 extract.py /path/to/paper.pdf
```

### Restore Obsidian vault

1. Install Obsidian from Flathub or obsidian.md.
2. Open vault location: `~/brain-external/`.
3. Log into Obsidian Sync. Vault will repopulate automatically.
4. Verify: 14 inquiry hubs, ~404 reference notes, templates, bases.

### Reinstall Zotero

1. Install Zotero 7 from zotero.org or Flathub.
2. Settings > Sync > sign in. Enable Zotero Storage for file syncing.
3. Library syncs automatically (library ID 13099250).
4. API key for MCP is stored in `~/.claude.json` under `mcpServers.zotero.env.ZOTERO_API_KEY`.
5. Install zotero-mcp: `pip install zotero-mcp`.
6. Verify: `zotero-mcp serve` should connect to running Zotero desktop.
7. Annotation color scheme (built-in, no plugin): Yellow = Findings, Red = Methods, Green = Theory, Blue = Definitions, Purple = Gaps, Orange = Quotable.

### New machine setup

Ordered checklist:

1. Install Fedora (latest). GNOME + Wayland.
2. System packages: git, python3, pip, node, npm, rclone, ocrmypdf.
3. Install Ghostty. Apply Nord theme from `~/projects/nord_theme/`.
4. Install and configure NordVPN.
5. Restore SSH/GPG keys from backup or generate new.
6. Configure rclone remote. Install `google-drive.service` to `~/.config/systemd/user/`. Enable.
7. Copy `~/.config/google-api/` from backup, or run `google-reauth.py` for fresh tokens.
8. Copy `google-token-refresh.*` timer and service to `~/.config/systemd/user/`. Enable timer.
9. Python environment:
   ```bash
   pip install pymupdf sentence-transformers sqlite-vec
   ```
10. Install Zotero. Sign in. Enable Zotero Storage sync.
11. Install Obsidian. Open `~/brain-external/`. Sign in to Obsidian Sync.
12. Install Claude Code. Copy `~/.claude/` (CLAUDE.md, skills, memory, settings, keybindings). Copy `~/.claude.json`.
13. Install Gemini CLI. Copy `~/.gemini/GEMINI.md`.
14. Install gog CLI. Configure with Google API credentials.
15. Clone repos or restore `~/projects/` from backup.
16. If research.db not restored, rebuild: `python3 extract.py --rebuild && python3 embed_chunks.py`.
17. Install VS Code. Restore extensions and settings.
18. Install Pika Backup. Configure backup destination.
