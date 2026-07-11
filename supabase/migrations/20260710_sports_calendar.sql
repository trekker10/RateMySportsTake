-- Seed sports_calendar with key season milestones.
-- Table already exists in the DB (schema has event_type as NOT NULL).
-- Used by:
--   buildCalendarBlock()           → analyst take AI prompt (rate-take.ts)
--   computeFantasyResolutionDate() → fantasy take resolution dates (fantasy-takes.ts)

insert into sports_calendar (event_name, event_type, league, event_date, season, is_estimated) values

-- ── NFL ────────────────────────────────────────────────────────────────────────
  ('NFL 2025 Regular Season Start',  'regular_season_start', 'NFL', '2025-09-04', '2025 NFL', false),
  ('NFL 2025 Regular Season End',    'regular_season_end',   'NFL', '2025-12-28', '2025 NFL', true),
  ('NFL 2025 Playoffs Start',        'playoffs_start',       'NFL', '2026-01-10', '2025 NFL', true),
  ('NFL 2026 Super Bowl',            'championship',         'NFL', '2026-02-01', '2025 NFL', true),
  ('NFL 2026 Draft',                 'draft',                'NFL', '2026-04-23', '2026 NFL', true),
  ('NFL 2026 Regular Season Start',  'regular_season_start', 'NFL', '2026-09-10', '2026 NFL', true),
  ('NFL 2026 Regular Season End',    'regular_season_end',   'NFL', '2026-12-27', '2026 NFL', true),
  ('NFL 2026 Playoffs Start',        'playoffs_start',       'NFL', '2027-01-09', '2026 NFL', true),
  ('NFL 2027 Super Bowl',            'championship',         'NFL', '2027-02-07', '2026 NFL', true),
  ('NFL 2027 Draft',                 'draft',                'NFL', '2027-04-22', '2027 NFL', true),

-- ── NBA ───────────────────────────────────────────────────────────────────────
  ('NBA 2024-25 Regular Season End',  'regular_season_end',   'NBA', '2025-04-13', '2024-25 NBA', false),
  ('NBA 2025 Playoffs Start',         'playoffs_start',       'NBA', '2025-04-19', '2024-25 NBA', false),
  ('NBA 2025 Finals End',             'championship',         'NBA', '2025-06-22', '2024-25 NBA', true),
  ('NBA 2025 Draft',                  'draft',                'NBA', '2025-06-25', '2024-25 NBA', false),
  ('NBA 2025-26 Regular Season Start','regular_season_start', 'NBA', '2025-10-21', '2025-26 NBA', true),
  ('NBA 2025-26 Regular Season End',  'regular_season_end',   'NBA', '2026-04-12', '2025-26 NBA', true),
  ('NBA 2026 Playoffs Start',         'playoffs_start',       'NBA', '2026-04-18', '2025-26 NBA', true),
  ('NBA 2026 Finals End',             'championship',         'NBA', '2026-06-21', '2025-26 NBA', true),
  ('NBA 2026 Draft',                  'draft',                'NBA', '2026-06-24', '2025-26 NBA', true),

-- ── MLB ───────────────────────────────────────────────────────────────────────
  ('MLB 2025 Opening Day',            'regular_season_start', 'MLB', '2025-03-27', '2025 MLB', false),
  ('MLB 2025 Regular Season End',     'regular_season_end',   'MLB', '2025-09-28', '2025 MLB', true),
  ('MLB 2025 Postseason Start',       'playoffs_start',       'MLB', '2025-10-01', '2025 MLB', true),
  ('MLB 2025 World Series End',       'championship',         'MLB', '2025-10-31', '2025 MLB', true),
  ('MLB 2026 Opening Day',            'regular_season_start', 'MLB', '2026-04-02', '2026 MLB', true),
  ('MLB 2026 Regular Season End',     'regular_season_end',   'MLB', '2026-09-27', '2026 MLB', true),
  ('MLB 2026 Postseason Start',       'playoffs_start',       'MLB', '2026-09-30', '2026 MLB', true),
  ('MLB 2026 World Series End',       'championship',         'MLB', '2026-10-30', '2026 MLB', true),

