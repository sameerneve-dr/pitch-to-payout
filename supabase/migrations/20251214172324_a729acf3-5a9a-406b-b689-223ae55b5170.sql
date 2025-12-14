-- Create startup_pitches table
CREATE TABLE public.startup_pitches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id TEXT UNIQUE,
  startup_name TEXT NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C')),
  ask_amount NUMERIC NOT NULL,
  equity_percent NUMERIC NOT NULL,
  arr NUMERIC,
  mrr NUMERIC,
  pitch_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create investors table
CREATE TABLE public.investors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id TEXT UNIQUE,
  name TEXT NOT NULL,
  job_title TEXT,
  investor_type TEXT,
  companies_invested TEXT,
  risk_tolerance TEXT CHECK (risk_tolerance IN ('Low', 'Medium', 'High')),
  investment_thesis TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS but allow public read for demo mode
ALTER TABLE public.startup_pitches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Anyone can read startup_pitches" ON public.startup_pitches FOR SELECT USING (true);
CREATE POLICY "Anyone can read investors" ON public.investors FOR SELECT USING (true);

-- Allow authenticated users to insert (for seeding)
CREATE POLICY "Authenticated users can insert startup_pitches" ON public.startup_pitches FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can insert investors" ON public.investors FOR INSERT TO authenticated WITH CHECK (true);

-- Allow authenticated users to delete (for re-seeding)
CREATE POLICY "Authenticated users can delete startup_pitches" ON public.startup_pitches FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete investors" ON public.investors FOR DELETE TO authenticated USING (true);