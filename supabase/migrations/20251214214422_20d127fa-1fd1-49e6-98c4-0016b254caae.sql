-- Add name column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name text;

-- Update the handle_new_user function to copy the name from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name')
  ON CONFLICT (user_id) DO UPDATE SET name = EXCLUDED.name;
  RETURN NEW;
END;
$$;