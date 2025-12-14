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
    const FLOWGLAD_PRICE_ID = Deno.env.get('FLOWGLAD_PRICE_ID');

    if (!FLOWGLAD_SECRET_KEY) {
      console.error('Missing FLOWGLAD_SECRET_KEY');
      throw new Error('Payment system not configured. Please set FLOWGLAD_SECRET_KEY.');
    }

    if (!FLOWGLAD_PRICE_ID) {
      console.error('Missing FLOWGLAD_PRICE_ID');
      throw new Error('Deal price not configured. Please set FLOWGLAD_PRICE_ID.');
    }

    // Build customer data
    const externalId = user.id;
    const email = user.email || "demo@investorpanel.test";
    const name = user.user_metadata?.full_name || user.email?.split('@')[0] || "Demo User";

    console.log('Creating checkout for deal:', dealId);
    console.log('Customer externalId:', externalId);

    // Step 1: Ensure customer exists in Flowglad
    console.log('Ensuring Flowglad customer exists...');
    
    const customerPayload = {
      customer: {
        externalId,
        email,
        name,
      }
    };

    const customerResponse = await fetch('https://app.flowglad.com/api/v1/customers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FLOWGLAD_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(customerPayload),
    });

    const customerText = await customerResponse.text();
    console.log('Customer creation status:', customerResponse.status);

    let customerId: string | undefined;

    if (customerResponse.status === 200 || customerResponse.status === 201) {
      const customerData = JSON.parse(customerText);
      const createdCustomer = customerData?.data?.customer || customerData?.customer;
      customerId = createdCustomer?.id;
      console.log('Customer created, id present:', !!customerId);
    } else if (customerResponse.status === 409) {
      // Customer already exists
      console.log('Customer exists, fetching...');
      const getResponse = await fetch(`https://app.flowglad.com/api/v1/customers?externalId=${encodeURIComponent(externalId)}`, {
        headers: {
          'Authorization': `Bearer ${FLOWGLAD_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (getResponse.ok) {
        const getData = await getResponse.json();
        const firstCustomer = getData?.data?.[0] || getData?.customer || getData?.customers?.[0];
        customerId = firstCustomer?.id;
        console.log('Fetched customer id present:', !!customerId);
      } else {
        console.error('Failed to fetch existing customer, status:', getResponse.status);
      }
    } else {
      console.error('Customer creation failed with status:', customerResponse.status);
    }

    if (!customerId) {
      console.error('Could not obtain customer ID');
      throw new Error('Failed to create payment customer');
    }

    // Step 2: Create checkout session
    const dealTerms = deal.deal_terms as any;
    const startupName = deal.panel.pitch.startup_name || 'Startup';

    const checkoutPayload = {
      checkoutSession: {
        customerId,
        priceId: FLOWGLAD_PRICE_ID,
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

    console.log('Creating checkout session...');

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
