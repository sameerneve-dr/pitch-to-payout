import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get request body
    const { plan } = await req.json();

    if (!plan || !['plus', 'pro'].includes(plan)) {
      return new Response(
        JSON.stringify({ error: "Invalid plan. Must be 'plus' or 'pro'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the appropriate price ID
    const priceId = plan === 'plus' 
      ? Deno.env.get("FLOWGLAD_PRICE_ID_PLUS")
      : Deno.env.get("FLOWGLAD_PRICE_ID_PRO");

    if (!priceId) {
      console.error(`Missing FLOWGLAD_PRICE_ID_${plan.toUpperCase()}`);
      return new Response(
        JSON.stringify({ error: "Price configuration missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const flowgladSecretKey = Deno.env.get("FLOWGLAD_SECRET_KEY");
    if (!flowgladSecretKey) {
      console.error("Missing FLOWGLAD_SECRET_KEY");
      return new Response(
        JSON.stringify({ error: "Payment configuration missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const origin = Deno.env.get("APP_DOMAIN") || req.headers.get("origin") || "https://investor-panel.lovable.app";

    console.log("Creating subscription checkout for plan:", plan);
    console.log("Using priceId:", priceId);

    // Create Flowglad checkout session
    const flowgladResponse = await fetch("https://app.flowglad.com/api/v1/checkout-sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${flowgladSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        checkoutSession: {
          priceId: priceId,
          quantity: 1,
          successUrl: `${origin}/subscription/success?plan=${plan}`,
          cancelUrl: `${origin}/pricing`,
          type: 'subscription',
          anonymous: true,
          outputName: `Investor Panel ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
          outputMetadata: {
            user_id: user.id,
            plan: plan
          }
        }
      }),
    });

    const responseText = await flowgladResponse.text();
    console.log("Flowglad response status:", flowgladResponse.status);
    console.log("Flowglad response:", responseText);

    let flowgladData;
    try {
      flowgladData = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse Flowglad response:", e);
      return new Response(
        JSON.stringify({ error: "Invalid response from payment system" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!flowgladResponse.ok) {
      console.error("Flowglad API error:", flowgladData);
      return new Response(
        JSON.stringify({ error: `Payment checkout failed: ${JSON.stringify(flowgladData)}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract checkout URL
    const checkoutUrl = flowgladData?.checkoutSession?.url || flowgladData?.url;
    
    if (!checkoutUrl) {
      console.error("No checkout URL in response:", flowgladData);
      return new Response(
        JSON.stringify({ error: "No checkout URL returned" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Checkout URL created:", checkoutUrl);

    return new Response(
      JSON.stringify({ checkout_url: checkoutUrl }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error creating subscription checkout:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
