-- ─── TakeScore Config ────────────────────────────────────────────────────────
create table if not exists take_score_config (
  id text primary key default 'default',

  -- Accuracy tier values (A)
  accuracy_nailed        integer not null default 100,
  accuracy_mostly_right  integer not null default 75,
  accuracy_half_right    integer not null default 50,
  accuracy_mostly_wrong  integer not null default 25,
  accuracy_wrong         integer not null default 0,

  -- Boldness Credit (BC) tiers
  bc_moonshot_min   integer not null default 90,
  bc_moonshot_value integer not null default 15,
  bc_bold_min       integer not null default 70,
  bc_bold_value     integer not null default 8,
  bc_neutral_min    integer not null default 40,
  bc_neutral_value  integer not null default 0,
  bc_safe_value     integer not null default -10,

  -- Recency weights (R)
  recency_recent_count    integer not null default 5,
  recency_recent_weight   numeric not null default 1.5,
  recency_standard_weight numeric not null default 1.0,
  recency_old_days        integer not null default 730,
  recency_old_weight      numeric not null default 0.7,

  -- Volume multiplier (V)
  vol_high_takes         integer not null default 20,
  vol_high_boldness      numeric not null default 25,
  vol_high_mult          numeric not null default 1.0,
  vol_mid_takes          integer not null default 10,
  vol_mid_boldness       numeric not null default 25,
  vol_mid_mult           numeric not null default 0.9,
  vol_low_takes          integer not null default 5,
  vol_low_mult           numeric not null default 0.75,
  vol_min_mult           numeric not null default 0.60,
  vol_low_boldness_mult  numeric not null default 0.85,

  -- Decay multiplier (D)
  decay_30_mult   numeric not null default 1.0,
  decay_90_mult   numeric not null default 0.95,
  decay_180_mult  numeric not null default 0.85,
  decay_365_mult  numeric not null default 0.75,
  decay_old_mult  numeric not null default 0.65,

  -- Rolling window & normalization
  rolling_window        integer not null default 20,
  normalization_divisor numeric not null default 2.0,

  -- Metadata
  updated_at  timestamptz default now(),
  updated_by  text
);

insert into take_score_config (id) values ('default') on conflict (id) do nothing;

-- ─── Config Change Log ────────────────────────────────────────────────────────
create table if not exists config_change_log (
  id          uuid        primary key default gen_random_uuid(),
  changed_at  timestamptz not null default now(),
  changed_by  text        not null,
  changes     jsonb       not null
);

-- ─── Expert Accolades ─────────────────────────────────────────────────────────
create table if not exists expert_accolades (
  id          uuid        primary key default gen_random_uuid(),
  expert_id   uuid        not null references experts (expert_id) on delete cascade,
  key         text        not null,
  label       text        not null,
  emoji       text        not null,
  is_manual   boolean     not null default false,
  earned_at   timestamptz not null default now(),
  unique (expert_id, key)
);

-- ─── New columns on takes ─────────────────────────────────────────────────────
alter table takes
  add column if not exists accuracy_score  integer check (accuracy_score in (0,25,50,75,100)),
  add column if not exists boldness_score  integer check (boldness_score between 0 and 100),
  add column if not exists boldness_credit integer,
  add column if not exists recency_weight  numeric,
  add column if not exists impact_score    numeric;

-- ─── New columns on experts ───────────────────────────────────────────────────
alter table experts
  add column if not exists last_take_date    date,
  add column if not exists volume_mult       numeric not null default 0.6,
  add column if not exists decay_mult        numeric not null default 1.0,
  add column if not exists avg_impact        numeric not null default 0;

-- ─── Migrate existing data ────────────────────────────────────────────────────
-- Map AI grade → accuracy_score using spec tiers
update takes set
  accuracy_score = case
    when grade >= 88 then 100
    when grade >= 63 then 75
    when grade >= 38 then 50
    when grade >= 13 then 25
    else 0
  end,
  boldness_score = least(100, greatest(0, coalesce(difficulty_score * 10, 50)))
where grade is not null and accuracy_score is null;

-- ─── RLS ──────────────────────────────────────────────────────────────────────
alter table take_score_config enable row level security;
alter table config_change_log enable row level security;
alter table expert_accolades   enable row level security;

create policy "take_score_config: public read"
  on take_score_config for select using (true);
create policy "config_change_log: public read"
  on config_change_log for select using (true);
create policy "expert_accolades: public read"
  on expert_accolades for select using (true);
