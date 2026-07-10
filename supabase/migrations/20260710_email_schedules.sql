-- ── Phase 3: EmailSchedule + EmailSendLog ────────────────────────────────────

create table if not exists email_schedules (
  id              uuid        primary key default gen_random_uuid(),
  template_id     uuid        not null references email_templates(id) on delete cascade,
  segment_type    text        not null default 'all_active',
  segment_params  jsonb       not null default '{}',
  cadence         text        not null default 'once',   -- 'once' | 'weekly:monday' | etc.
  next_send_at    date        not null,
  is_enabled      boolean     not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table email_schedules enable row level security;
create policy "Admin only via service role" on email_schedules for all using (false);

create table if not exists email_send_log (
  id               uuid        primary key default gen_random_uuid(),
  template_id      uuid        references email_templates(id) on delete set null,
  schedule_id      uuid        references email_schedules(id) on delete set null,
  segment_type     text,
  segment_label    text,                                  -- human-readable snapshot
  sent_at          timestamptz not null default now(),
  recipient_count  integer     not null default 0,
  status           text        not null default 'sent',   -- 'sent' | 'failed' | 'partial'
  error_message    text
);

alter table email_send_log enable row level security;
create policy "Admin only via service role" on email_send_log for all using (false);
