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

    const { dealId } = await req.json();

    // Validate dealId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!dealId || !uuidRegex.test(dealId)) {
      throw new Error('Invalid deal ID');
    }

    // Fetch deal with panel and pitch
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select(`
        *,
        panel:panels(
          *,
          pitch:pitches(*)
        )
      `)
      .eq('id', dealId)
      .single();

    if (dealError || !deal) {
      console.error('Deal fetch error:', dealError);
      throw new Error('Deal not found');
    }

    // Check ownership
    if (deal.panel.pitch.user_id !== user.id) {
      throw new Error('Unauthorized: You do not own this deal');
    }

    const appDomain = Deno.env.get('APP_DOMAIN');
    if (!appDomain) {
      console.error('Missing APP_DOMAIN environment variable');
      throw new Error('Server configuration error');
    }

    const FLOWGLAD_SECRET_KEY = Deno.env.get('FLOWGLAD_SECRET_KEY');
    
    if (!FLOWGLAD_SECRET_KEY) {
      console.error('Missing FLOWGLAD_SECRET_KEY');
      throw new Error('Payment system not configured. Please set FLOWGLAD_SECRET_KEY.');
    }

    // Use priceSlug per Flowglad API docs
    const priceSlug = 'investor_demo';

    const startupName = deal.panel.pitch.startup_name || 'Startup';

    console.log('Creating checkout for deal:', dealId);
    console.log('Using anonymous test checkout (no customerExternalId)');
    console.log('Using priceSlug:', priceSlug);
    console.log('APP_DOMAIN:', appDomain);

    // Return to checkout handler on success, back to deal on cancel
    const successUrl = `${appDomain}/checkout/return?source=deal&dealId=${dealId}&status=success`;
    const cancelUrl = `${appDomain}/deal/${dealId}?status=cancel`;

    console.log('=== FLOWGLAD URLs ===');
    console.log('APP_DOMAIN:', appDomain);
    console.log('SUCCESS_URL:', successUrl);
    console.log('CANCEL_URL:', cancelUrl);
    console.log('=====================');

    // Create checkout session using priceSlug per Flowglad docs
    const checkoutPayload = {
      checkoutSession: {
        priceSlug,
        successUrl,
        cancelUrl,
        type: 'product',
        anonymous: true,
        outputName: `Investment in ${startupName}`,
        outputMetadata: {
          deal_id: dealId,
          user_id: user.id,
          startup_name: startupName,
          source: 'deal',
        },
      },
    };

    console.log('Creating checkout session with payload:', JSON.stringify(checkoutPayload));

    const checkoutResponse = await fetch('https://app.flowglad.com/api/v1/checkout-sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FLOWGLAD_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(checkoutPayload),
    });

    const checkoutText = await checkoutResponse.text();
    console.log('Checkout status:', checkoutResponse.status);
    console.log('Checkout response:', checkoutText);

    if (!checkoutResponse.ok) {
      console.error('Checkout API error:', JSON.stringify(checkoutText));
      throw new Error(`Payment checkout failed: ${checkoutText}`);
    }

    let checkoutData;
    try {
      checkoutData = JSON.parse(checkoutText);
    } catch (e) {
      console.error('Failed to parse checkout response');
      throw new Error('Invalid response from payment system');
    }

    const checkoutUrl = checkoutData?.checkoutSession?.url || checkoutData?.url;
    const sessionId = checkoutData?.checkoutSession?.id || checkoutData?.id;
    
    if (!checkoutUrl) {
      console.error('No checkout URL in response:', JSON.stringify(checkoutData));
      throw new Error('No checkout URL received from payment system');
    }

    console.log('Checkout URL:', checkoutUrl, 'Session ID:', sessionId);

    // Update deal status
    await supabase
      .from('deals')
      .update({ 
        status: 'accepted',
        checkout_url: checkoutUrl,
        flowglad_reference: sessionId,
      })
      .eq('id', dealId);

    console.log('Checkout created for deal:', dealId, 'Session ID:', sessionId);

    return new Response(JSON.stringify({ 
      url: checkoutUrl,
      session_id: sessionId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in create-deal-checkout:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
