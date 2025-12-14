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

    const { dealId, counterOffer } = await req.json();

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
      throw new Error('Deal not found');
    }

    // Check ownership
    if (deal.panel.pitch.user_id !== user.id) {
      throw new Error('Unauthorized: You do not own this deal');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const originalTerms = deal.deal_terms as any;
    const askAmount = originalTerms.askAmount;
    const equityPercent = originalTerms.equityPercent;

    // Build prompt for AI to generate investor responses to counter-offer
    const counterAllocations = counterOffer.allocations.filter((a: any) => a.isIncluded);
    
    const investorSummary = counterAllocations.map((a: any) => 
      `- ${a.investor} (${a.role}): Founder wants $${a.amount.toLocaleString()} for ${a.equityShare.toFixed(1)}% equity` +
      (a.royaltyPercent > 0 ? ` + ${a.royaltyPercent}% royalty` : '')
    ).join('\n');

    const prompt = `You are simulating investor responses to a founder's counter-offer in a funding negotiation.

STARTUP: ${deal.panel.pitch.startup_name || 'Startup'}
ORIGINAL ASK: $${askAmount.toLocaleString()} for ${equityPercent}% equity

FOUNDER'S COUNTER-OFFER:
${investorSummary}

For each investor, decide if they:
1. ACCEPT the counter-offer as-is
2. Make a FINAL counter (small adjustment - within 20% of their position)
3. DECLINE to participate

Rules:
- Investors are more likely to accept reasonable terms
- If founder asks for more money than originally offered, investor may decline or counter lower
- If founder offers less equity than proportional, investor may want more equity or decline
- Keep responses punchy - 1 sentence reasoning max

Respond in JSON format:
{
  "finalOffers": [
    {
      "investor": "Name",
      "role": "Role",
      "status": "accepted" | "countered" | "declined",
      "finalAmount": number,
      "finalEquity": number,
      "finalRoyalty": number,
      "response": "One sentence response"
    }
  ]
}`;

    console.log('Generating investor responses for deal:', dealId);

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-5-mini',
        messages: [
          { role: 'system', content: 'You are a venture capital simulation AI. Respond only with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: 1500,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error('Failed to generate investor responses');
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0]?.message?.content || '';
    
    // Parse JSON from response
    let finalOffers;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        finalOffers = JSON.parse(jsonMatch[0]).finalOffers;
      } else {
        throw new Error('No JSON found');
      }
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      // Fallback: accept all counter-offers as-is
      finalOffers = counterAllocations.map((a: any) => ({
        investor: a.investor,
        role: a.role,
        status: 'accepted',
        finalAmount: a.amount,
        finalEquity: a.equityShare,
        finalRoyalty: a.royaltyPercent,
        response: "Deal accepted."
      }));
    }

    // Build final allocations
    const finalAllocations = finalOffers
      .filter((f: any) => f.status !== 'declined')
      .map((f: any) => ({
        investor: f.investor,
        role: f.role,
        amount: f.finalAmount,
        equityShare: f.finalEquity,
        royaltyPercent: f.finalRoyalty || 0,
        percentageOfDeal: (f.finalAmount / askAmount) * 100,
        reason: f.response,
        status: f.status,
        isIncluded: true
      }));

    const totalOffered = finalAllocations.reduce((sum: number, a: any) => sum + a.amount, 0);
    const totalEquityGiven = finalAllocations.reduce((sum: number, a: any) => sum + a.equityShare, 0);

    const finalDealTerms = {
      ...originalTerms,
      negotiationRound: 'final',
      counterOffer: counterOffer,
      finalAllocations: finalAllocations,
      declinedInvestors: finalOffers.filter((f: any) => f.status === 'declined'),
      totalOffered: totalOffered,
      totalEquityGiven: totalEquityGiven,
      fundingStatus: totalOffered >= askAmount ? 'fully_funded' : 'partially_funded',
      shortfall: totalOffered < askAmount ? askAmount - totalOffered : 0,
    };

    // Update deal with final terms
    const { error: updateError } = await supabase
      .from('deals')
      .update({ 
        deal_terms: finalDealTerms,
        status: 'draft' // Still draft until accepted
      })
      .eq('id', dealId);

    if (updateError) {
      console.error('Update error:', updateError);
      throw new Error('Failed to save final offer');
    }

    console.log('Final offer generated for deal:', dealId);

    return new Response(JSON.stringify({ 
      success: true,
      finalOffers: finalOffers,
      finalAllocations: finalAllocations,
      totalOffered: totalOffered,
      declinedCount: finalOffers.filter((f: any) => f.status === 'declined').length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-counter-response:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
