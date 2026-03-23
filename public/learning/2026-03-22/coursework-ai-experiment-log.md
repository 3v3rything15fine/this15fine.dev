---
title: AI-Assisted Coursework Experiment Log
tags:
  - course-work
  - ci-7303
  - ai-experiment
  - meta
created: '2026-03-22'
purpose: Document every interaction in AI-assisted PhD coursework as proof-of-concept
course: CI 7303 - Psychometric Methods
git-tracked: true
---
# AI-Assisted Coursework Experiment Log

## The Experiment

Jason is demonstrating that a doctoral student who understands broad concepts can guide an AI through completing graduate-level work. The benchmark: he understands the concepts well enough to know what needs to be done, explain why, guide how, and catch when something looks wrong.

This log documents every major interaction — what was discussed, Jason's understanding, what was produced, and what clicked. The process IS the deliverable.

---

## Session 1 — 2026-03-22

### Session Setup
- **Time:** Evening, Mar 22
- **Assignments in scope:** SPSS Assignment 1 (due Mon Mar 23), Reading Reflection 4 (due Mon Mar 23)
- **Decision:** Start with SPSS Assignment 1 (all materials available; reflection waiting on Cohen chapter)
- **Tools:** Python/Jupyter (professor approved R and Python as alternatives to SPSS), pyreadstat for .sav data, Obsidian for documentation
- **Format:** Notebook serves as the submission — narrative + code + output in one place

