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

    // Get the appropriate price slug
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
    console.log("User email:", user.email);

    // Step 1: Create customer in Flowglad first (or get existing)
    console.log("Creating/getting Flowglad customer for user:", user.id);
    
    const customerResponse = await fetch("https://app.flowglad.com/api/v1/customers", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${flowgladSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        externalId: user.id,
        email: user.email,
        name: user.email?.split('@')[0] || 'Customer',
      }),
    });

    const customerText = await customerResponse.text();
    console.log("Customer creation response status:", customerResponse.status);
    console.log("Customer creation response:", customerText);

    let customerId: string;

    if (customerResponse.status === 409) {
      // Customer already exists, extract the customer ID from existing data
      console.log("Customer already exists, fetching existing customer");
      
      const getCustomerResponse = await fetch(`https://app.flowglad.com/api/v1/customers?externalId=${user.id}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${flowgladSecretKey}`,
          "Content-Type": "application/json",
        },
      });
      
      const getCustomerText = await getCustomerResponse.text();
      console.log("Get customer response:", getCustomerText);
      
      if (!getCustomerResponse.ok) {
        return new Response(
          JSON.stringify({ error: "Failed to retrieve existing customer" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const getCustomerData = JSON.parse(getCustomerText);
      customerId = getCustomerData.customers?.[0]?.id || getCustomerData.customer?.id;
    } else if (customerResponse.ok) {
      const customerData = JSON.parse(customerText);
      customerId = customerData.customer?.id;
    } else {
      console.error("Failed to create customer:", customerText);
      return new Response(
        JSON.stringify({ error: `Failed to create customer: ${customerText}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!customerId) {
      console.error("No customer ID obtained");
      return new Response(
        JSON.stringify({ error: "Failed to obtain customer ID" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Using Flowglad customer ID:", customerId);

    // Step 2: Create checkout session instead of direct subscription
    const successUrl = `${origin}/subscription/success?plan=${plan}`;
    const cancelUrl = `${origin}/pricing`;

    console.log("Creating checkout session with successUrl:", successUrl);

    const checkoutResponse = await fetch("https://app.flowglad.com/api/v1/checkout-sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${flowgladSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customerId,
        priceId: priceSlug,
        successUrl,
        cancelUrl,
        type: "subscription",
        metadata: {
          user_id: user.id,
          plan,
        },
      }),
    });

    const checkoutText = await checkoutResponse.text();
    console.log("Checkout session response status:", checkoutResponse.status);
    console.log("Checkout session response:", checkoutText);

    let checkoutData;
    try {
      checkoutData = JSON.parse(checkoutText);
    } catch (e) {
      console.error("Failed to parse checkout response:", e);
      return new Response(
        JSON.stringify({ error: "Invalid response from payment system" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!checkoutResponse.ok) {
      console.error("Flowglad checkout API error:", checkoutData);
      return new Response(
        JSON.stringify({ error: `Checkout failed: ${JSON.stringify(checkoutData)}` }),
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

    console.log("Checkout session created with URL:", checkoutUrl);

    return new Response(
      JSON.stringify({ 
        checkout_url: checkoutUrl,
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
