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

    const { panelId } = await req.json();

    // Validate panelId is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!panelId || !uuidRegex.test(panelId)) {
      throw new Error('Invalid panel ID');
    }

    // Fetch the panel with pitch data
    const { data: panel, error: panelError } = await supabase
      .from('panels')
      .select(`
        *,
        pitch:pitches(*)
      `)
      .eq('id', panelId)
      .single();

    if (panelError || !panel) {
      throw new Error('Panel not found');
    }

    // Check ownership
    if (panel.pitch.user_id !== user.id) {
      throw new Error('Unauthorized: You do not own this panel');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const personas = panel.personas as any[];
    const askAmount = panel.pitch.ask_amount;
    const equityPercent = panel.pitch.equity_percent;

    // Filter participating investors (those with offers > 0)
    const participants = personas.filter((p: any) => p.offerAmount > 0);
    const totalOffered = participants.reduce((sum: number, p: any) => sum + p.offerAmount, 0);

    // Calculate allocations
    const allocations = participants.map((p: any) => {
      const percentage = (p.offerAmount / askAmount) * 100;
      const equityShare = (p.offerAmount / askAmount) * equityPercent;
      return {
        investor: p.name,
        role: p.role,
        amount: p.offerAmount,
        percentageOfDeal: percentage,
        equityShare: equityShare,
        reason: p.offerReason
      };
    });

    // Calculate post-money valuation
    const postMoneyValuation = (askAmount / (equityPercent / 100));

    const dealTerms = {
      askAmount,
      equityPercent,
      totalOffered,
      postMoneyValuation,
      allocations,
      fundingStatus: totalOffered >= askAmount ? 'fully_funded' : 'partially_funded',
      shortfall: totalOffered < askAmount ? askAmount - totalOffered : 0
    };

    // Create deal in database
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .insert({
        panel_id: panelId,
        status: 'draft',
        deal_terms: dealTerms
      })
      .select()
      .single();

    if (dealError) {
      console.error('Database error:', dealError);
      throw new Error('Failed to create deal');
    }

    console.log('Deal created:', deal.id);

    return new Response(JSON.stringify({ deal, dealTerms }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-deal:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
