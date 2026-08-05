-- Add reply_to_url column for subtweet_ack template
-- Stores the original tweet URL so Typefully can post as a reply
alter table social_posts add column reply_to_url text;
