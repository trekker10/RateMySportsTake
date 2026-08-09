-- ─── Security: Drop overly-permissive authenticated write policies ─────────────
--
-- Context: `takes`, `experts`, and `fantasy_takes` had blanket INSERT/UPDATE
-- policies using `auth.role() = 'authenticated'`, which would allow any
-- logged-in user to write to these tables once public signups are enabled.
-- Caught via pg_policies sweep before public launch.
--
-- Safe to drop because: ALL legitimate writes to these tables go through
-- Next.js Server Actions in src/app/actions/ which use createAdminClient()
-- (SUPABASE_SERVICE_KEY). Service-role connections bypass RLS entirely, so
-- these policies were never needed. The Python pipeline (sports-take-pipeline)
-- also writes via the service key — same bypass applies.
--
-- Verified:
--   - No client-side (browser) code writes to `takes`, `experts`, or `fantasy_takes`.
--   - The only browser-client SELECT on `experts` (TakeEntry.tsx) is covered
--     by the existing public-read policies (unchanged below).
--   - `take_votes` and `push_subscriptions` write policies were audited and
--     are correctly scoped to auth.uid() = user_id — no changes needed there.
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop permissive write policies on `takes`
drop policy if exists "takes: authenticated insert" on takes;
drop policy if exists "takes: authenticated update" on takes;

-- Drop permissive write policies on `experts`
drop policy if exists "experts: authenticated insert" on experts;
drop policy if exists "experts: authenticated update" on experts;

-- Drop permissive write policies on `fantasy_takes`
drop policy if exists "fantasy_takes: authenticated insert" on fantasy_takes;
drop policy if exists "fantasy_takes: authenticated update" on fantasy_takes;

-- The following policies are intentionally LEFT IN PLACE:
--   "takes: public read"         (SELECT using (true))
--   "experts: public read"       (SELECT using (true))
--   "fantasy_takes: public read" (SELECT using (true)) — if it exists
