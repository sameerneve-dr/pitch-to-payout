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

    // Get billing status from local profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('plan, plan_status')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.log('Profile not found for user:', user.id, profileError);
      // Return free status if no profile exists
      return new Response(JSON.stringify({ 
        isActive: false,
        plan: 'free',
        customerId: null,
        subscriptions: []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isActive = profile.plan_status === 'active' && profile.plan !== 'free';
    const plan = profile.plan || 'free';

    console.log('Billing status fetched for user:', user.id, { isActive, plan });

    return new Response(JSON.stringify({ 
      isActive,
      plan,
      customerId: user.id,
      subscriptions: isActive ? [{ status: 'active', plan }] : []
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
