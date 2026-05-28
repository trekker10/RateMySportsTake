-- Add fantasy score columns to experts table
ALTER TABLE experts ADD COLUMN IF NOT EXISTS fantasy_overall_rating numeric DEFAULT 0;
ALTER TABLE experts ADD COLUMN IF NOT EXISTS fantasy_graded_takes integer DEFAULT 0;
ALTER TABLE experts ADD COLUMN IF NOT EXISTS fantasy_boldness_avg numeric DEFAULT 0;
ALTER TABLE experts ADD COLUMN IF NOT EXISTS fantasy_accuracy_rate numeric DEFAULT 0;
ALTER TABLE experts ADD COLUMN IF NOT EXISTS fantasy_last_take_date date;

-- Fantasy TakeScore configuration
CREATE TABLE IF NOT EXISTS fantasy_take_score_config (
  id text PRIMARY KEY DEFAULT 'default',
  accuracy_nailed integer DEFAULT 100,
  accuracy_mostly_right integer DEFAULT 75,
  accuracy_directionally_right integer DEFAULT 60,
  accuracy_half_right integer DEFAULT 50,
  accuracy_mostly_wrong integer DEFAULT 25,
  accuracy_wrong integer DEFAULT 0,
  bc_moonshot_min integer DEFAULT 90,
  bc_moonshot_value integer DEFAULT 15,
  bc_bold_min integer DEFAULT 70,
  bc_bold_value integer DEFAULT 8,
  bc_neutral_min integer DEFAULT 40,
  bc_neutral_value integer DEFAULT 0,
  bc_safe_value integer DEFAULT -10,
  recency_recent_count integer DEFAULT 5,
  recency_recent_weight numeric DEFAULT 1.5,
  recency_standard_weight numeric DEFAULT 1.0,
  recency_old_days integer DEFAULT 730,
  recency_old_weight numeric DEFAULT 0.7,
  vol_high_takes integer DEFAULT 20,
  vol_high_boldness integer DEFAULT 25,
  vol_high_mult numeric DEFAULT 1.0,
  vol_mid_takes integer DEFAULT 10,
  vol_mid_boldness integer DEFAULT 25,
  vol_mid_mult numeric DEFAULT 0.9,
  vol_low_takes integer DEFAULT 5,
  vol_low_mult numeric DEFAULT 0.75,
  vol_min_mult numeric DEFAULT 0.60,
  vol_low_boldness_mult numeric DEFAULT 0.85,
  decay_30_mult numeric DEFAULT 1.0,
  decay_90_mult numeric DEFAULT 0.95,
  decay_180_mult numeric DEFAULT 0.85,
  decay_365_mult numeric DEFAULT 0.75,
  decay_old_mult numeric DEFAULT 0.65,
  rolling_window integer DEFAULT 20,
  normalization_divisor numeric DEFAULT 2.0,
  grade_a_min integer DEFAULT 80,
  grade_bplus_min integer DEFAULT 70,
  grade_b_min integer DEFAULT 60,
  grade_bminus_min integer DEFAULT 50,
  grade_cplus_min integer DEFAULT 40,
  grade_c_min integer DEFAULT 30,
  grade_cminus_min integer DEFAULT 20,
  grade_d_min integer DEFAULT 10,
  timing_preseason_mod integer DEFAULT 15,
  timing_post_draft_mod integer DEFAULT 10,
  timing_early_season_mod integer DEFAULT 5,
  timing_midseason_mod integer DEFAULT 0,
  timing_late_season_mod integer DEFAULT -10,
  timing_playoffs_mod integer DEFAULT -15,
  adp_reference_source text DEFAULT 'FantasyPros ECR',
  category_breakout_def text DEFAULT 'A season-long prediction that a player will finish at least one full tier above their preseason ADP. Finishing top 12 when drafted outside top 24, or top 24 when drafted outside top 36.',
  category_bust_def text DEFAULT 'A season-long prediction that a player drafted in rounds 1-2 will finish outside the top 24 at their position.',
  category_sleeper_def text DEFAULT 'A season-long prediction on a player drafted outside top 100 overall who finishes as a top 20 option at their position.',
  category_start_sit_def text DEFAULT 'A weekly prediction to start or sit a player. Start hit = top 12 at position that week. Sit hit = outside top 20 at position that week.',
  category_waiver_def text DEFAULT 'A prediction on a player owned in fewer than 30% of leagues who finishes as a top 20 weekly scorer at their position that week.',
  updated_at timestamptz DEFAULT now(),
  updated_by text
);

INSERT INTO fantasy_take_score_config (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

-- Fantasy takes table
CREATE TABLE IF NOT EXISTS fantasy_takes (
  fantasy_take_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id uuid REFERENCES experts(expert_id) ON DELETE CASCADE NOT NULL,
  category text NOT NULL,
  raw_text text NOT NULL,
  player_name text,
  player_position text,
  player_adp numeric,
  timing_window text,
  timing_modifier integer DEFAULT 0,
  boldness_score numeric,
  accuracy_score numeric,
  grader_note text,
  outcome_status text DEFAULT 'pending',
  date_made date NOT NULL,
  resolution_date date,
  sport_season text,
  impact_score numeric,
  recency_weight numeric,
  boldness_credit numeric,
  created_at timestamptz DEFAULT now()
);

-- Fantasy config change log
CREATE TABLE IF NOT EXISTS fantasy_config_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  changed_at timestamptz DEFAULT now(),
  changed_by text,
  changes jsonb
);

CREATE INDEX IF NOT EXISTS idx_fantasy_takes_expert_id ON fantasy_takes (expert_id);
CREATE INDEX IF NOT EXISTS idx_fantasy_takes_outcome ON fantasy_takes (outcome_status);
