import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { plan } = await req.json();

    if (!plan || !['plus', 'pro'].includes(plan)) {
      return new Response(
        JSON.stringify({ error: "Invalid plan. Must be 'plus' or 'pro'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use price slugs instead of price IDs
    const priceSlug = plan === "plus" ? "investor_demo_plus" : "investor_demo_pro";

    const flowgladSecretKey = Deno.env.get("FLOWGLAD_SECRET_KEY");
    if (!flowgladSecretKey) {
      console.error("Missing FLOWGLAD_SECRET_KEY");
      return new Response(
        JSON.stringify({ error: "Payment configuration missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const origin = Deno.env.get("APP_DOMAIN") || req.headers.get("origin") || "https://investor-panel.lovable.app";

    // Build customer data
    const customerExternalId = user.id;

    console.log("Creating subscription for plan:", plan);
    console.log("Using priceSlug:", priceSlug);
    console.log("Customer externalId:", customerExternalId);

    // Create checkout session using customerExternalId and priceSlug per Flowglad docs
    const successUrl = `${origin}/subscription/success?plan=${plan}`;
    const cancelUrl = `${origin}/plans`;

    const checkoutPayload = {
      checkoutSession: {
        customerExternalId,
        priceSlug,
        successUrl,
        cancelUrl,
        type: "subscription",
      }
    };

    console.log("Creating checkout session with payload:", JSON.stringify(checkoutPayload));

    const checkoutResponse = await fetch("https://app.flowglad.com/api/v1/checkout-sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${flowgladSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(checkoutPayload),
    });

    const checkoutText = await checkoutResponse.text();
    console.log("Checkout session status:", checkoutResponse.status);
    console.log("Checkout response:", checkoutText);

    let checkoutData;
    try {
      checkoutData = JSON.parse(checkoutText);
    } catch (e) {
      console.error("Failed to parse checkout response");
      return new Response(
        JSON.stringify({ error: "Invalid response from payment system" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!checkoutResponse.ok) {
      console.error("Checkout API error:", checkoutData);
      return new Response(
        JSON.stringify({ error: `Checkout failed: ${checkoutData?.error || JSON.stringify(checkoutData)}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const checkoutUrl = checkoutData?.checkoutSession?.url || checkoutData?.url;

    if (!checkoutUrl) {
      console.error("No checkout URL in response:", checkoutData);
      return new Response(
        JSON.stringify({ error: "No checkout URL returned" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Checkout created successfully:", checkoutUrl);

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
