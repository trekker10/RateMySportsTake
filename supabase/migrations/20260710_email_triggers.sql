-- ── Phase 4: EmailTriggers ────────────────────────────────────────────────────

-- Two hard-coded event types, seeded as rows (admin enables/configures them)
create table if not exists email_triggers (
  id           uuid        primary key default gen_random_uuid(),
  event_type   text        not null unique,   -- 'new_take_drop' | 'take_graded'
  label        text        not null,
  description  text        not null,
  template_id  uuid        references email_templates(id) on delete set null,
  is_enabled   boolean     not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table email_triggers enable row level security;
create policy "Admin only via service role" on email_triggers for all using (false);

-- Seed the two supported trigger event types
insert into email_triggers (event_type, label, description) values
  ('new_take_drop', 'New Take Drop',  'Fires when an analyst posts a new take. Sends to users following that analyst.'),
  ('take_graded',   'Take Graded',    'Fires when a take is graded. Sends to users who saved or backed that take.')
on conflict (event_type) do nothing;

-- ── RPC: get emails for "take graded" trigger (specific take's savers/backers) ─

create or replace function get_trigger_emails_take_graded(p_take_id uuid)
returns table(email text)
language sql
security definer
set search_path = public
as $$
  select distinct u.email
  from take_follows tf
  join auth.users u on u.id = tf.user_id
  where tf.take_id = p_take_id
    and u.email is not null
    and u.email_confirmed_at is not null;
$$;
