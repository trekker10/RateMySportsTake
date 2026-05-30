-- Add grading_criteria column to fantasy_takes
-- This stores the AI-generated (and user-editable) conditions for grading a fantasy take

ALTER TABLE fantasy_takes
  ADD COLUMN IF NOT EXISTS grading_criteria text;
