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
- **FantasyEditPanel redesigned** to match analyst edit layout: source URL banner at top, take text + boldness/resolution date side-by-side, grading criteria full width, classification fields below, outcome/accuracy/grader note at bottom
- **Source URL pre-populated** from t.co link in raw_text if not explicitly stored
- Edit panel now stacks below the row (not as a side panel)
- **sport_season + resolution_date computed deterministically** (not AI):
  - Jan 1–Feb 14 → previous year's season (playoffs live)
  - Feb 15–Aug 31 → current calendar year's upcoming season  
  - Sep 1–Dec 31 → current year's season
  - e.g. take made June 2026 → "2026 NFL", resolves 2027-01-06

### Expert Profile Pages
- **Slug-based URLs** — `/experts/dynastydadff` instead of `/experts/uuid`. Old UUID URLs still work. Auto-populated from Twitter handle via SQL migration.
- **FLEX + K/DST removed** from fantasy guru position report card (now QB/RB/WR/TE only)
- **See All Takes** button fixed (was passing slug instead of UUID to server action)
- **RECEIPTS stat** is clickable, links to flip-flops page, red when count > 0
- **Position report card** for fantasy gurus

### Analyst Takes
- **Flip-flop contradiction detector** — AI detects when analyst contradicted themselves within 365 days. Admin trigger button on expert page. RECEIPTS stat links to `/experts/[id]/flip-flops`
- **Mean/Median aggregation toggle** in TakeScore Admin
- **Receipt image** redesign: full-width portrait, AI-generated pending teasers, grading criteria section, dynamic font sizing

### Homepage & Navigation
- **Leaderboard ribbon** — slow-scrolling ticker of Top 10 analysts between hero and HOW IT WORKS
- **Mobile homepage spacing** fixes: 8px token scale, hero padding, stacked search/toggle/CTA on mobile
- Mobile nav matches desktop: Analysts (red) + Fantasy (green) only

### Admin Portal
- **Dashboard stats** — "Today at a Glance" with 3 cards: takes added today, total graded, review queue (overdue pending takes). Review queue card links to /admin/takes, turns amber when > 0
- **Sidebar navigation** on all admin pages: grouped sections (Overview / Content / Grading / People / Settings), active-item highlighting, amber badge on Review Takes showing live overdue count
- **Show Accounts** page at `/admin/show-accounts`: manage X/Twitter show accounts (@FirstTake, @GetUpESPN etc.) that tweet analyst quotes. Active toggle, delete, Add form.
- **Public API** at `/api/show-accounts` — returns active show accounts as JSON for Python pipeline scripts (CORS open, 60s cache, `?all=1` for inactive too)

---

## What's Left / Pending

### Immediate
- [ ] **Run SQL migration for `show_accounts` table** — currently errors "table not found":
  ```sql
  create table if not exists show_accounts (
    id uuid primary key default gen_random_uuid(),
    handle text unique not null,
    display_name text not null,
    network text not null default '',
    active boolean not null default true,
    created_at timestamptz not null default now()
  );
  ```
- [ ] **Bulk re-rate all fantasy takes** to fix stale "2025 NFL" sport_season labels (hit "Rate all unrated" or select all → Re-rate)

### Previously run migrations (already done)
- ✅ `alter table experts add column if not exists slug text;` + index + populate from twitter_handle
- ✅ `alter table experts add column if not exists is_fantasy_guru boolean default false;`
- ✅ `alter table fantasy_takes add column if not exists source_url text;`
- ✅ `alter table take_score_config add column if not exists aggregation_method text not null default 'mean';`
- ✅ `flip_flops` table creation

### Features to Build
- [ ] **Scraper attribution logic** — when a tweet from a show account quotes an analyst, attribute the take to the analyst (uses show_accounts table). Python pipeline integration.
- [ ] **Fantasy take import flow** — bulk import from show accounts / Twitter scrape directly in admin
- [ ] **TakeScore lifetime sparkline** — currently a placeholder SVG; wire up real historical data
- [ ] **Expert edit page** improvements — slug field editable in admin, allow manual override
- [ ] **Accolades display** on expert profiles (auto-computed badges like "Elite Analyst", "Dead Eye", etc.)
- [ ] **Fantasy leaderboard** on the /fantasy page — ranked list of fantasy gurus by overall grade
- [ ] **Public take submission** — allow users to submit takes for experts (currently admin-only)
- [ ] **Follow feed** — logged-in users see takes from analysts they follow
- [ ] **Mobile admin** — sidebar collapses to hamburger on small screens
