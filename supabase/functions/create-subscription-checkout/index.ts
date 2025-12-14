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

    const envPriceSlug = plan === "plus" 
      ? Deno.env.get("FLOWGLAD_PRICE_ID_PLUS")
      : Deno.env.get("FLOWGLAD_PRICE_ID_PRO");

    const defaultPriceSlug = plan === "plus" ? "investor_demo_plus" : "investor_demo_pro";
    const priceSlug = envPriceSlug || defaultPriceSlug;

    if (!priceSlug) {
      console.error("Missing price slug for plan:", plan);
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

    // Build customer data - handle anonymous/demo users
    const externalId = user.id || "demo-user";
    const email = user.email || "demo@investorpanel.test";
    const name = user.email?.split('@')[0] || "Demo User";

    if (!externalId) {
      return new Response(
        JSON.stringify({ error: "Unable to determine user identity" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Creating subscription for plan:", plan);
    console.log("Using priceSlug:", priceSlug);
    console.log("Customer externalId exists:", !!externalId);
    console.log("Customer email exists:", !!email);

    // Step 1: Ensure customer exists in Flowglad (correct shape with "customer" wrapper)
    console.log("Ensuring Flowglad customer exists...");
    
    const customerPayload = {
      customer: {
        externalId,
        email,
        name,
      }
    };

    console.log("Customer payload shape:", JSON.stringify({ 
      hasCustomer: !!customerPayload.customer,
      hasExternalId: !!customerPayload.customer.externalId,
      hasEmail: !!customerPayload.customer.email
    }));

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

    if (customerResponse.status === 409 || customerResponse.status === 200 || customerResponse.status === 201) {
      // Customer exists or was created
      try {
        const customerData = JSON.parse(customerText);
        customerId = customerData?.customer?.id;
        console.log("Customer ensured, id exists:", !!customerId);
      } catch (e) {
        console.log("Parsing customer response, trying to fetch by externalId");
      }
    }

    // If we don't have customerId yet, try to fetch by externalId
    if (!customerId) {
      console.log("Fetching customer by externalId...");
      const getCustomerResponse = await fetch(`https://app.flowglad.com/api/v1/customers?externalId=${encodeURIComponent(externalId)}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${flowgladSecretKey}`,
          "Content-Type": "application/json",
        },
      });
      
      if (getCustomerResponse.ok) {
        const getCustomerData = await getCustomerResponse.json();
        customerId = getCustomerData?.customers?.[0]?.id || getCustomerData?.customer?.id || getCustomerData?.data?.[0]?.id;
        console.log("Fetched customer, id exists:", !!customerId);
      } else {
        const errorText = await getCustomerResponse.text();
        console.error("Failed to fetch customer:", errorText);
      }
    }

    if (!customerId) {
      console.error("Could not obtain customer ID after creation attempt");
      return new Response(
        JSON.stringify({ error: "Failed to create payment customer" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Create checkout session
    const successUrl = `${origin}/subscription/success?plan=${plan}`;
    const cancelUrl = `${origin}/pricing`;

    console.log("Creating checkout session...");

    const checkoutPayload = {
      customerId,
      priceId: priceSlug,
      successUrl,
      cancelUrl,
      type: "subscription",
      metadata: {
        user_id: user.id,
        plan,
      },
    };

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
        JSON.stringify({ error: `Checkout failed: ${checkoutData?.error || 'Unknown error'}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const checkoutUrl = checkoutData?.checkoutSession?.url || checkoutData?.url;

    if (!checkoutUrl) {
      console.error("No checkout URL in response");
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
