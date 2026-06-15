-- Classifier evaluation tables for /admin/eval-lab
-- Used to build labeled training/eval datasets for the tweet classifiers.

CREATE TABLE IF NOT EXISTS fantasy_classifier_eval (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  tweet_text       text        NOT NULL,
  your_label       text        NOT NULL CHECK (your_label IN ('yes', 'no', 'gray')),
  why              text,
  classifier_result jsonb,
  created_at       timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS standard_classifier_eval (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  tweet_text       text        NOT NULL,
  your_label       text        NOT NULL CHECK (your_label IN ('yes', 'no', 'gray')),
  why              text,
  classifier_result jsonb,
  created_at       timestamptz DEFAULT now()
);

-- Service role only — no public access
ALTER TABLE fantasy_classifier_eval  ENABLE ROW LEVEL SECURITY;
ALTER TABLE standard_classifier_eval ENABLE ROW LEVEL SECURITY;
