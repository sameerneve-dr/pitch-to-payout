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
      throw new Error('Unauthorized');
    }

    const FLOWGLAD_SECRET_KEY = Deno.env.get('FLOWGLAD_SECRET_KEY');
    const APP_DOMAIN = Deno.env.get('APP_DOMAIN');
    
    if (!FLOWGLAD_SECRET_KEY) throw new Error('FLOWGLAD_SECRET_KEY not configured');
    if (!APP_DOMAIN) throw new Error('APP_DOMAIN not configured');

    const dealTerms = deal.deal_terms as any;
    const askAmount = dealTerms.askAmount;

    // Update deal status to accepted
    await supabase
      .from('deals')
      .update({ status: 'accepted' })
      .eq('id', dealId);

    // Create Flowglad checkout session
    const flowgladResponse = await fetch('https://api.flowglad.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FLOWGLAD_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Investment in ${deal.panel.pitch.startup_name || 'Startup'}`,
                description: `${dealTerms.equityPercent}% equity stake - ${dealTerms.allocations?.length || 0} investors participating`,
              },
              unit_amount: Math.round(askAmount * 100), // Flowglad uses cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${APP_DOMAIN}/success?deal_id=${dealId}`,
        cancel_url: `${APP_DOMAIN}/deal/${dealId}`,
        customer_email: user.email,
        metadata: {
          deal_id: dealId,
          user_id: user.id,
          startup_name: deal.panel.pitch.startup_name || 'Unnamed',
        },
      }),
    });

    if (!flowgladResponse.ok) {
      const errorText = await flowgladResponse.text();
      console.error('Flowglad API error:', flowgladResponse.status, errorText);
      throw new Error(`Flowglad error: ${flowgladResponse.status}`);
    }

    const checkoutSession = await flowgladResponse.json();

    // Update deal with checkout URL
    await supabase
      .from('deals')
      .update({ 
        checkout_url: checkoutSession.url,
        flowglad_reference: checkoutSession.id 
      })
      .eq('id', dealId);

    console.log('Checkout created for deal:', dealId);

    return new Response(JSON.stringify({ url: checkoutSession.url }), {
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
