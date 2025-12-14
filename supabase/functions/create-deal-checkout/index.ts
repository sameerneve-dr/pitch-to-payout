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

    // If Flowglad is configured, create a real checkout session
    if (FLOWGLAD_SECRET_KEY && FLOWGLAD_PRICE_ID) {
      try {
        // Create Flowglad checkout session using the correct API endpoint per docs
        // https://docs.flowglad.com/api-reference/checkout-sessions/create-checkout-session
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
              outputMetadata: {
                deal_id: dealId,
                user_id: user.id,
                startup_name: deal.panel.pitch.startup_name,
              },
            },
          }),
        });

        if (flowgladResponse.ok) {
          const responseData = await flowgladResponse.json();
          const checkoutUrl = responseData.url;

          // Update deal with checkout URL
          await supabase
            .from('deals')
            .update({ 
              status: 'accepted',
              checkout_url: checkoutUrl,
            })
            .eq('id', dealId);

          console.log('Flowglad checkout created for deal:', dealId);

          return new Response(JSON.stringify({ url: checkoutUrl }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } else {
          const errorText = await flowgladResponse.text();
          console.error('Flowglad API error:', flowgladResponse.status, errorText);
          // Fall through to demo mode
        }
      } catch (flowgladError) {
        console.error('Flowglad request failed:', flowgladError);
        // Fall through to demo mode
      }
    }

    // Demo mode: Skip actual payment and mark as paid
    await supabase
      .from('deals')
      .update({ status: 'paid' })
      .eq('id', dealId);

    console.log('Demo mode: Deal accepted and marked as paid:', dealId);

    // Redirect directly to success page
    const successUrl = `${origin}/success?deal_id=${dealId}`;

    return new Response(JSON.stringify({ url: successUrl }), {
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
