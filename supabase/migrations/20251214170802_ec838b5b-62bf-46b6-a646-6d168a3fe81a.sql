-- Create enum for deal status
CREATE TYPE public.deal_status AS ENUM ('draft', 'accepted', 'declined', 'paid');

-- Create enum for stage
CREATE TYPE public.stage AS ENUM ('MVP', 'Pre-seed', 'Seed', 'Growth');

-- Create pitches table
CREATE TABLE public.pitches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID NOT NULL,
  raw_pitch_text TEXT NOT NULL,
  startup_name TEXT,
  stage stage,
  arr NUMERIC,
  mrr NUMERIC,
  ask_amount NUMERIC NOT NULL,
  equity_percent NUMERIC NOT NULL,
  parsed_json JSONB
);

-- Create panels table
CREATE TABLE public.panels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pitch_id UUID NOT NULL REFERENCES public.pitches(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  personas JSONB NOT NULL DEFAULT '[]'::jsonb,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  offers JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- Create deals table
CREATE TABLE public.deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  panel_id UUID NOT NULL REFERENCES public.panels(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status deal_status NOT NULL DEFAULT 'draft',
  deal_terms JSONB,
  checkout_url TEXT,
  flowglad_reference TEXT
);

-- Enable RLS on all tables
ALTER TABLE public.pitches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.panels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

-- RLS policies for pitches
CREATE POLICY "Users can view their own pitches" 
ON public.pitches 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own pitches" 
ON public.pitches 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pitches" 
ON public.pitches 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pitches" 
ON public.pitches 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for panels (through pitch ownership)
CREATE POLICY "Users can view panels for their pitches" 
ON public.panels 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.pitches 
  WHERE pitches.id = panels.pitch_id 
  AND pitches.user_id = auth.uid()
));

CREATE POLICY "Users can create panels for their pitches" 
ON public.panels 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.pitches 
  WHERE pitches.id = panels.pitch_id 
  AND pitches.user_id = auth.uid()
));

CREATE POLICY "Users can update panels for their pitches" 
ON public.panels 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.pitches 
  WHERE pitches.id = panels.pitch_id 
  AND pitches.user_id = auth.uid()
));

-- RLS policies for deals (through panel/pitch ownership)
CREATE POLICY "Users can view deals for their panels" 
ON public.deals 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.panels 
  JOIN public.pitches ON pitches.id = panels.pitch_id 
  WHERE panels.id = deals.panel_id 
  AND pitches.user_id = auth.uid()
));

CREATE POLICY "Users can create deals for their panels" 
ON public.deals 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.panels 
  JOIN public.pitches ON pitches.id = panels.pitch_id 
  WHERE panels.id = deals.panel_id 
  AND pitches.user_id = auth.uid()
));

CREATE POLICY "Users can update deals for their panels" 
ON public.deals 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.panels 
  JOIN public.pitches ON pitches.id = panels.pitch_id 
  WHERE panels.id = deals.panel_id 
  AND pitches.user_id = auth.uid()
));