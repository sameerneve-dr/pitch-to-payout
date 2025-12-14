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
    
    if (!FLOWGLAD_SECRET_KEY) throw new Error('FLOWGLAD_SECRET_KEY not configured');

    // Fetch customer billing status from Flowglad
    const flowgladResponse = await fetch(`https://api.flowglad.com/v1/customers/${user.id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${FLOWGLAD_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    // If customer doesn't exist yet, return inactive status
    if (flowgladResponse.status === 404) {
      return new Response(JSON.stringify({ 
        isActive: false,
        plan: 'free',
        customerId: null,
        subscriptions: []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!flowgladResponse.ok) {
      const errorText = await flowgladResponse.text();
      console.error('Flowglad API error:', flowgladResponse.status, errorText);
      throw new Error(`Flowglad error: ${flowgladResponse.status}`);
    }

    const customer = await flowgladResponse.json();

    // Check for active subscriptions
    const subscriptionsResponse = await fetch(`https://api.flowglad.com/v1/subscriptions?customer_id=${user.id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${FLOWGLAD_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    let subscriptions = [];
    let isActive = false;
    let plan = 'free';

    if (subscriptionsResponse.ok) {
      const subsData = await subscriptionsResponse.json();
      subscriptions = subsData.data || [];
      isActive = subscriptions.some((sub: any) => sub.status === 'active');
      if (isActive) {
        plan = 'pro';
      }
    }

    console.log('Billing status fetched for user:', user.id, { isActive, plan });

    return new Response(JSON.stringify({ 
      isActive,
      plan,
      customerId: customer.id,
      subscriptions
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in get-flowglad-billing:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
