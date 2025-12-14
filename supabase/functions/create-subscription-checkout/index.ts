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

    // Use TEST price IDs from environment
    const flowgladPriceIdPlus = Deno.env.get("FLOWGLAD_PRICE_ID_PLUS");
    const flowgladPriceIdPro = Deno.env.get("FLOWGLAD_PRICE_ID_PRO");
    const flowgladSecretKey = Deno.env.get("FLOWGLAD_SECRET_KEY");

    if (!flowgladSecretKey) {
      console.error("Missing FLOWGLAD_SECRET_KEY");
      return new Response(
        JSON.stringify({ error: "Payment configuration missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!flowgladPriceIdPlus || !flowgladPriceIdPro) {
      console.error("Missing FLOWGLAD_PRICE_ID_PLUS or FLOWGLAD_PRICE_ID_PRO");
      return new Response(
        JSON.stringify({ error: "Payment price configuration missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const priceId = plan === "plus" ? flowgladPriceIdPlus : flowgladPriceIdPro;

    const isTestKey = flowgladSecretKey.toLowerCase().includes("test");
    const environment = isTestKey ? "test" : "live";

    console.log("Flowglad environment:", environment);
    console.log("Selected Flowglad priceId:", priceId);

    if (!isTestKey) {
      console.error("Flowglad secret key does not appear to be a TEST key. Aborting checkout.");
      return new Response(
        JSON.stringify({ error: "Payment system is configured for LIVE mode. This demo only supports TEST mode." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const appDomain = Deno.env.get("APP_DOMAIN");
    if (!appDomain) {
      console.error("Missing APP_DOMAIN environment variable");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build customer data
    const customerExternalId = user.id;

    console.log("Creating subscription for plan:", plan);
    console.log("Using priceId:", priceId);
    console.log("Customer externalId:", customerExternalId);
    console.log("APP_DOMAIN:", appDomain);

    // Simple absolute URLs
    const successUrl = `${appDomain}/success?source=subscription&plan=${plan}`;
    const cancelUrl = `${appDomain}/plans`;

    console.log("=== FLOWGLAD URLs ===");
    console.log("APP_DOMAIN:", appDomain);
    console.log("SUCCESS_URL:", successUrl);
    console.log("CANCEL_URL:", cancelUrl);
    console.log("=====================");

    const checkoutPayload = {
      checkoutSession: {
        customerExternalId,
        priceId,
        successUrl,
        cancelUrl,
        type: "product",
        outputMetadata: {
          user_id: user.id,
          plan: plan,
          source: 'subscription',
        },
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
      console.error("Checkout API error:", JSON.stringify(checkoutData));
      return new Response(
        JSON.stringify({ error: `Checkout failed: ${JSON.stringify(checkoutData?.error || checkoutData)}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const checkoutUrl = checkoutData?.checkoutSession?.url || checkoutData?.url;
    const sessionId = checkoutData?.checkoutSession?.id || checkoutData?.id;

    if (!checkoutUrl) {
      console.error("No checkout URL in response:", JSON.stringify(checkoutData));
      return new Response(
        JSON.stringify({ error: "No checkout URL returned" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Checkout created successfully - URL:", checkoutUrl, "Session ID:", sessionId);

    return new Response(
      JSON.stringify({ 
        checkout_url: checkoutUrl,
        session_id: sessionId,
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
