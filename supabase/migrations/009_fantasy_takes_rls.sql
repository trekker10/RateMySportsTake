-- Enable RLS on fantasy_takes and add public read policy
-- (Mirrors the pattern used for experts and takes in migration 001)
ALTER TABLE fantasy_takes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fantasy_takes: public read"
  ON fantasy_takes FOR SELECT USING (true);

CREATE POLICY "fantasy_takes: authenticated insert"
  ON fantasy_takes FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "fantasy_takes: authenticated update"
  ON fantasy_takes FOR UPDATE USING (auth.role() = 'authenticated');
