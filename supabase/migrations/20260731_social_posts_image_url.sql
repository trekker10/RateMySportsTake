-- Add image_url column to social_posts
-- Stores the URL/path of the receipt PNG attached to a post
alter table social_posts add column image_url text;
