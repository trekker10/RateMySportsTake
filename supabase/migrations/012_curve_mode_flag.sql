-- Add curve_mode_enabled feature flag
-- When enabled, NFL analyst TakeScores on the leaderboard are displayed
-- as bell-curve adjusted letter grades relative to the NFL analyst peer group.
-- Individual take scores and raw overall_rating values are never modified.

insert into feature_flags (key, enabled, description)
values (
  'curve_mode_enabled',
  false,
  'Bell-curve NFL analyst TakeScore grades on the leaderboard (relative to NFL peer group). Does not modify raw scores.'
)
on conflict (key) do nothing;
