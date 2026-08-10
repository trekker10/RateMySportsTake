-- Add 1-5 player rating to fantasy_takes
-- Used by Instagram video extraction: 5=strong buy/breakout, 3=neutral, 1=strong avoid/bust
alter table fantasy_takes
  add column if not exists player_rating smallint check (player_rating between 1 and 5);
