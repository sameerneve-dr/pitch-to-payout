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

    // Get the appropriate price slug (using env if set, otherwise default demo slugs)
    const envPriceSlug = plan === "plus" 
      ? Deno.env.get("FLOWGLAD_PRICE_ID_PLUS")
      : Deno.env.get("FLOWGLAD_PRICE_ID_PRO");

    const defaultPriceSlug = plan === "plus" ? "investor_demo_plus" : "investor_demo_pro";
    const priceSlug = envPriceSlug || defaultPriceSlug;

    if (!priceSlug) {
      console.error(`Missing Flowglad price slug for plan: ${plan}`);
      return new Response(
        JSON.stringify({ error: "Price configuration missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!envPriceSlug) {
      console.log(
        `FLOWGLAD_PRICE_ID_${plan.toUpperCase()} not set, falling back to default slug '${priceSlug}'`
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

    console.log("Creating subscription for plan:", plan);
    console.log("Using priceSlug:", priceSlug);

    // Create Flowglad subscription (see https://docs.flowglad.com/api-reference/subscriptions/create-subscription)
    const flowgladResponse = await fetch("https://app.flowglad.com/api/v1/subscriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${flowgladSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customerExternalId: user.id,
        priceSlug,
        quantity: 1,
        metadata: {
          user_id: user.id,
          plan,
        },
        name: `Investor Panel ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
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

    const subscriptionId = flowgladData?.subscription?.id;

    if (!subscriptionId) {
      console.error("No subscription ID in response:", flowgladData);
      return new Response(
        JSON.stringify({ error: "No subscription ID returned" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Subscription created with ID:", subscriptionId);

    // For compatibility with existing frontend, return a checkout_url pointing to the success page
    const successUrl = `${origin}/subscription/success?plan=${plan}`;

    return new Response(
      JSON.stringify({ 
        checkout_url: successUrl,
        subscription_id: subscriptionId,
      }),
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
