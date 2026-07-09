-- ── App Settings: generic key/value store for admin-configurable values ──────

create table app_settings (
  key         text primary key,
  value       text not null,
  description text,
  updated_at  timestamptz not null default now()
);

-- Only admins (service role) can write; anyone can read
alter table app_settings enable row level security;

create policy "app_settings are publicly readable"
  on app_settings for select using (true);

-- Seed defaults
insert into app_settings (key, value, description) values
  ('crowd_forecast_min_votes', '5', 'Minimum votes required before showing crowd forecast bar and percentages');
