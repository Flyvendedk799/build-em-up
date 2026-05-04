import { useEffect, useRef, useState, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import * as turf from "@turf/turf";
import "mapbox-gl/dist/mapbox-gl.css";
import { AppNav, SiteFooter } from "@/components/layout/SiteChrome";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";

type Suggestion = { id: string; place_name: string; center: [number, number]; text: string };

const TIERS = [
  { name: "Klipper R1 Mini",   tier: "Indgangsmodel", max: 600,  price: "6.299 kr",  battery: "90 min",  noise: "52 dB" },
  { name: "Klipper R2 Plus",   tier: "Familie",       max: 1200, price: "9.499 kr",  battery: "140 min", noise: "55 dB" },
  { name: "Klipper R3 Pro",    tier: "Stor have",     max: 2500, price: "12.499 kr", battery: "180 min", noise: "58 dB" },
  { name: "Klipper R4 Estate", tier: "Erhverv",       max: 5000, price: "18.999 kr", battery: "240 min", noise: "60 dB" },
];

export default function GardenSizer() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<{ name: string; center: [number, number] } | null>(null);
  const [points, setPoints] = useState<[number, number][]>([]);
  const [closed, setClosed] = useState(false);
  const [hover, setHover] = useState<[number, number] | null>(null);
  const [saving, setSaving] = useState(false);

  const mapRef = useRef<mapboxgl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Fetch token
  useEffect(() => {
    supabase.functions.invoke("get-mapbox-token").then(({ data, error }) => {
      if (error || !data?.token) {
        toast.error("Kunne ikke hente kort-token");
        return;
      }
      setToken(data.token);
      mapboxgl.accessToken = data.token;
    });
  }, []);

  // Geocode (debounced)
  useEffect(() => {
    if (!token || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?country=dk&language=da&limit=6&access_token=${token}`;
      try {
        const r = await fetch(url);
        const j = await r.json();
        setSuggestions(
          (j.features ?? []).map((f: any) => ({
            id: f.id,
            place_name: f.place_name,
            center: f.center as [number, number],
            text: f.text,
          })),
        );
      } catch {
        /* ignore */
      }
    }, 220);
    return () => clearTimeout(t);
  }, [query, token]);

  function chooseAddress(s: Suggestion) {
    setChosen({ name: s.place_name, center: s.center });
    setQuery(s.place_name);
    setOpen(false);
    setStep(2);
    setPoints([]);
    setClosed(false);
  }

  // Init map when step=2
  useEffect(() => {
    if (step !== 2 || !chosen || !token || !containerRef.current) return;
    if (mapRef.current) {
      mapRef.current.flyTo({ center: chosen.center, zoom: 19 });
      return;
    }
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: chosen.center,
      zoom: 19,
      pitch: 0,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    map.on("load", () => {
      map.addSource("polygon", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "polygon-fill",
        type: "fill",
        source: "polygon",
        paint: { "fill-color": "#d8a651", "fill-opacity": 0.32 },
      });
      map.addLayer({
        id: "polygon-line",
        type: "line",
        source: "polygon",
        paint: { "line-color": "#d8a651", "line-width": 2.5 },
      });
      map.addSource("points", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "points-circle",
        type: "circle",
        source: "points",
        paint: {
          "circle-radius": 6,
          "circle-color": "#d8a651",
          "circle-stroke-color": "#14271d",
          "circle-stroke-width": 1.5,
        },
      });
    });

    map.on("click", (e) => {
      const lngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      setPoints((prev) => {
        if (closed) return prev;
        // close if click near start
        if (prev.length >= 3) {
          const start = prev[0];
          const px = map.project(start as any);
          const cur = map.project(lngLat as any);
          if (Math.hypot(px.x - cur.x, px.y - cur.y) < 14) {
            setClosed(true);
            return prev;
          }
        }
        return [...prev, lngLat];
      });
    });
    map.on("dblclick", (e) => {
      e.preventDefault();
      setPoints((prev) => (prev.length >= 3 ? (setClosed(true), prev) : prev));
    });
    map.on("mousemove", (e) => setHover([e.lngLat.lng, e.lngLat.lat]));

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, token, chosen?.center?.[0], chosen?.center?.[1]]);

  // Update map sources
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const ring = closed
      ? [...points, points[0]]
      : hover && points.length > 0
      ? [...points, hover]
      : points;
    const polyFeature =
      points.length >= 2
        ? {
            type: "Feature" as const,
            properties: {},
            geometry: {
              type: closed ? ("Polygon" as const) : ("LineString" as const),
              coordinates: closed ? [ring] : ring,
            },
          }
        : null;
    (map.getSource("polygon") as mapboxgl.GeoJSONSource)?.setData({
      type: "FeatureCollection",
      features: polyFeature ? [polyFeature as any] : [],
    });
    (map.getSource("points") as mapboxgl.GeoJSONSource)?.setData({
      type: "FeatureCollection",
      features: points.map((p) => ({
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: p },
      })),
    });
  }, [points, hover, closed]);

  const area = useMemo(() => {
    if (!closed || points.length < 3) return 0;
    const poly = turf.polygon([[...points, points[0]]]);
    return turf.area(poly);
  }, [points, closed]);

  const perim = useMemo(() => {
    if (points.length < 2) return 0;
    const ring = closed ? [...points, points[0]] : points;
    const line = turf.lineString(ring);
    return turf.length(line, { units: "kilometers" }) * 1000;
  }, [points, closed]);

  const tier = TIERS.find((t) => area <= t.max) ?? TIERS[TIERS.length - 1];

  function undo() {
    setClosed(false);
    setPoints((p) => p.slice(0, -1));
  }
  function clear() {
    setClosed(false);
    setPoints([]);
  }

  async function saveGarden() {
    if (!user) {
      toast("Log ind for at gemme din have");
      navigate("/login?redirect=/havemaaler");
      return;
    }
    if (!chosen || area === 0) return;
    setSaving(true);
    const polyGeo = {
      type: "Polygon",
      coordinates: [[...points, points[0]]],
    };
    const { data: g, error } = await supabase
      .from("gardens")
      .insert({
        user_id: user.id,
        name: chosen.name.split(",")[0],
        address: chosen.name,
        latitude: chosen.center[1],
        longitude: chosen.center[0],
        area_m2: Math.round(area),
        polygon: polyGeo,
      })
      .select()
      .single();
    if (error || !g) {
      toast.error("Kunne ikke gemme have");
      setSaving(false);
      return;
    }
    await supabase.from("garden_zones").insert({
      user_id: user.id,
      garden_id: g.id,
      name: "Græsplæne",
      type: "lawn",
      polygon: polyGeo,
      area_m2: Math.round(area),
    });
    toast.success("Have gemt");
    navigate("/konto");
  }

  return (
    <>
      <AppNav active="sizer" />
      <div className="container">
        <header className="page-head">
          <div className="eyebrow" style={{ marginBottom: 14 }}>Værktøj · Havemåler</div>
          <h1>Tegn din græsplæne. Få den rette robotklipper.</h1>
          <p className="lede">Indtast din adresse, og vi henter et satellit-billede af din matrikel. Tegn græsplænen ovenpå — så regner vi arealet og foreslår en model.</p>
        </header>

        {step === 1 && (
          <section>
            <div className="addr-step">
              <div>
                <div className="addr-eyebrow"><span className="num">1</span> Find din matrikel</div>
                <h2>Hvor ligger <em>din have?</em></h2>
                <p className="addr-lede">Indtast vejnavn og husnummer i Danmark. Vi henter et satellit-foto, så du kan tegne din græsplæne præcist ovenpå.</p>

                <div className="addr-form" style={{ position: "relative" }}>
                  <svg className="pin" width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M9 16s6-5.5 6-9.5A6 6 0 003 6.5C3 10.5 9 16 9 16z" stroke="currentColor" strokeWidth="1.4" />
                    <circle cx="9" cy="6.5" r="2" stroke="currentColor" strokeWidth="1.4" />
                  </svg>
                  <input
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 180)}
                    placeholder="F.eks. Søndergade 14, 8000 Aarhus C"
                    autoComplete="off"
                  />
                  <button onClick={() => suggestions[0] && chooseAddress(suggestions[0])}>
                    Hent kort
                    <svg width="12" height="10" viewBox="0 0 14 10" fill="none"><path d="M1 5h12m0 0L9 1m4 4L9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                  </button>
                  {open && suggestions.length > 0 && (
                    <div className="addr-suggest open">
                      {suggestions.map((s) => (
                        <button key={s.id} onMouseDown={(e) => { e.preventDefault(); chooseAddress(s); }}>
                          <span className="ico">
                            <svg width="13" height="13" viewBox="0 0 18 18" fill="none">
                              <path d="M9 16s6-5.5 6-9.5A6 6 0 003 6.5C3 10.5 9 16 9 16z" stroke="currentColor" strokeWidth="1.4" />
                              <circle cx="9" cy="6.5" r="2" stroke="currentColor" strokeWidth="1.4" />
                            </svg>
                          </span>
                          {s.text}
                          <span className="city">{s.place_name.replace(s.text + ", ", "")}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="addr-meta">
                  <span>Mapbox · DAR</span>
                  <span>GDPR-sikker</span>
                  <span>Kun til opmåling</span>
                </div>
              </div>

              <div className="addr-preview">
                <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice">
                  <defs>
                    <pattern id="grid-bg" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M20 0H0V20" stroke="rgba(237,232,223,0.06)" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect width="400" height="400" fill="url(#grid-bg)" />
                  <rect x="80" y="80" width="240" height="240" fill="none" stroke="rgba(216,166,81,0.5)" strokeWidth="1.5" strokeDasharray="4 4" />
                  <rect x="110" y="110" width="100" height="60" fill="rgba(237,232,223,0.18)" />
                  <path d="M110 110 L160 90 L210 110" fill="rgba(237,232,223,0.25)" />
                  <path d="M110 180 L290 175 L295 290 L120 295 Z" fill="rgba(127,160,126,0.25)" stroke="rgba(216,166,81,0.6)" strokeWidth="1.5" />
                  <circle cx="270" cy="220" r="14" fill="rgba(46,90,62,0.5)" />
                  <circle cx="140" cy="260" r="10" fill="rgba(46,90,62,0.5)" />
                  <text x="200" y="208" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="9" fill="rgba(237,232,223,0.6)" letterSpacing="2">VENTER PÅ ADRESSE</text>
                </svg>
                <div className="scan"></div>
                <div className="crosshair">
                  <span className="corner tl"></span><span className="corner tr"></span>
                  <span className="corner bl"></span><span className="corner br"></span>
                </div>
                <div className="stamp">DK · MATRIKEL · 1:200</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginTop: 24 }}>
              <div className="acct-stat"><div className="v">3 trin</div><div className="l">Adresse → tegn → anbefaling</div></div>
              <div className="acct-stat"><div className="v">~30 sek</div><div className="l">Typisk tid</div></div>
              <div className="acct-stat"><div className="v">Gratis</div><div className="l">Ingen oprettelse nødvendig</div></div>
            </div>
          </section>
        )}

        {step === 2 && chosen && (
          <section>
            <div className="topview-header">
              <div className="addr-display">
                <div className="pin-badge">
                  <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                    <path d="M9 16s6-5.5 6-9.5A6 6 0 003 6.5C3 10.5 9 16 9 16z" stroke="currentColor" strokeWidth="1.4" />
                    <circle cx="9" cy="6.5" r="2" stroke="currentColor" strokeWidth="1.4" />
                  </svg>
                </div>
                <div className="txt">
                  <strong>{chosen.name.split(",")[0]}</strong>
                  <span>{chosen.name.split(",").slice(1).join(",").toUpperCase()}</span>
                </div>
              </div>
              <button className="change-addr" onClick={() => { setStep(1); clear(); }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6h8M2 6l3-3M2 6l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                Skift adresse
              </button>
            </div>

            <div className="sizer-layout">
              <div>
                <div className="canvas-host topview" style={{ position: "relative" }}>
                  <div ref={containerRef} style={{ width: "100%", height: "100%", position: "absolute", inset: 0, borderRadius: "inherit" }} />
                  <div className="help" style={{ zIndex: 2 }}>
                    <span className="dot"></span>
                    <span>{closed ? "Færdig — gem din have" : points.length === 0 ? "Klik for at sætte hjørner. Klik første punkt eller dobbeltklik for at lukke." : "Klik første punkt eller dobbeltklik for at lukke."}</span>
                  </div>
                  <div className="area-pill" style={{ zIndex: 2 }}>
                    <div>
                      <div className="lbl">Areal</div>
                      <div>{area.toFixed(0)} m²</div>
                    </div>
                  </div>
                  <div className="tools" style={{ zIndex: 2 }}>
                    <button className="tool-btn is-active">Tegn</button>
                    <button className="tool-btn" onClick={undo}>Fortryd</button>
                    <button className="tool-btn" onClick={clear}>Ryd</button>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginTop: 24 }}>
                  <div className="acct-stat"><div className="v">{points.length}</div><div className="l">Hjørner sat</div></div>
                  <div className="acct-stat"><div className="v">{perim.toFixed(0)} m</div><div className="l">Omkreds</div></div>
                  <div className="acct-stat"><div className="v">{area > 0 ? Math.ceil(area / 8) + " min" : "— min"}</div><div className="l">Estimeret klippetid</div></div>
                </div>
              </div>

              <aside className="recommendation">
                <div className="eyebrow" style={{ marginBottom: 14 }}>Anbefaling</div>
                <div className="rec-mower">
                  <div className="tier">{tier.tier}</div>
                  <h3>{tier.name}</h3>
                  <div className="sub">Op til {tier.max} m²</div>
                  <div className="price">{tier.price}</div>
                </div>

                <div className="rec-meta">
                  <div className="cell"><div className="v">{area.toFixed(0)} m²</div><div className="l">Din plæne</div></div>
                  <div className="cell"><div className="v">{tier.max} m²</div><div className="l">Klippekapacitet</div></div>
                  <div className="cell"><div className="v">{tier.battery}</div><div className="l">Batteritid</div></div>
                  <div className="cell"><div className="v">{tier.noise}</div><div className="l">Lydniveau</div></div>
                </div>

                <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={saveGarden} disabled={saving || area === 0}>
                  {saving ? "Gemmer…" : "Gem have og fortsæt"}
                </button>
                <Link to="/webshop?cat=robot" className="btn btn-ghost" style={{ width: "100%", justifyContent: "center", marginTop: 10 }}>Se alle robotklippere</Link>

                <div style={{ fontSize: 11, color: "var(--ink-500)", marginTop: 18, lineHeight: 1.5 }}>
                  Inkl. installationsguide og 5 års garanti. Gratis fragt over 999 kr.
                </div>
              </aside>
            </div>
          </section>
        )}
      </div>
      <SiteFooter />
    </>
  );
}
