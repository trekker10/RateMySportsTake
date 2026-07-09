-- Add vote boost columns to takes table for admin seeding
alter table takes
  add column if not exists vote_boost_well   integer not null default 0,
  add column if not exists vote_boost_poorly integer not null default 0;
