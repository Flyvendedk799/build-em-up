import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Cloud, CloudRain, CloudSun, Droplets, Sun, Wind } from "lucide-react";
import { Forecast } from "@/lib/wateringAI";

type Props = {
  gardenName: string;
  plannedL: number;
  savedL: number;
  waterCount: number;
  skipCount: number;
  nextRunAt: Date | null;
  forecasts: Forecast[];
  decisionToday: "water" | "skip" | "boost" | "reduce" | "idle";
};

function pickWeather(f?: Forecast) {
  if (!f) return { Icon: Sun, label: "Klart", tone: "warm" };
  if (f.precip_mm >= 4) return { Icon: CloudRain, label: "Regn", tone: "rain" };
  if (f.precip_mm >= 1) return { Icon: Cloud, label: "Skyet", tone: "cool" };
  if ((f.wind_max ?? 0) >= 12) return { Icon: Wind, label: "Blæst", tone: "cool" };
  if (f.temp_max >= 22) return { Icon: Sun, label: "Solrigt", tone: "warm" };
  return { Icon: CloudSun, label: "Mildt", tone: "warm" };
}

function fmtCountdown(ms: number) {
  if (ms <= 0) return "—";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}t ${m}m`;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function TodayHero({ gardenName, plannedL, savedL, waterCount, skipCount, nextRunAt, forecasts, decisionToday }: Props) {
  const w = pickWeather(forecasts[0]);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  const cd = useMemo(() => (nextRunAt ? nextRunAt.getTime() - now : 0), [nextRunAt, now]);

  // Animated ring: % of weekly target liters delivered (cap at 1000L for ring scale)
  const cap = Math.max(200, Math.ceil((plannedL + savedL) / 100) * 100);
  const pct = Math.min(1, plannedL / Math.max(1, cap));
  const R = 70, C = 2 * Math.PI * R;
  const dash = C * pct;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="today-hero"
    >
      <div className="today-hero__bg" aria-hidden>
        <motion.div
          className={`today-hero__halo today-hero__halo--${w.tone}`}
          animate={{ scale: [1, 1.05, 1], opacity: [0.7, 0.9, 0.7] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="today-hero__main">
        <div className="today-hero__left">
          <div className="today-hero__eyebrow">I dag · {gardenName}</div>
          <div className="today-hero__title">
            {decisionToday === "skip" && "Springer over · regnen klarer det"}
            {decisionToday === "water" && "Vander som planlagt"}
            {decisionToday === "boost" && "Ekstra vand · varme på vej"}
            {decisionToday === "reduce" && "Lidt mindre i dag"}
            {decisionToday === "idle" && "Ingen vanding planlagt"}
          </div>

          <div className="today-hero__stats">
            <div>
              <div className="today-hero__stat">{plannedL}<span>L</span></div>
              <div className="today-hero__statlbl">planlagt · {waterCount} vandinger</div>
            </div>
            {savedL > 0 && (
              <div>
                <div className="today-hero__stat" style={{ color: "var(--cool-700, #2d5a8a)" }}>+{savedL}<span>L</span></div>
                <div className="today-hero__statlbl">sparet · {skipCount} sprunget</div>
              </div>
            )}
            <div>
              <div className="today-hero__stat" style={{ fontVariantNumeric: "tabular-nums" }}>{fmtCountdown(cd)}</div>
              <div className="today-hero__statlbl">{nextRunAt ? `næste: ${nextRunAt.toLocaleString("da-DK", { weekday: "short", hour: "2-digit", minute: "2-digit" })}` : "ingen næste vanding"}</div>
            </div>
          </div>
        </div>

        <div className="today-hero__right">
          <svg viewBox="0 0 180 180" width="180" height="180" className="today-hero__ring">
            <defs>
              <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#3aa67a" />
                <stop offset="100%" stopColor="#2563a8" />
              </linearGradient>
            </defs>
            <circle cx="90" cy="90" r={R} fill="none" stroke="rgba(20,39,29,0.08)" strokeWidth="10" />
            <motion.circle
              cx="90" cy="90" r={R} fill="none"
              stroke="url(#ring-grad)" strokeWidth="10" strokeLinecap="round"
              strokeDasharray={`${dash} ${C}`}
              transform="rotate(-90 90 90)"
              initial={{ strokeDasharray: `0 ${C}` }}
              animate={{ strokeDasharray: `${dash} ${C}` }}
              transition={{ duration: 1.1, ease: "easeOut" }}
            />
            <foreignObject x="40" y="55" width="100" height="70">
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--ink-900)" }}>
                <Droplets size={22} style={{ opacity: 0.85 }} />
                <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{Math.round(pct * 100)}%</div>
                <div style={{ fontSize: 10, opacity: 0.6 }}>af uge-mål</div>
              </div>
            </foreignObject>
          </svg>

          <div className="today-hero__weather">
            <motion.div
              key={w.label}
              initial={{ opacity: 0, y: 6, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="today-hero__weather-icon"
            >
              <w.Icon size={28} />
            </motion.div>
            <div>
              <div className="today-hero__weather-label">{w.label}</div>
              <div className="today-hero__weather-sub">
                {forecasts[0] ? `${Math.round(forecasts[0].temp_max)}° · ${forecasts[0].precip_mm.toFixed(1)} mm` : "—"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
