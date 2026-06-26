-- Add onboarding fields to profiles
alter table profiles
  add column if not exists username       text unique,
  add column if not exists favorite_sports text[] not null default '{}',
  add column if not exists user_intent    text;

-- Index for username lookups
create unique index if not exists profiles_username_idx on profiles (lower(username))
  where username is not null;

-- Update the auto-create trigger so it no longer sets display_name from email
-- (the signup action will set username + display_name explicitly)
create or replace function create_profile_on_signup()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;
