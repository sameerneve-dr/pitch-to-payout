-- Drop the existing check constraint on startup_pitches
ALTER TABLE startup_pitches DROP CONSTRAINT IF EXISTS startup_pitches_stage_check;

-- Update the stages to valid values
UPDATE startup_pitches SET stage = 'Pre-seed' WHERE stage = 'Pre-Seed';
UPDATE startup_pitches SET stage = 'Growth' WHERE stage IN ('Series A', 'Series B', 'Series C');

-- Add a new check constraint with valid values
ALTER TABLE startup_pitches ADD CONSTRAINT startup_pitches_stage_check 
CHECK (stage IN ('MVP', 'Pre-seed', 'Seed', 'Growth'));