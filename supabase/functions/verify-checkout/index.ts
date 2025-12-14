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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { sessionId, source, dealId, plan } = await req.json();

    console.log('Verifying checkout:', { sessionId, source, dealId, plan, userId: user.id });

    const FLOWGLAD_SECRET_KEY = Deno.env.get('FLOWGLAD_SECRET_KEY');
    if (!FLOWGLAD_SECRET_KEY) {
      throw new Error('Payment system not configured');
    }

    // Fetch checkout session from Flowglad
    const sessionResponse = await fetch(`https://app.flowglad.com/api/v1/checkout-sessions/${sessionId}`, {
      headers: {
        'Authorization': `Bearer ${FLOWGLAD_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!sessionResponse.ok) {
      const errorText = await sessionResponse.text();
      console.error('Failed to fetch session:', errorText);
      throw new Error('Failed to verify payment');
    }

    const sessionData = await sessionResponse.json();
    console.log('Checkout session data:', JSON.stringify(sessionData));

    const session = sessionData?.checkoutSession || sessionData;
    const status = session?.status;

    console.log('Checkout status:', status);

    if (status !== 'succeeded') {
      return new Response(JSON.stringify({ 
        verified: false, 
        status,
        message: status === 'pending' ? 'Payment is still processing' : 'Payment not completed'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Payment succeeded - update database based on source
    if (source === 'subscription') {
      // Update user's subscription status
      await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          plan: plan || 'plus',
          plan_status: 'active',
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      console.log('Updated subscription for user:', user.id, 'to plan:', plan);
    } else if (source === 'deal' && dealId) {
      // Update deal status to paid
      await supabase
        .from('deals')
        .update({ 
          status: 'paid',
          flowglad_reference: sessionId,
        })
        .eq('id', dealId);

      console.log('Updated deal status to paid:', dealId);
    }

    return new Response(JSON.stringify({ 
      verified: true,
      status: 'succeeded',
      source,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in verify-checkout:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      verified: false,
      error: message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
