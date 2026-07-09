-- ── Crowd Forecast: take_votes table ─────────────────────────────────────────

create table take_votes (
  vote_id         uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,

  take_id         text references takes(take_id) on delete cascade,
  fantasy_take_id text references fantasy_takes(fantasy_take_id) on delete cascade,

  vote            text not null check (vote in ('well', 'poorly')),
  vote_outcome    text check (vote_outcome in ('correct', 'incorrect')),

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint one_take_type check (
    (take_id is not null and fantasy_take_id is null) or
    (take_id is null and fantasy_take_id is not null)
  )
);

-- one vote per user per take
create unique index uq_vote_standard on take_votes(user_id, take_id)          where take_id is not null;
create unique index uq_vote_fantasy  on take_votes(user_id, fantasy_take_id)  where fantasy_take_id is not null;

-- fast tally queries
create index idx_votes_take_id         on take_votes(take_id)         where take_id is not null;
create index idx_votes_fantasy_take_id on take_votes(fantasy_take_id) where fantasy_take_id is not null;

alter table take_votes enable row level security;

create policy "votes are publicly readable"
  on take_votes for select using (true);

create policy "users can insert their own vote"
  on take_votes for insert with check (auth.uid() = user_id);

create policy "users can update their own vote"
  on take_votes for update using (auth.uid() = user_id);

create policy "users can delete their own vote"
  on take_votes for delete using (auth.uid() = user_id);


-- ── Trigger: score votes when a standard take is graded ──────────────────────
-- outcome_status values: confirmed_true → well wins; confirmed_false → poorly wins

create or replace function score_take_votes() returns trigger as $$
declare
  aged_side text;
begin
  if new.outcome_status = 'confirmed_true' then
    aged_side := 'well';
  elsif new.outcome_status in ('confirmed_false', 'partially_true') then
    aged_side := 'poorly';
  else
    return new;  -- pending / unresolvable → no scoring
  end if;

  update take_votes
  set
    vote_outcome = case when vote = aged_side then 'correct' else 'incorrect' end,
    updated_at   = now()
  where take_id = new.take_id
    and vote_outcome is null;

  return new;
end;
$$ language plpgsql security definer;

create trigger trg_score_take_votes
  after update of outcome_status on takes
  for each row execute function score_take_votes();


-- ── Trigger: score votes when a fantasy take is graded ───────────────────────

create or replace function score_fantasy_take_votes() returns trigger as $$
declare
  aged_side text;
begin
  if new.outcome_status = 'resolved_correct' then
    aged_side := 'well';
  elsif new.outcome_status = 'resolved_incorrect' then
    aged_side := 'poorly';
  else
    return new;
  end if;

  update take_votes
  set
    vote_outcome = case when vote = aged_side then 'correct' else 'incorrect' end,
    updated_at   = now()
  where fantasy_take_id = new.fantasy_take_id
    and vote_outcome is null;

  return new;
end;
$$ language plpgsql security definer;

create trigger trg_score_fantasy_take_votes
  after update of outcome_status on fantasy_takes
  for each row execute function score_fantasy_take_votes();


-- ── Voter accuracy view ───────────────────────────────────────────────────────

create view user_forecast_accuracy as
select
  user_id,
  count(*)                                                    as total_votes_cast,
  count(*) filter (where vote_outcome is not null)            as resolved_votes,
  count(*) filter (where vote_outcome = 'correct')            as correct_votes,
  count(*) filter (where vote_outcome = 'incorrect')          as incorrect_votes,
  round(
    100.0 * count(*) filter (where vote_outcome = 'correct')
    / nullif(count(*) filter (where vote_outcome is not null), 0)
  , 1)                                                        as accuracy_pct
from take_votes
group by user_id;
