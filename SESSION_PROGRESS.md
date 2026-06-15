# Rate My Sports Take — Session Progress

## Overview

This document summarizes features built and bugs fixed during this development session. All changes are on `main` and deployed.

---

## Features Built

### 1. Bell-Curve Grading Mode for NFL Analysts
**Commits:** `b135a5b`, `8db7fe6`
**Files:** `src/lib/takescore.ts`, `src/app/experts/page.tsx`, `supabase/migrations/012_curve_mode_flag.sql`

Added a toggleable "grade on a curve" mode that re-ranks NFL analyst TakeScores relative to their peer group instead of showing raw absolute scores.

- New `computeCurvedGrades()` function in `src/lib/takescore.ts` — pure function mapping a pool of analyst scores to letter grades via z-score standard deviation breakpoints:
  - ≥ +2.0 SD → A, ≥ +1.5 → B+, ≥ +1.0 → B, ≥ +0.5 → B−, ≥ 0.0 → C+, ≥ −0.5 → C, ≥ −1.0 → C−, ≥ −1.5 → D, < −1.5 → F
- Curve always computed relative to the **full verified NFL analyst pool**, regardless of what sport filter is active
- Non-NFL analysts always show their raw grade even when curve mode is on
- Raw `overall_rating` and individual take scores are **never modified**
- Toggle lives in the existing admin Feature Flags panel (`curve_mode_enabled`, default: off)
- When on, a small **CURVED** pill appears in the TAKESCORE column header on the leaderboard

---

### 2. Fantasy Leaderboard "Coming Soon" Overlay
**Commit:** `4d4ede0`
**Files:** `src/app/fantasy/page.tsx`

Added a toggleable Coming Soon overlay to the Fantasy Gurus leaderboard page for when the fantasy scoring isn't ready for public view.

- Controlled via the existing Feature Flags admin panel (`fantasy_coming_soon`, default: off)
- When on: page content blurs behind a rotated red "COMING SOON" stamp overlay
- When off: page displays normally
- No data is hidden or skipped — purely a display layer

---

### 3. Fantasy Expert Takes on Admin Profile Page
**Commit:** `cf892a0`
**Files:** `src/app/admin/experts/[id]/edit/FantasyExpertTakesPanel.tsx`, `src/app/admin/experts/[id]/edit/page.tsx`

Fixed fantasy gurus showing zero takes on their admin profile edit page, and built a full fantasy-specific takes panel.

- **Root cause:** `ExpertTakesPanel` was querying the `takes` table, but fantasy gurus store all their takes in `fantasy_takes`
- **Fix:** Edit page now checks `is_fantasy_guru` and renders `FantasyExpertTakesPanel` instead
- New `FantasyExpertTakesPanel` component features:
  - Loads takes via `getFantasyTakesForExpert()` (existing server action)
  - Shows category badge, player name/position, format tag (dynasty/redraft/both), resolution date badge, outcome status, accuracy score
  - Rate ✦, Grade, Edit, and Delete buttons wired to fantasy-specific actions
  - Edit drawer with boldness, accuracy, resolution date, outcome, and grading criteria fields
  - All (N) / Pending / Resolved / Unrated filter tabs

---

### 4. Eval Lab — Classifier Training Tool
**Commits:** `f2adac7`, `a4bb9f7`
**Files:** `src/app/admin/eval-lab/`, `src/app/api/admin/classify-tweet/`, `src/app/api/admin/eval-label/`, `src/app/api/admin/eval-labels/`, `supabase/migrations/013_classifier_eval_tables.sql`

Built a full tweet labeling tool at `/admin/eval-lab` for building classifier training/evaluation datasets.

