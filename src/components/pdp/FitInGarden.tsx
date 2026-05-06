import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useActiveGarden } from "@/lib/activeGarden";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { track } from "@/lib/analytics";

export function FitInGarden({ productName, footprintM2 = 1.2 }: { productName: string; footprintM2?: number }) {
  const { activeGardenId } = useActiveGarden();
  const { user } = useAuth();
  const [area, setArea] = useState<number | null>(null);
  const [name, setName] = useState<string>("");

  useEffect(() => {
    if (!user || !activeGardenId) return;
    supabase.from("gardens").select("name,area_m2").eq("id", activeGardenId).maybeSingle().then(({ data }) => {
      if (data) { setArea(data.area_m2 || null); setName(data.name || ""); }
    });
  }, [user, activeGardenId]);

  useEffect(() => { if (area) track("pdp_fit_check", { area, footprintM2 }); }, [area, footprintM2]);

  if (!user || !activeGardenId || !area) {
    return (
      <section className="pdp-fit pdp-fit-empty">
        <div>
          <div className="eyebrow">Pas til min have</div>
          <h3>Se hvor godt {productName} passer ind</h3>
          <p>Mål din have først – så viser vi dig præcis hvor meget plads dette produkt fylder.</p>
        </div>
        <Link to="/garden-sizer" className="btn btn-primary">Mål min have</Link>
      </section>
    );
  }

  const pct = Math.min(100, (footprintM2 / area) * 100);
  const scale = Math.max(0.04, Math.min(0.5, footprintM2 / area * 4));

  return (
    <section className="pdp-fit">
      <div className="pdp-fit-copy">
        <div className="eyebrow">Pas til min have</div>
        <h3>Passer fint i {name || "din have"}</h3>
        <p>
          {productName} fylder ca. <strong>{footprintM2.toFixed(1)} m²</strong> – det er{" "}
          <strong>{pct.toFixed(1)}%</strong> af din have på {area.toFixed(0)} m².
        </p>
        <Link to="/garden-sizer" className="btn btn-ghost">Åbn havemålet</Link>
      </div>
      <div className="pdp-fit-viz" aria-hidden>
        <div className="garden-rect">
          <div className="product-rect" style={{ transform: `scale(${scale})` }} />
        </div>
        <div className="pdp-fit-legend">
          <span><i className="dot dot-garden" /> Din have</span>
          <span><i className="dot dot-product" /> {productName}</span>
        </div>
      </div>
    </section>
  );
}
