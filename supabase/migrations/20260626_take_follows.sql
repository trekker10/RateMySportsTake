create table if not exists take_follows (
  user_id uuid references auth.users(id) on delete cascade,
  take_id uuid references takes(take_id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, take_id)
);

alter table take_follows enable row level security;

create policy "Users manage own take follows"
  on take_follows for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
