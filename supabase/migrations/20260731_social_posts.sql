create table social_posts (
  id                    uuid        primary key default gen_random_uuid(),
  template_type         text        not null,
  source_take_id        uuid        references takes(take_id),
  source_table          text,
  draft_text            text        not null,
  draft_variants        jsonb,
  status                text        not null default 'draft',
  confidence            text,
  scheduled_time        timestamptz,
  posted_at             timestamptz,
  typefully_draft_id    text,
  telegram_message_id   text,
  edit_mode             boolean     not null default false,
  auto_skip_at          timestamptz,
  created_at            timestamptz default now()
);

-- Service-role only, no public access
alter table social_posts enable row level security;
create policy "service role only" on social_posts for all using (false);
