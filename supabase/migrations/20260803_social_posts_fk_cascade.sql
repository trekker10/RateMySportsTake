-- Fix: social_posts.source_take_id blocks analyst/take deletion.
-- Drop the existing foreign key and re-add it with ON DELETE SET NULL
-- so deleting a take nulls the reference rather than raising an error.

alter table social_posts
  drop constraint if exists social_posts_source_take_id_fkey;

alter table social_posts
  add constraint social_posts_source_take_id_fkey
  foreign key (source_take_id)
  references takes(take_id)
  on delete set null;
