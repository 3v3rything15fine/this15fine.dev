---
title: SPSS Assignment 1 — Interpretive Review
tags:
  - course-work
  - ci-7303
  - review
created: '2026-03-22'
---
# SPSS Assignment 1 — Let's Talk Through the Interpretations

The notebook is done but I wrote all the interpretations without checking your understanding first. Let's fix that. Below is the actual output from each section, followed by the interpretation I wrote. We need to talk through whether YOU would have arrived at each conclusion.

---

## Decision 1: Descriptive Statistics — Spotting the Problems

**What the data showed:**

| Item | Min | Max | Note |
|------|-----|-----|------|
| sect18_2 | 1.0 | **9.0** | Scale is 1–5 |
| sft71_2 | **0.0** | 5.0 | Scale is 1–5 |

**What I wrote:** These are non-plausible values (data entry errors) that need to be recoded to missing before reliability analysis.

**Question for you:** If you were looking at a descriptives table and saw a max of 9 on a 1–5 scale, would you have caught that? What about the 0 minimum — is it obvious to you that 0 is out of range if the scale starts at 1?%%yep%%

---

## Decision 2: Missing Data — "Is This a Problem?"

**What the data showed:**

| Variable | Missing | Pct |
|----------|---------|-----|
| sect21_2 | 7 | 1.8% |
| sft74_2 | 13 | 3.4% |
| Exam_Score | 30 | 7.8% |
| Homework_Score | 5 | 1.3% |

**What I wrote:** Missing data is minimal and appears random — no special handling needed beyond default listwise deletion.

**Question for you:** When does missing data become a problem? At what percentage would you start worrying? And do you know the difference between MCAR, MAR, and MNAR? (No wrong answer — just calibrating.)%%mcar and mnar can prob be dealt with, mar is probably a bigger issue. Right?%%

---

## Decision 3: Reliability — SECT Scale

**Output:**
- Cronbach's alpha = .856 (8 items)
- All alpha-if-deleted values are LOWER than .856
- Corrected item-total correlations: .58 to .65

**What I wrote:** Good reliability. No items weaken the scale. Every item contributes.

**Question for you:** What does it mean that all the alpha-if-deleted values are lower than the overall alpha? In plain language, what's the test telling us about each item?%%it shows the items work better together%%

---

## Decision 4: Reliability — SFT Scale (this is the interesting one)

**Output:**
- Cronbach's alpha = .663 (5 items)
- All alpha-if-deleted values are LOWER than .663
- Corrected item-total correlations: .39 to .43

**What I wrote:** Below the .70 threshold, but the low alpha is likely due to having only 5 items rather than poor item quality. No single item is dragging the scale down.

**Question for you:** If a colleague showed you an alpha of .663 and asked "is this scale any good?" — what would you say? Would you recommend dropping items? Adding items? Using a different reliability measure? This is the one where I want to hear your thinking before we finalize the interpretation.%%I would ask for all the data, like the corrected values, and check to see if anything looked obviously wacky. If not, I’d tell them that it’s likely just needing a few more items to really z in on the construct in question. %%

---

## Decision 5: Scale Score Creation

**What I did:** Computed mean scores (not sum scores) for both scales.

**Question for you:** Why mean instead of sum? The handout recommends mean — do you know the practical reason? %%mean is interpretable with the scale key%%

---

*Reply to whichever of these you want to start with. We can go in order or jump to whatever feels least clear.*
