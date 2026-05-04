const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fetch the cadastral parcel (Jordstykke) at a given lng/lat from Dataforsyningen Matrikel WFS.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const token = Deno.env.get("DATAFORSYNINGEN_TOKEN");
  if (!token) {
    return new Response(JSON.stringify({ error: "DATAFORSYNINGEN_TOKEN not set" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const url = new URL(req.url);
  const lng = parseFloat(url.searchParams.get("lng") ?? "");
  const lat = parseFloat(url.searchParams.get("lat") ?? "");
  if (!isFinite(lng) || !isFinite(lat)) {
    return new Response(JSON.stringify({ error: "lng and lat required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Use the simpler Matrikel REST API: point lookup returns the parcel containing the point.
  const api = `https://services.datafordeler.dk/Matrikel/MatrikelGaeldendeOgForeloebigWFS/1.0.0/WFS`
    + `?service=WFS&version=2.0.0&request=GetFeature&typenames=mat:SamletFastEjendom_Gaeldende`
    + `&srsname=EPSG:4326&count=1`
    + `&bbox=${lat - 0.0001},${lng - 0.0001},${lat + 0.0001},${lng + 0.0001},EPSG:4326`
    + `&outputFormat=application/json&token=${token}`;

  // Fallback: Dataforsyningen "dagi" / "matriklen" REST
  const restApi = `https://api.dataforsyningen.dk/jordstykker?x=${lng}&y=${lat}&srid=4326&format=geojson&token=${token}`;

  try {
    const r = await fetch(restApi);
    const text = await r.text();
    if (!r.ok) {
      return new Response(JSON.stringify({ error: "matrikel lookup failed", detail: text.slice(0, 400) }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(text, {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
