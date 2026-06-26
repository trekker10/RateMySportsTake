create table if not exists saved_takes (
  user_id    uuid not null references auth.users (id) on delete cascade,
  take_id    uuid not null references takes (take_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, take_id)
);

alter table saved_takes enable row level security;

create policy "Users can read their own saved takes"
  on saved_takes for select
  using (auth.uid() = user_id);

create policy "Users can insert their own saved takes"
  on saved_takes for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own saved takes"
  on saved_takes for delete
  using (auth.uid() = user_id);
