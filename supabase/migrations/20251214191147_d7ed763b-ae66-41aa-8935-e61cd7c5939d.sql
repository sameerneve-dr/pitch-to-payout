-- Drop the old stage enum and create a new one with correct values
-- First, update existing data to use new values
UPDATE public.pitches SET stage = 'Seed' WHERE stage = 'MVP';
UPDATE public.pitches SET stage = 'Seed' WHERE stage = 'Pre-seed';
UPDATE public.pitches SET stage = 'Seed' WHERE stage = 'Growth';

-- Drop the old enum type and recreate
ALTER TABLE public.pitches ALTER COLUMN stage TYPE text;

DROP TYPE IF EXISTS public.stage;

CREATE TYPE public.stage AS ENUM ('Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C');

ALTER TABLE public.pitches ALTER COLUMN stage TYPE public.stage USING stage::public.stage;