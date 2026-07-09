-- ── Phase 2: email segment count functions ──────────────────────────────────
-- All functions are SECURITY DEFINER so the service-role caller can read
-- across auth schema boundaries.

-- 1. All active users — every profile in the system
CREATE OR REPLACE FUNCTION count_segment_all_active()
RETURNS bigint LANGUAGE sql SECURITY DEFINER AS $$
  SELECT COUNT(*) FROM profiles;
$$;

-- 2. New signups — signed up within the last 7 days
CREATE OR REPLACE FUNCTION count_segment_new_signups()
RETURNS bigint LANGUAGE sql SECURITY DEFINER AS $$
  SELECT COUNT(*) FROM profiles
  WHERE created_at > NOW() - INTERVAL '7 days';
$$;

-- 3. Inactive 30+ days — joined > 30 days ago with no recent activity
--    "active" = any follow, save, or vote in the last 30 days
CREATE OR REPLACE FUNCTION count_segment_inactive_30()
RETURNS bigint LANGUAGE sql SECURITY DEFINER AS $$
  SELECT COUNT(DISTINCT p.user_id)
  FROM profiles p
  WHERE p.created_at < NOW() - INTERVAL '30 days'
    AND NOT EXISTS (
      SELECT 1 FROM follows f
      WHERE f.user_id = p.user_id
        AND f.created_at > NOW() - INTERVAL '30 days'
    )
    AND NOT EXISTS (
      SELECT 1 FROM saved_takes s
      WHERE s.user_id = p.user_id
        AND s.created_at > NOW() - INTERVAL '30 days'
    )
    AND NOT EXISTS (
      SELECT 1 FROM take_votes tv
      WHERE tv.user_id = p.user_id
        AND tv.created_at > NOW() - INTERVAL '30 days'
    )
    AND NOT EXISTS (
      SELECT 1 FROM take_follows tf
      WHERE tf.user_id = p.user_id
        AND tf.created_at > NOW() - INTERVAL '30 days'
    );
$$;

-- 4. Followers of a specific analyst
CREATE OR REPLACE FUNCTION count_segment_analyst_followers(p_expert_id uuid)
RETURNS bigint LANGUAGE sql SECURITY DEFINER AS $$
  SELECT COUNT(DISTINCT user_id) FROM follows WHERE expert_id = p_expert_id;
$$;

-- 5. Users who saved or followed (backed) at least one take
CREATE OR REPLACE FUNCTION count_segment_saved_backed()
RETURNS bigint LANGUAGE sql SECURITY DEFINER AS $$
  SELECT COUNT(DISTINCT user_id) FROM (
    SELECT user_id FROM saved_takes
    UNION
    SELECT user_id FROM take_follows
  ) combined;
$$;

-- ── Recipient-list functions (used in Phase 3/4 for actual sending) ──────────

CREATE OR REPLACE FUNCTION get_segment_emails_all_active()
RETURNS TABLE(email text) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT u.email FROM auth.users u
  INNER JOIN profiles p ON p.user_id = u.id
  WHERE u.email IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION get_segment_emails_new_signups()
RETURNS TABLE(email text) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT u.email FROM auth.users u
  INNER JOIN profiles p ON p.user_id = u.id
  WHERE u.email IS NOT NULL
    AND p.created_at > NOW() - INTERVAL '7 days';
$$;

CREATE OR REPLACE FUNCTION get_segment_emails_inactive_30()
RETURNS TABLE(email text) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT u.email FROM auth.users u
  INNER JOIN profiles p ON p.user_id = u.id
  WHERE u.email IS NOT NULL
    AND p.created_at < NOW() - INTERVAL '30 days'
    AND NOT EXISTS (SELECT 1 FROM follows f WHERE f.user_id = p.user_id AND f.created_at > NOW() - INTERVAL '30 days')
    AND NOT EXISTS (SELECT 1 FROM saved_takes s WHERE s.user_id = p.user_id AND s.created_at > NOW() - INTERVAL '30 days')
    AND NOT EXISTS (SELECT 1 FROM take_votes tv WHERE tv.user_id = p.user_id AND tv.created_at > NOW() - INTERVAL '30 days')
    AND NOT EXISTS (SELECT 1 FROM take_follows tf WHERE tf.user_id = p.user_id AND tf.created_at > NOW() - INTERVAL '30 days');
$$;

CREATE OR REPLACE FUNCTION get_segment_emails_analyst_followers(p_expert_id uuid)
RETURNS TABLE(email text) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT DISTINCT u.email FROM auth.users u
  INNER JOIN follows f ON f.user_id = u.id
  WHERE f.expert_id = p_expert_id AND u.email IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION get_segment_emails_saved_backed()
RETURNS TABLE(email text) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT DISTINCT u.email FROM auth.users u
  WHERE u.id IN (
    SELECT user_id FROM saved_takes
    UNION
    SELECT user_id FROM take_follows
  ) AND u.email IS NOT NULL;
$$;

-- ── Add segment_params column to email_templates ─────────────────────────────
ALTER TABLE email_templates
  ADD COLUMN IF NOT EXISTS segment_type   text DEFAULT 'all_active',
  ADD COLUMN IF NOT EXISTS segment_params jsonb DEFAULT '{}';

-- Migrate existing default_segment values to segment_type
UPDATE email_templates SET segment_type = 'new_signups'    WHERE default_segment ILIKE '%new signup%';
UPDATE email_templates SET segment_type = 'inactive_30'    WHERE default_segment ILIKE '%inactive%';
UPDATE email_templates SET segment_type = 'saved_backed'   WHERE default_segment ILIKE '%saved%' OR default_segment ILIKE '%backed%';
UPDATE email_templates SET segment_type = 'analyst_followers' WHERE default_segment ILIKE '%follower%';
UPDATE email_templates SET segment_type = 'all_active'     WHERE segment_type IS NULL;
