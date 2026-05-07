import { CloudRain, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  precip24h: number;
  savedL: number;
  dismissed: boolean;
  onDismiss: () => void;
};

export default function RainAlert({ precip24h, savedL, dismissed, onDismiss }: Props) {
  const show = !dismissed && precip24h >= 4;
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 16px", borderRadius: 12,
            background: "linear-gradient(120deg, rgba(60,120,200,0.10), rgba(60,120,200,0.04))",
            border: "1px solid rgba(60,120,200,0.20)",
            marginBottom: 16,
          }}>
          <CloudRain size={20} style={{ color: "#2d5a8a", flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: 14, color: "#1f3f5e" }}>
            <strong>{precip24h.toFixed(1)} mm regn</strong> ventet næste 24 t.
            {savedL > 0 && <> Vi springer over og sparer ~<strong>{savedL} L</strong>.</>}
          </div>
          <button onClick={onDismiss} aria-label="Luk"
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "#2d5a8a", padding: 4 }}>
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
