insert into feature_flags (key, enabled, description)
values ('show_submit_nav', false, 'Show the Submit link in the nav for all users')
on conflict (key) do nothing;
