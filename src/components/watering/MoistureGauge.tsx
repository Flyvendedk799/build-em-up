import { motion } from "framer-motion";

export default function MoistureGauge({ deficit }: { deficit: number }) {
  // 0=fugtig, 1=tør. Display as "vandbehov".
  const pct = Math.round(deficit * 100);
  const color = deficit < 0.33 ? "#3a8acc" : deficit < 0.66 ? "#1a6b3a" : "#c47a2c";
  const label = deficit < 0.33 ? "Fugtig" : deficit < 0.66 ? "Behov balanceret" : "Tør · vand snart";
  return (
    <div style={{ display: "grid", gap: 4, minWidth: 140 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ink-500)" }}>
        <span>Vandbehov</span><span style={{ color, fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ height: 6, borderRadius: 999, background: "rgba(20,39,29,0.08)", overflow: "hidden" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          style={{ height: "100%", background: color, borderRadius: 999 }}
        />
      </div>
    </div>
  );
}
