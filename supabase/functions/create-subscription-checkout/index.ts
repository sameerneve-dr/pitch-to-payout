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

    // Get price IDs from environment - these should be set in Supabase secrets
    const priceId = plan === "plus" 
      ? Deno.env.get("FLOWGLAD_PRICE_ID_PLUS")
      : Deno.env.get("FLOWGLAD_PRICE_ID_PRO");

    if (!priceId) {
      console.error("Missing price ID for plan:", plan);
      return new Response(
        JSON.stringify({ error: `Price not configured for ${plan} plan. Please set FLOWGLAD_PRICE_ID_${plan.toUpperCase()} secret.` }),
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

    // Build customer data - handle users without email
    const externalId = user.id;
    const email = user.email || "demo@investorpanel.test";
    const name = user.user_metadata?.full_name || user.email?.split('@')[0] || "User";

    console.log("Creating subscription for plan:", plan);
    console.log("Using priceId:", priceId);
    console.log("Customer externalId:", externalId);

    // Step 1: Ensure customer exists in Flowglad
    console.log("Ensuring Flowglad customer exists...");
    
    const customerPayload = {
      customer: {
        externalId,
        email,
        name,
      }
    };

    const customerResponse = await fetch("https://app.flowglad.com/api/v1/customers", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${flowgladSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(customerPayload),
    });

    const customerText = await customerResponse.text();
    console.log("Customer creation status:", customerResponse.status);

    let customerId: string | undefined;

    // Handle various response codes
    if (customerResponse.status === 200 || customerResponse.status === 201) {
      const customerData = JSON.parse(customerText);
      customerId = customerData?.customer?.id;
      console.log("Customer created, id:", customerId);
    } else if (customerResponse.status === 409) {
      // Customer already exists, fetch it
      console.log("Customer already exists, fetching...");
      const getResponse = await fetch(`https://app.flowglad.com/api/v1/customers?externalId=${encodeURIComponent(externalId)}`, {
        headers: {
          "Authorization": `Bearer ${flowgladSecretKey}`,
          "Content-Type": "application/json",
        },
      });
      
      if (getResponse.ok) {
        const getData = await getResponse.json();
        customerId = getData?.customers?.[0]?.id || getData?.data?.[0]?.id;
        console.log("Fetched existing customer id:", customerId);
      }
    } else {
      console.error("Customer creation failed:", customerText);
    }

    if (!customerId) {
      console.error("Could not obtain customer ID");
      return new Response(
        JSON.stringify({ error: "Failed to create payment customer" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Create checkout session
    const successUrl = `${origin}/subscription/success?plan=${plan}`;
    const cancelUrl = `${origin}/plans`;

    console.log("Creating checkout session...");

    const checkoutPayload = {
      checkoutSession: {
        customerId,
        priceId,
        successUrl,
        cancelUrl,
        type: "subscription",
      }
    };

    console.log("Checkout payload:", JSON.stringify(checkoutPayload));

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

    console.log("Checkout created successfully");

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
