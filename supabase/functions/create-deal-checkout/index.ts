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

    // Validate dealId is a valid UUID
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

    // Get origin from request headers for proper redirect
    const origin = req.headers.get('origin') || Deno.env.get('APP_DOMAIN') || 'https://60d2fa4c-076f-437b-95af-266b577faa03.lovableproject.com';

    const FLOWGLAD_SECRET_KEY = Deno.env.get('FLOWGLAD_SECRET_KEY');
    const FLOWGLAD_PRICE_ID = Deno.env.get('FLOWGLAD_PRICE_ID');

    // Require Flowglad configuration - no demo mode fallback
    if (!FLOWGLAD_SECRET_KEY || !FLOWGLAD_PRICE_ID) {
      console.error('Flowglad not configured. FLOWGLAD_SECRET_KEY:', !!FLOWGLAD_SECRET_KEY, 'FLOWGLAD_PRICE_ID:', !!FLOWGLAD_PRICE_ID);
      throw new Error('Payment system not configured. Please set FLOWGLAD_SECRET_KEY and FLOWGLAD_PRICE_ID.');
    }

    // Get the total investment amount from deal terms
    const dealTerms = deal.deal_terms as any;
    const includedAllocations = dealTerms?.allocations?.filter((a: any) => a.isIncluded !== false) || [];
    const totalAmount = includedAllocations.reduce((sum: number, a: any) => sum + (a.amount || 0), 0);

    console.log('Creating Flowglad checkout for deal:', dealId, 'amount:', totalAmount);

    // Create Flowglad checkout session
    const flowgladResponse = await fetch('https://app.flowglad.com/api/v1/checkout-sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FLOWGLAD_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        checkoutSession: {
          customerExternalId: user.id,
          priceId: FLOWGLAD_PRICE_ID,
          successUrl: `${origin}/success?deal_id=${dealId}`,
          cancelUrl: `${origin}/deal/${dealId}`,
          type: 'product',
          outputName: `Investment in ${deal.panel.pitch.startup_name || 'Startup'}`,
          outputMetadata: {
            deal_id: dealId,
            user_id: user.id,
            startup_name: deal.panel.pitch.startup_name,
            investment_amount: totalAmount,
          },
        },
      }),
    });

    const responseText = await flowgladResponse.text();
    console.log('Flowglad response status:', flowgladResponse.status);
    console.log('Flowglad response:', responseText);

    if (!flowgladResponse.ok) {
      console.error('Flowglad API error:', flowgladResponse.status, responseText);
      throw new Error(`Payment checkout failed: ${responseText}`);
    }

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse Flowglad response:', e);
      throw new Error('Invalid response from payment system');
    }

    const checkoutUrl = responseData.url;
    if (!checkoutUrl) {
      console.error('No checkout URL in response:', responseData);
      throw new Error('No checkout URL received from payment system');
    }

    // Update deal with checkout URL and status
    await supabase
      .from('deals')
      .update({ 
        status: 'accepted',
        checkout_url: checkoutUrl,
      })
      .eq('id', dealId);

    console.log('Flowglad checkout created for deal:', dealId, 'URL:', checkoutUrl);

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
