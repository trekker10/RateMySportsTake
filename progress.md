# RateMySportsTake — Progress Log

## What We've Built

### Fantasy Football Takes System
- **Fantasy take cards** on expert profile pages (fantasy gurus): category badge, player info, verdict, boldness, resolution date
- **Paginated take log** — shows 4 initially, "See all N takes →" expands inline
- **Verdict filter chips** (All / Right / Wrong / Pending) on fantasy profiles
- **Fantasy Take Context page** at `/fantasy-takes/[id]`: shows the full take, source tweet link (auto-extracted from t.co in raw_text if not stored), grading criteria, boldness/accuracy scores, verdict + grader note
- **Fantasy receipt image** at `/api/fantasy-receipt/[takeId]`: 1080×1080 shareable card with analyst name, quote, grade, verdict. Fixes: TTF fonts (not WOFF2), sanitized newlines/emoji, full-bleed layout
- **Share Receipt modal** on every fantasy take card: copy image or download PNG, same as analyst receipts
- **SEE FULL CONTEXT** button on every fantasy take card linking to the context page
- **Accuracy score fully dynamic** (0–100, any integer) instead of fixed tiers
- **Category labels** formatted as Title Case (e.g. `season_projection` → "Season Projection")

### Fantasy Takes Admin Panel
- **AI Rate it ✦** button per take — sets boldness score + grading criteria via AI
- **Re-rate ✦** button — re-runs rating, always corrects sport_season and resolution_date
- **AI Grade it ✦** button — web-search grading with dynamic accuracy score
- **Grade all pending** bulk button with live X/N progress counter
- **Rate all unrated** bulk button with live X/N progress counter  
- **Select all / Deselect all** in bulk action bar
- **ResolveBadge** on each take row (Overdue / Soon / Resolves / Today) matching analyst panel
- **FantasyEditPanel redesigned** to match analyst edit layout
- **Source URL pre-populated** from t.co link in raw_text if not explicitly stored
- **Resolution date now AI-driven** using `fantasy_take_resolution_guidelines.md` (Jan 7 for season-long, weekly end for start/sit, age-based for dynasty/career)

### Expert Profile Pages
- **Slug-based URLs** — `/experts/dynastydadff` instead of `/experts/uuid`. Old UUID URLs still work.
- **FLEX + K/DST removed** from fantasy guru position report card (now QB/RB/WR/TE only)
- **See All Takes** button fixed
- **RECEIPTS stat** is clickable, links to flip-flops page, red when count > 0
- **Position report card** for fantasy gurus
- **Check for duplicates** button — finds same-URL and semantically similar takes via AI, shows flagged groups with Graded/Scored status and Delete buttons per take

### Analyst Takes
- **Flip-flop contradiction detector** — AI detects when analyst contradicted themselves within 365 days
- **Mean/Median aggregation toggle** in TakeScore Admin
- **Receipt image** redesign: full-width portrait, AI-generated pending teasers, grading criteria section, dynamic font sizing
- **Resolution date now AI-driven** using `analyst_take_resolution_guidelines.md` (sport-specific: Feb 1 NFL, Jun 30 NBA, Nov 1 MLB, Jul 1 NHL, age-based for career takes)

### Takes Review Admin
- **Date Added sort** — default sort; sorts by when take entered the system (`date_submitted`/`created_at`), not tweet date
- **Fantasy takes sort bar** — Date Added · Date Made · Resolves · Guru
- **Added Today dashboard stat** fixed — now counts by system insertion date, not tweet date
- **NOT RATED YET badge rules**: hidden when grade != null OR (grading_criteria + time_horizon_date both set) OR rating_status = 'rated'
- **Rate it button** follows same rules — doesn't show if take is already effectively rated
- **Grade it button stays visible** after Rate it completes (no page reload needed)
- **Mobile take cards** reflowed: name + meta + buttons on top row (wrapping), full take text below full-width

### Admin Portal
- **Dashboard stats** — "Today at a Glance": takes added today (by insertion date), total graded, review queue
- **Sidebar navigation** — grouped sections, active highlighting, amber badge on Review Takes
- **Mobile collapsible sidebar** — hamburger button slides in drawer on mobile, closes on nav or backdrop tap
- **Show Accounts** page at `/admin/show-accounts`: manage X/Twitter show accounts
- **Public API** at `/api/show-accounts`
- **Browse Takes** removed from sidebar

### Homepage & Navigation
- **Leaderboard ribbon** — slow-scrolling ticker of Top 10 analysts
- **Mobile homepage spacing** fixes

### Python Pipeline
- **48hr cutoff enforced client-side** — Apify's `since=` is date-only so tweets are filtered by exact datetime after fetching. Drops tweets older than 48 hours. `max_tweets` reduced to 30 for daily runs.

### Resolution Guidelines
- `src/lib/ai/guidelines/analyst_take_resolution_guidelines.md` — sport-specific resolution dates for analyst takes
- `src/lib/ai/guidelines/fantasy_take_resolution_guidelines.md` — fantasy-specific resolution dates (weekly, season-long, dynasty, career, ADP, etc.)

---

## SQL Migrations Run

- ✅ `show_accounts` table created
- ✅ `alter table experts add column if not exists slug text;` + index + populate from twitter_handle
- ✅ `alter table experts add column if not exists is_fantasy_guru boolean default false;`
- ✅ `alter table fantasy_takes add column if not exists source_url text;`
- ✅ `alter table take_score_config add column if not exists aggregation_method text not null default 'mean';`
- ✅ `flip_flops` table creation
- ✅ `update takes set rating_status = 'rated' where rating_status != 'rated' and grade is not null;`
- ✅ `update takes set rating_status = 'rated' where rating_status != 'rated' and grading_criteria is not null and time_horizon_date is not null;`

---

## What's Left / Pending

### Immediate
- [ ] **Bulk re-rate all fantasy takes** to fix stale "2025 NFL" sport_season labels

### Features to Build
- [ ] **Scraper attribution logic** — when a tweet from a show account quotes an analyst, attribute the take to the analyst
- [ ] **Fantasy take import flow** — bulk import from show accounts / Twitter scrape directly in admin
- [ ] **TakeScore lifetime sparkline** — currently a placeholder SVG; wire up real historical data
- [ ] **Expert edit page** improvements — slug field editable in admin, allow manual override
- [ ] **Accolades display** on expert profiles (auto-computed badges like "Elite Analyst", "Dead Eye", etc.)
- [ ] **Fantasy leaderboard** on the /fantasy page — ranked list of fantasy gurus by overall grade
- [ ] **Public take submission** — allow users to submit takes for experts (currently admin-only)
- [ ] **Follow feed** — logged-in users see takes from analysts they follow
