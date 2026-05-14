-- ─── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Enums ───────────────────────────────────────────────────────────────────
create type take_status as enum (
  'pending_ai_rating',
  'rated',
  'pending_outcome',
  'graded',
  'contested'
);

create type take_source as enum (
  'twitter',
  'tv',
  'podcast',
  'article',
  'other'
);

create type sport as enum (
  'nfl',
  'nba',
  'mlb',
  'nhl',
  'soccer',
  'college_football',
  'college_basketball',
  'other'
);

-- ─── Experts ─────────────────────────────────────────────────────────────────
create table experts (
  id              uuid primary key default uuid_generate_v4(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  name            text not null,
  slug            text not null unique,
  bio             text,
  avatar_url      text,
  twitter_handle  text unique,
  organization    text,

  -- cached aggregate stats, refreshed by trigger
  total_takes     integer not null default 0,
  graded_takes    integer not null default 0,
  accuracy_score  numeric(5,2),   -- 0–100
  boldness_score  numeric(5,2),   -- 0–10
  flip_rate       numeric(5,4)    -- 0.0000–1.0000
);

create index experts_slug_idx on experts (slug);

-- ─── Takes ───────────────────────────────────────────────────────────────────
create table takes (
  id                    uuid primary key default uuid_generate_v4(),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  expert_id             uuid not null references experts (id) on delete cascade,
  submitted_by          uuid references auth.users (id) on delete set null,

  -- The take
  content               text not null,
  source                take_source not null,
  source_url            text,
  sport                 sport not null,
  taken_at              timestamptz not null,

  -- AI ratings
  status                take_status not null default 'pending_ai_rating',
  difficulty_score      numeric(4,2),     -- 1–10
  falsifiability_score  numeric(4,2),     -- 1–10
  confidence_score      numeric(4,2),     -- 1–10
  specificity_score     numeric(4,2),     -- 1–10
  ai_summary            text,
  ai_reasoning          text,

  -- Outcome & grade
  outcome_date          timestamptz,
  outcome_description   text,
  grade                 numeric(5,2),     -- 0–100
  grade_reasoning       text,

  -- Meta
  upvotes               integer not null default 0,
  is_notable            boolean not null default false
);

create index takes_expert_id_idx   on takes (expert_id);
create index takes_sport_idx       on takes (sport);
create index takes_status_idx      on takes (status);
create index takes_taken_at_idx    on takes (taken_at desc);

-- ─── updated_at triggers ─────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger experts_updated_at
  before update on experts
  for each row execute function set_updated_at();

create trigger takes_updated_at
  before update on takes
  for each row execute function set_updated_at();

-- ─── Expert stats refresh ─────────────────────────────────────────────────────
create or replace function refresh_expert_stats()
returns trigger language plpgsql as $$
begin
  update experts
  set
    total_takes    = (select count(*)                          from takes where expert_id = coalesce(new.expert_id, old.expert_id)),
    graded_takes   = (select count(*)                          from takes where expert_id = coalesce(new.expert_id, old.expert_id) and grade is not null),
    accuracy_score = (select avg(grade)                        from takes where expert_id = coalesce(new.expert_id, old.expert_id) and grade is not null),
    boldness_score = (select avg(difficulty_score)             from takes where expert_id = coalesce(new.expert_id, old.expert_id) and difficulty_score is not null)
  where id = coalesce(new.expert_id, old.expert_id);
  return null;
end;
$$;

create trigger takes_refresh_expert_stats
  after insert or update or delete on takes
  for each row execute function refresh_expert_stats();

-- ─── Row-Level Security ───────────────────────────────────────────────────────
alter table experts enable row level security;
alter table takes    enable row level security;

-- Experts: public read, authenticated insert, owner update
create policy "experts: public read"
  on experts for select using (true);

create policy "experts: authenticated insert"
  on experts for insert with check (auth.role() = 'authenticated');

-- Takes: public read, authenticated insert, submitter can update their own
create policy "takes: public read"
  on takes for select using (true);

create policy "takes: authenticated insert"
  on takes for insert with check (auth.role() = 'authenticated');

create policy "takes: submitter update"
  on takes for update using (submitted_by = auth.uid());
