-- ─── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Enums ───────────────────────────────────────────────────────────────────
create type source_type as enum (
  'tweet', 'article', 'tv_segment', 'podcast', 'radio', 'other'
);

create type take_type as enum (
  'prediction', 'opinion', 'narrative', 'criticism', 'praise', 'stat_claim'
);

create type time_horizon as enum (
  'immediate', 'this_season', 'this_year', 'multi_year', 'career', 'unresolvable'
);

create type rating_status as enum (
  'pending', 'rated', 'failed'
);

create type outcome_status as enum (
  'pending', 'confirmed_true', 'confirmed_false', 'partially_true', 'unresolvable'
);

create type aging_verdict as enum (
  'aged_well', 'aged_poorly', 'neutral', 'too_soon'
);

-- ─── Experts ─────────────────────────────────────────────────────────────────
create table experts (
  expert_id          uuid        primary key default uuid_generate_v4(),
  date_added         timestamptz not null    default now(),

  name               text        not null,
  twitter_handle     text        unique,
  outlet             text,
  sport_focus        text[]      not null    default '{}',
  bio                text,
  avatar_url         text,

  -- rolling stats, refreshed by trigger on takes
  overall_rating     numeric(4,1) not null   default 0,
  total_takes        integer      not null   default 0,
  graded_takes       integer      not null   default 0,
  accuracy_rate      numeric(4,1) not null   default 0,
  boldness_avg       numeric(4,1) not null   default 0,
  accountability_score integer    not null   default 50,
  flip_count         integer      not null   default 0
);

-- ─── Takes ───────────────────────────────────────────────────────────────────
create table takes (
  take_id            uuid         primary key default uuid_generate_v4(),
  expert_id          uuid         not null references experts (expert_id) on delete cascade,
  date_submitted     timestamptz  not null default now(),

  -- Core
  raw_text           text         not null,
  source_url         text,
  source_type        source_type  not null,
  date_made          date         not null,

  -- AI-generated rating fields
  take_type          take_type,
  sport              text,
  subjects           text[]       not null default '{}',
  difficulty_score   integer      check (difficulty_score between 1 and 10),
  falsifiability_score integer    check (falsifiability_score between 1 and 10),
  confidence_claimed integer      check (confidence_claimed between 1 and 10),
  time_horizon       time_horizon,
  time_horizon_date  date,
  summary            text,
  grading_criteria   text,
  flags              text[]       not null default '{}',
  rating_status      rating_status not null default 'pending',

  -- Outcome
  outcome_status     outcome_status not null default 'pending',
  outcome_date       date,
  outcome_notes      text,
  outcome_source_url text,

  -- Grading
  grade              integer      check (grade between 0 and 100),
  grade_breakdown    jsonb,
  grade_notes        text,
  aging_verdict      aging_verdict,

  -- Flip tracking
  related_take_ids   uuid[]       not null default '{}',
  is_flip            boolean      not null default false
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
create index takes_expert_id_idx        on takes (expert_id);
create index takes_sport_idx            on takes (sport);
create index takes_outcome_status_idx   on takes (outcome_status);
create index takes_time_horizon_date_idx on takes (time_horizon_date);
create index takes_date_made_idx        on takes (date_made desc);

-- ─── Expert stats trigger ─────────────────────────────────────────────────────
create or replace function refresh_expert_stats()
returns trigger language plpgsql as $$
declare
  v_expert_id uuid;
begin
  v_expert_id := coalesce(new.expert_id, old.expert_id);

  update experts
  set
    total_takes   = (
      select count(*) from takes where expert_id = v_expert_id
    ),
    graded_takes  = (
      select count(*) from takes where expert_id = v_expert_id and grade is not null
    ),
    overall_rating = (
      select coalesce(avg(grade), 0) from takes where expert_id = v_expert_id and grade is not null
    ),
    -- accuracy_rate = % of decided falsifiable takes that were confirmed true
    accuracy_rate = (
      select case
        when count(*) filter (where outcome_status in ('confirmed_true','confirmed_false','partially_true')) = 0 then 0
        else round(
          100.0
          * count(*) filter (where outcome_status = 'confirmed_true')
          / count(*) filter (where outcome_status in ('confirmed_true','confirmed_false','partially_true')),
          1
        )
      end
      from takes
      where expert_id = v_expert_id and falsifiability_score >= 6
    ),
    boldness_avg  = (
      select coalesce(avg(difficulty_score), 0) from takes where expert_id = v_expert_id and difficulty_score is not null
    ),
    flip_count    = (
      select count(*) from takes where expert_id = v_expert_id and is_flip = true
    ),
    -- accountability_score: weighted composite (0–100)
    -- 60% accuracy, 20% boldness (normalized), 20% penalty for flips
    accountability_score = (
      select greatest(0, least(100, round(
        0.6 * coalesce(avg(grade) filter (where grade is not null), 50)
        + 0.2 * coalesce(avg(difficulty_score) filter (where difficulty_score is not null), 5) * 10
        - 0.2 * (count(*) filter (where is_flip = true)::numeric / greatest(count(*), 1)) * 100
      )::integer))
      from takes where expert_id = v_expert_id
    )
  where expert_id = v_expert_id;

  return null;
end;
$$;

create trigger takes_refresh_expert_stats
  after insert or update or delete on takes
  for each row execute function refresh_expert_stats();

-- ─── Row-Level Security ───────────────────────────────────────────────────────
alter table experts enable row level security;
alter table takes    enable row level security;

create policy "experts: public read"
  on experts for select using (true);

create policy "experts: authenticated insert"
  on experts for insert with check (auth.role() = 'authenticated');

create policy "experts: authenticated update"
  on experts for update using (auth.role() = 'authenticated');

create policy "takes: public read"
  on takes for select using (true);

create policy "takes: authenticated insert"
  on takes for insert with check (auth.role() = 'authenticated');

create policy "takes: authenticated update"
  on takes for update using (auth.role() = 'authenticated');