-- ── NHL ───────────────────────────────────────────────────────────────────────
  ('NHL 2024-25 Regular Season End',  'regular_season_end',   'NHL', '2025-04-17', '2024-25 NHL', false),
  ('NHL 2025 Playoffs Start',         'playoffs_start',       'NHL', '2025-04-19', '2024-25 NHL', false),
  ('NHL 2025 Stanley Cup Final End',  'championship',         'NHL', '2025-06-20', '2024-25 NHL', true),
  ('NHL 2025 Draft',                  'draft',                'NHL', '2025-06-27', '2024-25 NHL', false),
  ('NHL 2025-26 Regular Season Start','regular_season_start', 'NHL', '2025-10-07', '2025-26 NHL', true),
  ('NHL 2025-26 Regular Season End',  'regular_season_end',   'NHL', '2026-04-16', '2025-26 NHL', true),
  ('NHL 2026 Playoffs Start',         'playoffs_start',       'NHL', '2026-04-18', '2025-26 NHL', true),
  ('NHL 2026 Stanley Cup Final End',  'championship',         'NHL', '2026-06-19', '2025-26 NHL', true),

-- ── CFB ───────────────────────────────────────────────────────────────────────
  ('CFB 2025 Season Start',           'regular_season_start', 'CFB', '2025-08-23', '2025 CFB', true),
  ('CFB 2025 Regular Season End',     'regular_season_end',   'CFB', '2025-11-29', '2025 CFB', true),
  ('CFB 2025 Conference Championships','playoffs_start',      'CFB', '2025-12-06', '2025 CFB', true),
  ('CFB 2026 National Championship',  'championship',         'CFB', '2026-01-19', '2025 CFB', true),
  ('CFB 2026 Season Start',           'regular_season_start', 'CFB', '2026-08-29', '2026 CFB', true),
  ('CFB 2026 Regular Season End',     'regular_season_end',   'CFB', '2026-11-28', '2026 CFB', true),
  ('CFB 2026 Conference Championships','playoffs_start',      'CFB', '2026-12-05', '2026 CFB', true),
  ('CFB 2027 National Championship',  'championship',         'CFB', '2027-01-11', '2026 CFB', true),

-- ── Fantasy Football ──────────────────────────────────────────────────────────
  ('Fantasy 2025 Draft Period Start',          'fantasy_draft_start',        'Fantasy Football', '2025-08-01', '2025 Fantasy Football', true),
  ('Fantasy 2025 Season Start',                'fantasy_season_start',       'Fantasy Football', '2025-09-04', '2025 Fantasy Football', false),
  ('Fantasy 2025 Regular Season End (Wk 14)',  'fantasy_regular_season_end', 'Fantasy Football', '2025-12-14', '2025 Fantasy Football', true),
  ('Fantasy 2025 Playoffs Start (Wk 15)',      'fantasy_playoffs_start',     'Fantasy Football', '2025-12-18', '2025 Fantasy Football', true),
  ('Fantasy 2025 Championship End (Wk 17)',    'fantasy_championship_end',   'Fantasy Football', '2026-01-01', '2025 Fantasy Football', true),
  ('Fantasy 2026 Draft Period Start',          'fantasy_draft_start',        'Fantasy Football', '2026-08-01', '2026 Fantasy Football', true),
  ('Fantasy 2026 Season Start',                'fantasy_season_start',       'Fantasy Football', '2026-09-10', '2026 Fantasy Football', true),
  ('Fantasy 2026 Regular Season End (Wk 14)',  'fantasy_regular_season_end', 'Fantasy Football', '2026-12-13', '2026 Fantasy Football', true),
  ('Fantasy 2026 Playoffs Start (Wk 15)',      'fantasy_playoffs_start',     'Fantasy Football', '2026-12-17', '2026 Fantasy Football', true),
  ('Fantasy 2026 Championship End (Wk 17)',    'fantasy_championship_end',   'Fantasy Football', '2026-12-31', '2026 Fantasy Football', true);
