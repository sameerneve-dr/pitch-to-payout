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

    const FLOWGLAD_SECRET_KEY = Deno.env.get('FLOWGLAD_SECRET_KEY');
    const FLOWGLAD_PRICE_ID = Deno.env.get('FLOWGLAD_PRICE_ID');
    const APP_DOMAIN = Deno.env.get('APP_DOMAIN');
    
    if (!FLOWGLAD_SECRET_KEY) throw new Error('FLOWGLAD_SECRET_KEY not configured');
    if (!FLOWGLAD_PRICE_ID) throw new Error('FLOWGLAD_PRICE_ID not configured');
    if (!APP_DOMAIN) throw new Error('APP_DOMAIN not configured');

    // Create Flowglad checkout session for subscription/upgrade
    const flowgladResponse = await fetch('https://api.flowglad.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FLOWGLAD_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer_id: user.id,
        price_id: FLOWGLAD_PRICE_ID,
        success_url: `${APP_DOMAIN}/billing/success`,
        cancel_url: `${APP_DOMAIN}/billing/cancel`,
        customer_email: user.email,
        metadata: {
          user_id: user.id,
        },
      }),
    });

    if (!flowgladResponse.ok) {
      const errorText = await flowgladResponse.text();
      console.error('Flowglad API error:', flowgladResponse.status, errorText);
      throw new Error(`Flowglad error: ${flowgladResponse.status}`);
    }

    const checkoutSession = await flowgladResponse.json();

    console.log('Upgrade checkout created for user:', user.id);

    return new Response(JSON.stringify({ url: checkoutSession.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in create-flowglad-checkout:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
