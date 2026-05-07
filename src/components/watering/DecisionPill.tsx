import { Decision } from "@/lib/wateringAI";
import { Droplets, CloudRain, Flame, Pause } from "lucide-react";

const STYLES: Record<Decision["action"], { bg: string; fg: string; Icon: any }> = {
  water:  { bg: "rgba(20,120,60,0.10)", fg: "#1a6b3a", Icon: Droplets },
  skip:   { bg: "rgba(60,120,200,0.10)", fg: "#2d5a8a", Icon: CloudRain },
  boost:  { bg: "rgba(220,120,40,0.12)", fg: "#a3540a", Icon: Flame },
  reduce: { bg: "rgba(120,120,140,0.10)", fg: "#5a5a6a", Icon: Pause },
};

export default function DecisionPill({ d }: { d: Decision }) {
  const s = STYLES[d.action];
  const Icon = s.Icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all animate-fade-in"
      style={{ background: s.bg, color: s.fg }}
    >
      <Icon size={13} aria-hidden />
      {d.reason}
    </span>
  );
}
