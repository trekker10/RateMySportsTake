-- Add verified flag to experts
-- Verified experts appear on leaderboards; unverified are hidden until approved by admin.
ALTER TABLE experts ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false;
