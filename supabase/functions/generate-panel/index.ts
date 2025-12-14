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

    const { pitchId, rawPitch, askAmount, equityPercent, startupName, stage, arr, demoInvestors } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    // Build investor context if demo investors provided
    const investorContext = demoInvestors && demoInvestors.length > 0
      ? `\n\nUse these REAL investors for the panel (use their exact names and roles, but generate appropriate questions and offers based on their thesis and risk appetite):\n${demoInvestors.map((inv: any) => `- ${inv.name} (${inv.role}): Thesis: "${inv.thesis}", Risk: ${inv.riskAppetite}`).join('\n')}`
      : '';

    const personaCount = demoInvestors?.length || 4;

    const systemPrompt = `You are an AI that generates investor personas for a Shark Tank-style funding panel.

Given a startup pitch, generate exactly ${personaCount} investor personas. Each persona should have:
- name: A realistic investor name
- role: One of "Angel Investor", "VC Partner", "CEO-Operator", "Shark"
- thesis: A one-liner investment thesis (what they look for)
- riskAppetite: "Low", "Medium", or "High"
- questions: Array of 1-2 sharp, relevant questions about the business (traction, GTM, moat, churn, CAC, competition)
- riskNote: 1-2 sentence risk assessment
- offerAmount: A number (can be 0 if they pass, otherwise a portion of the ask)
- offerReason: 1-2 sentence reason for their offer

Make the offers realistic - some investors might pass (offer 0), some might offer partial amounts. Total offers should roughly equal or exceed the ask amount if the pitch is compelling.

Return ONLY valid JSON in this exact format:
{
  "personas": [
    {
      "name": "string",
      "role": "string",
      "thesis": "string",
      "riskAppetite": "Low" | "Medium" | "High",
      "questions": ["string", "string"],
      "riskNote": "string",
      "offerAmount": number,
      "offerReason": "string"
    }
  ]
}`;

    const userPrompt = `Generate an investor panel for this pitch:

Startup: ${startupName || 'Unnamed startup'}
Stage: ${stage || 'Unknown'}
ARR: $${arr || 0}
Asking: $${askAmount} for ${equityPercent}% equity

Pitch: "${rawPitch}"${investorContext}`;

    console.log('Generating panel for pitch:', pitchId);

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error('Failed to generate panel from AI');
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content;
    
    // Parse the JSON from the response
    let panelData;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      let jsonStr = jsonMatch ? jsonMatch[1] : content;
      
      // Clean up common JSON issues
      jsonStr = jsonStr.trim();
      // Remove trailing commas before ] or }
      jsonStr = jsonStr.replace(/,(\s*[\]}])/g, '$1');
      
      panelData = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      console.error('Parse error:', e);
      throw new Error('Invalid AI response format');
    }

    // Create panel in database
    const { data: panel, error: panelError } = await supabase
      .from('panels')
      .insert({
        pitch_id: pitchId,
        personas: panelData.personas,
        questions: panelData.personas.flatMap((p: any) => p.questions.map((q: string) => ({ investor: p.name, question: q }))),
        offers: panelData.personas.map((p: any) => ({ investor: p.name, amount: p.offerAmount, reason: p.offerReason }))
      })
      .select()
      .single();

    if (panelError) {
      console.error('Database error:', panelError);
      throw new Error('Failed to save panel');
    }

    console.log('Panel created:', panel.id);

    return new Response(JSON.stringify({ panel }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-panel:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
