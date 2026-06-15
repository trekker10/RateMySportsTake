-- Add resolution date labeling columns to classifier eval tables

ALTER TABLE fantasy_classifier_eval
  ADD COLUMN IF NOT EXISTS tweet_date               date,
  ADD COLUMN IF NOT EXISTS resolution_verdict       text CHECK (resolution_verdict IN ('correct', 'wrong', 'adjust')),
  ADD COLUMN IF NOT EXISTS classifier_resolution_date date,
  ADD COLUMN IF NOT EXISTS correct_resolution_date  date,
  ADD COLUMN IF NOT EXISTS resolution_note          text;

ALTER TABLE standard_classifier_eval
  ADD COLUMN IF NOT EXISTS tweet_date               date,
  ADD COLUMN IF NOT EXISTS resolution_verdict       text CHECK (resolution_verdict IN ('correct', 'wrong', 'adjust')),
  ADD COLUMN IF NOT EXISTS classifier_resolution_date date,
  ADD COLUMN IF NOT EXISTS correct_resolution_date  date,
  ADD COLUMN IF NOT EXISTS resolution_note          text;
