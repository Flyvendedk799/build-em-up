import { Star, Truck, RotateCcw, Phone } from "lucide-react";

const SAMPLE = [
  { name: "Mette H.", rating: 5, text: "Smukt håndværk og hurtig levering. Det føles som en investering for livet." },
  { name: "Jonas K.", rating: 5, text: "Passer perfekt ind i haven – endnu pænere i virkeligheden." },
  { name: "Sofie L.", rating: 4, text: "Rigtig god kvalitet. Mangler kun en lille pleje-guide i kassen." },
];

export function ReviewsBlock() {
  const avg = SAMPLE.reduce((s, r) => s + r.rating, 0) / SAMPLE.length;
  return (
    <section className="pdp-reviews">
      <div className="pdp-reviews-head">
        <div>
          <div className="eyebrow">Anmeldelser</div>
          <h2>{avg.toFixed(1)} af 5 — {SAMPLE.length} anmeldelser</h2>
          <div className="pdp-stars" aria-label={`${avg} ud af 5`}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={18} fill={i < Math.round(avg) ? "currentColor" : "none"} />
            ))}
          </div>
        </div>
        <div className="pdp-trust">
          <div><Truck size={18} /> Fri fragt over 599 kr</div>
          <div><RotateCcw size={18} /> 30 dages retur</div>
          <div><Phone size={18} /> Dansk kundeservice</div>
        </div>
      </div>
      <div className="pdp-reviews-grid">
        {SAMPLE.map((r) => (
          <div key={r.name} className="pdp-review">
            <div className="pdp-stars">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={14} fill={i < r.rating ? "currentColor" : "none"} />
              ))}
            </div>
            <p>"{r.text}"</p>
            <div className="who">— {r.name}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
