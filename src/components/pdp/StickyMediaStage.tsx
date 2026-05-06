import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { track } from "@/lib/analytics";

type Chapter = { id: string; title: string; body: string; accent?: string };

const DEFAULTS: Chapter[] = [
  { id: "materials", title: "Materialer", body: "Naturlige materialer udvalgt for holdbarhed og patina. Hver detalje er gennemtænkt – fra overflade til samling.", accent: "01" },
  { id: "dim", title: "Mål & dimensioner", body: "Designet i menneskelig skala. Proportioner der passer ind i både den lille terrasse og den store have.", accent: "02" },
  { id: "care", title: "Pleje", body: "Tåler dansk vejr året rundt. Minimal vedligehold – lad tiden gøre arbejdet og tilføje karakter.", accent: "03" },
  { id: "sustain", title: "Bæredygtighed", body: "Produceret lokalt med ansvar for materialer, fragt og håndværk. Lavet til at vare i generationer.", accent: "04" },
];

export function StickyMediaStage({
  gradient, svg, chapters = DEFAULTS,
}: { gradient: string | null; svg: string | null; chapters?: Chapter[] }) {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const i = Number((e.target as HTMLElement).dataset.idx);
            setActive(i);
            track("pdp_chapter_view", { chapter: chapters[i]?.id });
          }
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );
    refs.current.forEach((r) => r && obs.observe(r));
    return () => obs.disconnect();
  }, [chapters]);

  const transforms = [
    { rotate: 0, scale: 1 },
    { rotate: -3, scale: 1.05 },
    { rotate: 2, scale: 0.98 },
    { rotate: -1, scale: 1.08 },
  ];

  return (
    <section className="pdp-stage-section">
      <div className="container pdp-stage-grid">
        <div className="pdp-stage-pin">
          <div className="pdp-stage-frame" style={{ background: gradient || "var(--mist-100)" }}>
            <motion.div
              className="pdp-stage-art"
              animate={reduced ? {} : transforms[active]}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
            />
            <div className="pdp-stage-index">
              <span className="num">{chapters[active]?.accent}</span>
              <span className="lbl">{chapters[active]?.title}</span>
            </div>
          </div>
        </div>
        <div className="pdp-stage-chapters">
          {chapters.map((c, i) => (
            <div
              key={c.id}
              ref={(el) => (refs.current[i] = el)}
              data-idx={i}
              className={`pdp-chapter ${active === i ? "is-active" : ""}`}
            >
              <div className="eyebrow">Kapitel {c.accent}</div>
              <h3>{c.title}</h3>
              <p>{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
