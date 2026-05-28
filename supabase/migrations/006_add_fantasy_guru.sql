-- Add fantasy guru flag to experts table
ALTER TABLE experts
  ADD COLUMN IF NOT EXISTS is_fantasy_guru boolean NOT NULL DEFAULT false;

-- Index for fast leaderboard filtering
CREATE INDEX IF NOT EXISTS idx_experts_fantasy_guru ON experts (is_fantasy_guru);
