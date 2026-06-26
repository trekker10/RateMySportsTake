-- Make the profile-creation trigger silent so it can never block auth signup.
-- Profile fields (username, sports, intent) are written by the server action
-- using the admin client immediately after auth.signUp succeeds.
create or replace function create_profile_on_signup()
returns trigger language plpgsql security definer as $$
begin
  begin
    insert into profiles (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  exception when others then
    -- Swallow any error — the signup action writes profile fields via admin client.
    null;
  end;
  return new;
end;
$$;