**Page layout:**
- **Mode toggle** — 🏈 Fantasy Takes / 📊 Standard Takes; switching resets state and refreshes table
- **Tweet input** — large textarea with ⌘+Enter shortcut to classify
- **Classifier result panel** — shows is-take verdict, confidence %, summary, category, player/subjects, grading criteria, boldness, content type, season, flags
- **Label section** — YES / NO / GRAY buttons (auto-pre-selected from classifier output, overridable), "Why" reasoning textarea
- **Saved examples table** — last 20 rows with label badge, truncated tweet, why note, date, delete button
- Clears and shows green "Saved!" toast after each save

**API routes:**
- `POST /api/admin/classify-tweet` — calls Anthropic claude-haiku-4-5 with the **exact same system prompts** as `pipeline.py` (`CLASSIFY_SYSTEM` for standard, `FANTASY_CLASSIFY_SYSTEM` for fantasy)
- `POST /api/admin/eval-label` — inserts into `fantasy_classifier_eval` or `standard_classifier_eval`
- `GET /api/admin/eval-labels?mode=` — returns last 20 rows
- `DELETE /api/admin/eval-labels` — removes a row by id

**Database tables** (create via Supabase SQL editor if not yet run):
```sql
CREATE TABLE IF NOT EXISTS fantasy_classifier_eval (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tweet_text text NOT NULL,
  your_label text NOT NULL CHECK (your_label IN ('yes', 'no', 'gray')),
  why text,
  classifier_result jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS standard_classifier_eval (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tweet_text text NOT NULL,
  your_label text NOT NULL CHECK (your_label IN ('yes', 'no', 'gray')),
  why text,
  classifier_result jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE fantasy_classifier_eval  ENABLE ROW LEVEL SECURITY;
ALTER TABLE standard_classifier_eval ENABLE ROW LEVEL SECURITY;
```

---

## Bugs Fixed

### Re-rate Not Populating Grading Criteria (Fantasy Takes)
**Commit:** `3a581f9`
**File:** `src/app/admin/takes/AdminTakesDashboard.tsx`

`handleAiRate` was only writing `boldness_score` back to local state after a successful re-rate, completely ignoring `grading_criteria` even though the server action returned it. Fixed to update both fields, and close the edit panel if open so it re-mounts with the fresh values.

---

### Source URL Not Shown on Expert Admin Profile
**Commit:** `868a9fc`
**File:** `src/app/admin/experts/[id]/edit/ExpertTakesPanel.tsx`

The `source_url` field was already fetched and in the `AdminTake` type but never rendered. Added a "View source ↗" link next to the date/boldness line on each take card.

---

### Daily Intake Pipeline Failing for Emmanuel Acho
**Commit:** `669d92c` (on `trekker10/sports-take-pipeline`)
**File:** `pipeline.py`

The Apify tweet-scraper actor intermittently returns the `author` field as a list (`[{...}]`) instead of a plain dict (`{...}`). When `author.get("name")` was called on a list, Python threw `'list' object has no attribute 'get'`, crashing that expert and failing the whole run. Added an `isinstance(author, list)` check to safely unwrap before calling `.get()`.

---

### Classifier JSON Parse Failing on Emoji / Markdown Responses
**Commit:** `a4bb9f7`
**File:** `src/app/api/admin/classify-tweet/route.ts`

The original markdown-stripping regex (`.replace(/^```json?\n?/, "")`) was too brittle — Claude Haiku occasionally wraps its JSON in a code fence or adds a preamble sentence, which left unparseable text. Replaced with a `text.match(/\{[\s\S]*\}/)` extraction that grabs the first JSON object regardless of surrounding content.

---

## Database Migrations Added

| Migration | Description |
|-----------|-------------|
| `012_curve_mode_flag.sql` | Inserts `curve_mode_enabled` feature flag (default: off) |
| `013_classifier_eval_tables.sql` | Defines `fantasy_classifier_eval` and `standard_classifier_eval` tables |

---

## Admin Sidebar — New Links

| Label | Route | Section |
|-------|-------|---------|
| Eval Lab | `/admin/eval-lab` | Grading |

---

*Last updated: 2026-06-10*
