-- ── Feedback submissions ─────────────────────────────────────────────────────

create table if not exists feedback_submissions (
  id              uuid        primary key default gen_random_uuid(),
  category        text        not null,
  message         text        not null,
  email           text,
  screenshot_name text,
  created_at      timestamptz not null default now()
);

alter table feedback_submissions enable row level security;

-- Public insert (anonymous submissions allowed), no read access
create policy "Anyone can submit feedback"
  on feedback_submissions for insert
  with check (true);

create policy "Admin only via service role"
  on feedback_submissions for select
  using (false);
