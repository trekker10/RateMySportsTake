-- Email templates table for the admin communications feature
create table if not exists email_templates (
  id           uuid        primary key default gen_random_uuid(),
  name         text        not null,
  status       text        not null default 'draft',      -- 'active' | 'paused' | 'draft'
  category     text        not null default 'manual',     -- 'onboarding' | 'trigger' | 'scheduled' | 'manual'
  subject      text        not null default '',
  preview_text text        not null default '',
  from_name    text        not null default 'RMST Team',
  default_segment text     not null default '',
  body_json    jsonb       not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Only service-role (admin) can access — anon/authenticated users cannot
alter table email_templates enable row level security;
create policy "Admin only via service role" on email_templates for all using (false);

-- Seed initial templates
insert into email_templates (name, status, category, subject, preview_text, from_name, default_segment, body_json) values
(
  'Welcome Email',
  'active',
  'onboarding',
  'Welcome to Rate/My/Sports/Take 🏈',
  'We rate the takes so you don''t have to.',
  'RMST Team',
  'All new signups',
  '{"hero_image_url":"","heading":"Welcome to the desk 🏈","body":"You''re in. Every hot take gets graded, so you''ll always know who''s actually calling it — and who''s just loud.","cta_text":"START RATING TAKES","cta_url":"https://ratemysportstake.com/experts"}'
),
(
  'New Take Drop',
  'active',
  'trigger',
  'New take from {{analyst_name}}',
  'A new take just dropped — come see if it holds up.',
  'RMST Team',
  'Followers of that analyst',
  '{"hero_image_url":"","heading":"Fresh take just dropped 🔥","body":"{{analyst_name}} just filed a new take. Head over to see what they''re calling — and cast your crowd forecast vote.","cta_text":"SEE THE TAKE","cta_url":"https://ratemysportstake.com/experts"}'
),
(
  'Take Graded',
  'active',
  'trigger',
  'The verdict is in on a take you saved',
  'Find out if the call aged well — or not.',
  'RMST Team',
  'Users who saved/backed a take',
  '{"hero_image_url":"","heading":"The verdict is in 📋","body":"A take you saved just got graded. Was the analyst right? Head over to see the result and update your forecast record.","cta_text":"SEE THE GRADE","cta_url":"https://ratemysportstake.com/dashboard"}'
),
(
  'Weekly Recap',
  'paused',
  'scheduled',
  'Your weekly sports take report 📊',
  'See who''s hot, who''s not, and what got graded this week.',
  'RMST Team',
  'All active users',
  '{"hero_image_url":"","heading":"This week in takes 📊","body":"Here''s a quick look at what got graded this week, who''s rising on the leaderboard, and what takes are about to resolve. Stay sharp.","cta_text":"VIEW THE LEADERBOARD","cta_url":"https://ratemysportstake.com/experts"}'
),
(
  'Win-back',
  'draft',
  'manual',
  'We miss you — here''s what you''ve been missing',
  'Big takes have been graded while you were away.',
  'RMST Team',
  'Inactive 30+ days',
  '{"hero_image_url":"","heading":"You''ve been missing some takes 👀","body":"While you were away, analysts have been making calls — and we''ve been grading them. Come back and see who''s been right and who''s been way off.","cta_text":"SEE WHAT''S NEW","cta_url":"https://ratemysportstake.com/experts"}'
);
