import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const event = await req.json();
    
    console.log('Webhook received:', JSON.stringify(event));

    const eventType = event?.type || event?.event?.type;
    const eventData = event?.data || event?.event?.data;

    // Log the event for debugging
    await supabase
      .from('payment_events')
      .insert({
        event_type: eventType,
        event_data: eventData,
        received_at: new Date().toISOString(),
      })
      .select()
      .single();

    // Handle different event types
    if (eventType === 'checkout_session.succeeded' || eventType === 'payment.succeeded') {
      const sessionId = eventData?.id || eventData?.checkoutSessionId;
      const metadata = eventData?.outputMetadata || eventData?.metadata || {};
      
      console.log('Payment succeeded:', { sessionId, metadata });

      // Check if this is a subscription or deal payment
      if (metadata.deal_id) {
        // Deal payment
        await supabase
          .from('deals')
          .update({ 
            status: 'paid',
            flowglad_reference: sessionId,
          })
          .eq('id', metadata.deal_id);
        
        console.log('Updated deal via webhook:', metadata.deal_id);
      } else if (metadata.user_id) {
        // Subscription payment
        const plan = metadata.plan || 'plus';
        await supabase
          .from('profiles')
          .upsert({
            user_id: metadata.user_id,
            plan,
            plan_status: 'active',
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id',
          });
        
        console.log('Updated subscription via webhook:', metadata.user_id, plan);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in flowglad-webhook:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