### Preliminary Work
- **Reading list cataloged:** Subagent searched Zotero and academic databases for all CI 7303 readings. 6 articles found with DOIs for batch import. Cohen (2021) textbook chapter flagged as high priority — needs manual sourcing from library/Canvas.
- **Previous reflections converted:** Pandoc extracted text from .docx/.odt files to establish Jason's writing voice for the reflection.
- **SPSS handout converted:** Binary .docx converted to readable markdown. Assignment covers: descriptives, frequencies, missing data, outliers, reliability (Cronbach's alpha), alpha-if-item-deleted, scale score creation.

### Entry 1: SPSS Assignment 1 — Getting Started
- **Timestamp:** 2026-03-22
- **Topic:** Setting up the analysis environment and loading practice data
- **Status:** Beginning

---

*Log continues as session progresses...*


### Entry: Reading List Update
- **Timestamp:** 2026-03-22
- **Action:** Jason added sources to CI 7303 Zotero collection
- **Items added:** 3 PDFs added as standalone attachments:
  1. Cohen, Schneider, & Tobin (2021) "Test Development" chapter (key: J5KRJ2RS)
  2. Swing & Upcraft (2005) "Choosing and Using Assessment Instruments" (key: 7SCL2PC3)
  3. Weinstein & Palmer, LASSI Manual (key: CTLUBDJ3)
- **Still missing from Zotero (7 journal articles):**
  1. Mansfield et al. (2005) -- Barriers to Help Seeking Scale
  2. Nicolaidis et al. (2020) -- Accessible Survey Instruments
  3. Yilmaz/Giovanna -- Mindset Theory Scale
  4. Chen, Ding, & Liu (2021) -- Growth Mindset Scale
  5. Protogerou & Hagger (2020) -- Survey Quality Checklist
  6. Lee et al. (2017) -- SCASIM-St
  7. Osman & Warner (2020) -- Teacher Motivation
- **Also not in Zotero (on disk):** MSLQ manual, AEQ manual, TSIA 2.0 docs
- **Cohen (2021) status:** AVAILABLE. PDF is in Zotero as standalone attachment (key: J5KRJ2RS). Filename: `Psychological_Testing_and_Assessment_----_(8_Test_Development).pdf`. Ready for Reading Reflection 4 due 2026-03-23.
- **Note:** All 3 new items are standalone attachments without parent bibliographic records. Low-priority cleanup: create parent items in Zotero and add metadata.

### Entry 2: Cronbach's Alpha Discussion
- **Timestamp:** 2026-03-22
- **Concept discussed:** Cronbach's alpha — what it measures and its role in the analysis pipeline
- **Jason's initial understanding:** Alpha measures how related survey items are; useful for establishing reliability and for identifying problematic correlations before regression
- **Correction/reinforcement:** Core understanding confirmed. Corrected terminology (autocorrelation → multicollinearity). Reinforced that alpha is a lower-bound estimate and is sensitive to number of items. Connected alpha to the broader pipeline: alpha → composite scores → VIF for multicollinearity in regression models.
- **Key learning moment:** Jason correctly intuited that high inter-item correlation (signaled by alpha) would cause problems in regression if items were entered individually. The standard practice resolves this upstream by creating composite scores — which is exactly what the SPSS handout builds toward. The pipeline is one workflow, not disconnected steps.
- **Jason's question about alpha and regression:** "I was supposing that [alpha] would be a good signal of assumption-breaking correlations prior to running a logistic regression." — This shows strong conceptual reasoning across methods. The instinct is right; the standard tool mapping is alpha for scale building, VIF for regression diagnostics.

### Entry 3: SPSS Assignment 1 — Complete Draft
- **Timestamp:** 2026-03-22
- **Work produced:** Jupyter notebook at `~/Documents/CI 7303/SPSS_Assignment_1_OBrien_Jason.ipynb`
- **Analysis steps completed:**
  1. Data import and overview (384 obs, 19 vars, two item sets + outcomes)
  2. Descriptive statistics (means, SDs, frequencies for all items)
  3. Missing data analysis (4 variables with missingness, 1.3%–7.8%, random pattern)
  4. Non-plausible value detection (sect18_2=9, sft71_2=0 — both impossible on 1–5 scale)
  5. Data cleaning (recoded impossible values to NaN with documentation)
  6. Reliability analysis — SECT: α=.856 (good), SFT: α=.663 (below .70 threshold)
  7. Alpha-if-item-deleted analysis (no weak items in either scale)
  8. Scale score creation (mean scores for both scales)
  9. Final verification (missing data and outlier check on composites)
- **Key discussion — non-plausible values vs. outliers:**
  - Jason asked about best practices for handling impossible values
  - Distinction established: impossible values (9 on 1–5 scale) are data entry errors → recode to missing. Outliers (extreme but valid) are judgment calls.
  - Jason noted his B3 context (N=10K+) usually just excludes outliers; psychometrics with smaller N requires documenting *why* each value is removed
  - Professional consensus: do not impute impossible values — there is no "true score" to recover
- **Key discussion — alpha and regression (Entry 2):**
  - Jason connected alpha to multicollinearity detection — correct intuition, different standard tools
  - Pipeline: alpha → composite → VIF at the regression stage
- **Status:** Draft complete, awaiting Jason's review

### Entry 4: SPSS 1 Interpretive Review — Confirm/Reinforce Cycle
- **Timestamp:** 2026-03-22
- **What happened:** Walked through 5 interpretive decisions from the SPSS assignment, checking Jason's understanding before finalizing
- **Format:** Output + question posted to Obsidian (`for_jason/spss1-review-on-phone.md`) so Jason could review on mobile

**Decision-by-decision results:**

1. **Non-plausible values:** Jason would catch them; honestly noted he might not always check the codebook. Understanding confirmed.
2. **Missing data:** Strong practical instinct from data custodian experience — "missing data signals a bigger problem." Didn't have MCAR/MAR/MNAR vocabulary but had the right heuristic. Vocabulary added; connected MNAR to B3 attrition risk.
3. **Alpha-if-deleted:** Correct — each item's contribution to the outcome. Confirmed.
4. **SFT α = .663:** "Scale works, not super sensitive, other things at play" — connected to earlier item count discussion. Confirmed.
5. **Mean vs. sum:** Partially correct (inflation point). Added: mean stays on the original metric (interpretable), handles missing data better. Understanding reinforced.

- **Overall assessment:** Jason's statistical intuition is strong and practice-informed. Formal vocabulary is the main gap, not conceptual understanding. The confirm→reinforce cycle added real value — MCAR/MAR/MNAR distinction and the MNAR→B3 attrition connection were genuine learning moments.
- **Meta-note:** I initially skipped this step and wrote all interpretations without checking. Jason caught it and correctly pushed back. The Socratic cycle works when actually followed.

### Entry 5: SPSS 1 Review — Jason's Inline Comments
- **Timestamp:** 2026-03-22
- **What happened:** Jason left %%comments%% on the SPSS interpretive review note, responding to each of the 5 decisions.
- **Results:**
  - Decision 1 (non-plausible values): Confirmed. "yep"
  - Decision 2 (missing data): **Correction needed.** Jason had MCAR/MAR/MNAR ordering backwards, thinking MAR was the bigger problem. Corrected: MCAR is harmless, MAR is manageable, MNAR is the dangerous one. Connected MNAR to B3 attrition risk.
  - Decision 3 (SECT alpha-if-deleted): Confirmed. "it shows the items work better together"
  - Decision 4 (SFT α=.663): Strong answer. Would ask for diagnostic data, check for problems, attribute to item count if none found.
  - Decision 5 (mean vs. sum): Confirmed. "mean is interpretable with the scale key"
- **Learning moment:** MNAR is the key concept. Jason's B3 program has students who disengage and stop completing scales, which is textbook MNAR. This is a methodological concern for his dissertation.

### Entry 6: Reading Reflection 4 — Style Feedback and v2
- **Timestamp:** 2026-03-22
- **What happened:** Jason left extensive inline comments on the v1 draft identifying systemic style problems.
- **Key style corrections:**
  - No em dashes, ever. Any sentence needing one should be rewritten.
  - No blog voice. "Sounds obvious until you realize" is clickbait construction.
  - Declarative statements about interpretive things are sales writing. Reframe as interpretation.
  - McCarthy/Vonnegut punctuation style. Short declarative sentences. No ornament.
  - Target: between NYT and Science. Not blog, not wire.
  - "We communicate, we don't sell, ever, and we don't gain anything from reaching for parasocial connections."
- **Action taken:** Complete rewrite (v2). All em dashes eliminated. Opening rewritten for reporting tone. Empty rhetoric replaced with substantive statements.
- **v2 status:** No comments on v2. Approved.

### Entry 7: Transparency Infrastructure
- **Timestamp:** 2026-03-22
- **Action:** Created transparency archive at ~/Documents/CI 7303/ai-experiment-archive/
- **Contents:** Export script, session snapshot (experiment log, both drafts, notebook, chapter summaries, file versions)
- **AI disclosure updated** to reflect: Jason skimmed readings, iterative feedback cycle documented, full chat transcript and version history referenced
- **Jason's request:** Full chat log and all document versions included with submission for complete transparency
- **Git:** All materials committed with co-author attribution

### Entry 8: /coursework Skill Created
- **Timestamp:** 2026-03-22 (late evening)
- **Action:** Codified the entire session workflow into an invocable `/coursework` skill
- **Design decisions:**
  - Approach C selected: single directory skill + existing memory-based wrap-up protocol
  - Course configs inside skill directory (self-contained, no hunting across filesystem)
  - Experiment log stays in Obsidian (mobile access for review-on-phone workflow)
  - Skill absorbs reusable workflow; course configs hold specifics
- **Files created:**
  - `~/.claude/skills/coursework/SKILL.md` — main workflow (Socratic cycle, session flow)
  - `~/.claude/skills/coursework/courses/ci-7303.md` — psychometrics course config
  - `~/.claude/skills/coursework/courses/ci-7354.md` — qualitative course config
  - `~/.claude/skills/coursework/templates/experiment-log-entry.md` — structured log template
  - `~/.claude/skills/coursework/templates/ai-disclosure.md` — reusable disclosure block
- **Key insight:** Claude Code hooks are event-driven (Stop, PreToolCall), not keyword-driven. The existing memory-based "wrap up" protocol is the right mechanism for session close. No settings.json hook needed.
- **Learning moment:** The session prompt was a prototype. The skill is the production version. Adding a new course means dropping one config file.

### Session 1 Close
- **Submissions delivered:** SPSS Assignment 1 (.ipynb) and Reading Reflection 4 (.odt) to `~/google-drive/for_jason/ci7303-session-2026-03-22/`
- **Pending:** Jason eyeball review of SPSS notebook in the morning
- **Follow-up:** 7 journal article DOIs in `~/Documents/CI 7303/readings-inbox.md` for Zotero batch import
- **Memories saved this session:** `feedback_ai_coursework_stance.md`, `feedback_dont_assume_stats_competence.md`, `feedback_writing_style.md` (major update)
