const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function emptyFeatureCollection(detail?: string) {
  return json({ type: "FeatureCollection", features: [], detail });
}

async function fetchTextWithTimeout(url: string, timeoutMs: number): Promise<{ ok: boolean; status: number; text: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/geo+json, application/json",
        "Accept-Encoding": "identity",
      },
    });
    const text = await response.text();
    return { ok: response.ok, status: response.status, text };
  } finally {
    clearTimeout(timeout);
  }
}

// Fetch the cadastral parcel (Jordstykke) at a given lng/lat from Dataforsyningen Matrikel WFS.
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const token = Deno.env.get("DATAFORSYNINGEN_TOKEN");
  if (!token) {
    return json({ error: "DATAFORSYNINGEN_TOKEN not set" }, 500);
  }
  const url = new URL(req.url);
  const lng = parseFloat(url.searchParams.get("lng") ?? "");
  const lat = parseFloat(url.searchParams.get("lat") ?? "");
  if (!isFinite(lng) || !isFinite(lat)) {
    return json({ error: "lng and lat required" }, 400);
  }

  // Use the simpler Matrikel REST API: point lookup returns the parcel containing the point.
  // Fallback: Dataforsyningen "dagi" / "matriklen" REST
  const restApi = `https://api.dataforsyningen.dk/jordstykker?x=${lng}&y=${lat}&srid=4326&format=geojson&token=${encodeURIComponent(token)}`;

  let lastDetail = "";
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const result = await fetchTextWithTimeout(restApi, 5000);
        if (!result.ok) {
          lastDetail = `HTTP ${result.status}: ${result.text.slice(0, 240)}`;
          continue;
        }
        try {
          const parsed = JSON.parse(result.text);
          if (parsed?.type === "FeatureCollection") return json(parsed);
          lastDetail = "Unexpected GeoJSON shape";
        } catch {
          lastDetail = "Invalid GeoJSON response";
        }
      } catch (e) {
        lastDetail = String(e);
      }
    }

    // Parcel lookup is helpful, not critical. Return an empty GeoJSON response
    // instead of a 500 so the user can still use the AI/manual tools.
    console.warn("matrikel lookup unavailable", lastDetail);
    return emptyFeatureCollection(lastDetail);
  } catch (e) {
    console.warn("matrikel lookup failed", String(e));
    return emptyFeatureCollection(String(e));
  }
});
