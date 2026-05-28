-- Add fantasy league format field to fantasy_takes
ALTER TABLE fantasy_takes
  ADD COLUMN IF NOT EXISTS format text CHECK (format IN ('dynasty', 'redraft', 'both')) DEFAULT 'both';

COMMENT ON COLUMN fantasy_takes.format IS 'League format this take applies to: dynasty, redraft, or both';
