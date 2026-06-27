create table if not exists notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  official boolean not null default false,
  analyst_updates boolean not null default false,
  take_updates boolean not null default false,
  updated_at timestamptz default now()
);

alter table notification_preferences enable row level security;

create policy "Users manage own notification preferences"
  on notification_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
