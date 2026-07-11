-- Fix accuracy_rate calculation: remove the falsifiability_score >= 6 filter
-- that was silently excluding most graded takes from the accuracy count.
-- All takes with a decided outcome (confirmed_true / confirmed_false / partially_true)
-- now count toward accuracy regardless of falsifiability score.

create or replace function refresh_expert_stats()
returns trigger language plpgsql as $$
declare
  v_expert_id uuid;
begin
  v_expert_id := coalesce(new.expert_id, old.expert_id);

  update experts set
    total_takes = (
      select count(*) from takes where expert_id = v_expert_id
    ),
    graded_takes = (
      select count(*) from takes where expert_id = v_expert_id and grade is not null
    ),
    overall_rating = (
      select coalesce(avg(grade), 0) from takes where expert_id = v_expert_id and grade is not null
    ),
    -- accuracy_rate = % of decided takes that were confirmed true
    -- No falsifiability filter — all takes with a clear outcome count
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
      where expert_id = v_expert_id
    )
  where expert_id = v_expert_id;

  return null;
end;
$$;

-- Backfill all existing experts with the corrected formula
update experts e set
  total_takes = (
    select count(*) from takes t where t.expert_id = e.expert_id
  ),
  graded_takes = (
    select count(*) from takes t where t.expert_id = e.expert_id and t.grade is not null
  ),
  overall_rating = (
    select coalesce(avg(t.grade), 0) from takes t where t.expert_id = e.expert_id and t.grade is not null
  ),
  accuracy_rate = (
    select case
      when count(*) filter (where t.outcome_status in ('confirmed_true','confirmed_false','partially_true')) = 0 then 0
      else round(
        100.0
        * count(*) filter (where t.outcome_status = 'confirmed_true')
        / count(*) filter (where t.outcome_status in ('confirmed_true','confirmed_false','partially_true')),
        1
      )
    end
    from takes t where t.expert_id = e.expert_id
  );
