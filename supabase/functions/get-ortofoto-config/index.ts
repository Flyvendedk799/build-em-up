const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve((req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!supabaseUrl) {
    return new Response(JSON.stringify({ error: "SUPABASE_URL not set" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // The browser should not talk directly to Dataforsyningen WMS. It is noisy,
  // flaky under tile bursts, and leaks the service token in DevTools. The tile
  // proxy retries upstream requests and returns a blank tile instead of making
  // Mapbox spam console errors.
  const tileTemplate =
    `${supabaseUrl}/functions/v1/ortofoto-tile?width=512&height=512&bbox={bbox-epsg-3857}`;

  return new Response(
    JSON.stringify({
      wmsTemplate: tileTemplate,
      attribution: "© SDFE / Dataforsyningen",
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
