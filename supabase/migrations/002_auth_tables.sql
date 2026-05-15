-- ─── Profiles (auto-created on signup) ───────────────────────────────────────
create table profiles (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now(),
  display_name text,
  bio          text,
  avatar_url   text
);

create or replace function create_profile_on_signup()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (user_id, display_name)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function create_profile_on_signup();

-- ─── Follows ──────────────────────────────────────────────────────────────────
create table follows (
  user_id    uuid not null references auth.users (id) on delete cascade,
  expert_id  uuid not null references experts (expert_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, expert_id)
);

-- ─── Feature flags ────────────────────────────────────────────────────────────
create table feature_flags (
  key         text primary key,
  enabled     boolean not null default true,
  description text,
  updated_at  timestamptz not null default now()
);

insert into feature_flags (key, enabled, description) values
  ('require_auth_for_submissions', false, 'Users must be logged in to submit takes'),
  ('new_signups_enabled',          true,  'Allow new users to create accounts'),
  ('import_enabled',               true,  'Show the Import tab in the nav'),
  ('grading_enabled',              true,  'Enable the daily auto-grading job'),
  ('public_browsing',              true,  'Anyone can browse takes without logging in');

-- ─── RLS ──────────────────────────────────────────────────────────────────────
alter table profiles      enable row level security;
alter table follows       enable row level security;
alter table feature_flags enable row level security;

create policy "profiles: public read"
  on profiles for select using (true);

create policy "profiles: own update"
  on profiles for update using (auth.uid() = user_id);

create policy "follows: public read"
  on follows for select using (true);

create policy "follows: own insert"
  on follows for insert with check (auth.uid() = user_id);

create policy "follows: own delete"
  on follows for delete using (auth.uid() = user_id);

create policy "feature_flags: public read"
  on feature_flags for select using (true);
-- feature_flags writes go through service role (admin only, server-side)
