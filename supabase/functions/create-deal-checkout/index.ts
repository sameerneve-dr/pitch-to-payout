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

    const origin = req.headers.get('origin') || Deno.env.get('APP_DOMAIN') || 'https://investor-panel.lovable.app';

    const FLOWGLAD_SECRET_KEY = Deno.env.get('FLOWGLAD_SECRET_KEY');

    if (!FLOWGLAD_SECRET_KEY) {
      console.error('Missing FLOWGLAD_SECRET_KEY');
      throw new Error('Payment system not configured. Please set FLOWGLAD_SECRET_KEY.');
    }

    // Use priceSlug instead of priceId
    const priceSlug = 'investor_panel_demo';

    // Build customer data
    const customerExternalId = user.id;
    const startupName = deal.panel.pitch.startup_name || 'Startup';

    console.log('Creating checkout for deal:', dealId);
    console.log('Customer externalId:', customerExternalId);
    console.log('Using priceSlug:', priceSlug);

    // Create checkout session using customerExternalId and priceSlug per Flowglad docs
    const checkoutPayload = {
      checkoutSession: {
        customerExternalId,
        priceSlug,
        successUrl: `${origin}/success?deal_id=${dealId}`,
        cancelUrl: `${origin}/deal/${dealId}`,
        type: 'product',
        outputName: `Investment in ${startupName}`,
        outputMetadata: {
          deal_id: dealId,
          user_id: user.id,
          startup_name: startupName,
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
      console.error('Checkout API error:', checkoutText);
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
    if (!checkoutUrl) {
      console.error('No checkout URL in response:', checkoutData);
      throw new Error('No checkout URL received from payment system');
    }

    // Update deal status
    await supabase
      .from('deals')
      .update({ 
        status: 'accepted',
        checkout_url: checkoutUrl,
      })
      .eq('id', dealId);

    console.log('Checkout created for deal:', dealId);

    return new Response(JSON.stringify({ url: checkoutUrl }), {
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
