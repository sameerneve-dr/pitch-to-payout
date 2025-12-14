-- Create payment_events table for logging Flowglad events
CREATE TABLE IF NOT EXISTS public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  event_data jsonb,
  received_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

-- Allow users to view only their own related events in the future if we add user_id
CREATE POLICY "Users can view their own payment_events"
  ON public.payment_events
  FOR SELECT
  USING (true); -- For now, events are not user-scoped but only accessible via backend
