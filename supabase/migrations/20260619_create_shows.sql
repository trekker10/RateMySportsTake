-- Shows table: stores TV/podcast show logos and names
create table if not exists public.shows (
  show_id   uuid primary key default gen_random_uuid(),
  name      text not null,           -- e.g. "The Herd with Colin Cowherd"
  network   text,                    -- e.g. "FS1", "ESPN", "Podcast"
  logo_url  text,                    -- direct image URL (CDN / uploaded)
  created_at timestamptz not null default now()
);

alter table public.shows enable row level security;

-- Allow admin service role full access; public can read
create policy "Public read" on public.shows for select using (true);
create policy "Service write" on public.shows for all using (auth.role() = 'service_role');
