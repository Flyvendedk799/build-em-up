import { useState } from "react";
import { Droplets } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { litersForSession, Zone } from "@/lib/wateringAI";

export default function QuickWaterDialog({
  open, onOpenChange, zone, plantNames, onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  zone: Zone | null;
  plantNames: string[];
  onConfirm: (minutes: number) => Promise<void> | void;
}) {
  const [min, setMin] = useState(15);
  const liters = zone ? litersForSession(zone, min) : 0;
  const mm = Math.round((min / 15) * 5);

  if (!zone) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle><Droplets size={18} className="inline mr-1.5" />Vand {zone.name} nu</DialogTitle>
        </DialogHeader>

        <div style={{ display: "grid", gap: 16, padding: "8px 0" }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[5, 10, 15, 20, 30].map(m => (
              <button key={m} onClick={() => setMin(m)}
                style={{
                  padding: "6px 14px", borderRadius: 100,
                  border: "1px solid " + (m === min ? "var(--forest-800)" : "rgba(20,39,29,0.15)"),
                  background: m === min ? "var(--forest-800)" : "white",
                  color: m === min ? "white" : "var(--ink-900)",
                  fontSize: 13, cursor: "pointer",
                }}>{m} min</button>
            ))}
          </div>

          <Slider value={[min]} min={1} max={60} step={1} onValueChange={(v) => setMin(v[0])} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Stat label="Varighed" value={`${min} min`} />
            <Stat label="Estimeret" value={`~${liters} L · ${mm} mm`} />
          </div>

          {plantNames.length > 0 && (
            <div style={{ fontSize: 12, color: "var(--ink-500)" }}>
              Vander: {plantNames.slice(0, 6).join(", ")}{plantNames.length > 6 ? ` +${plantNames.length - 6}` : ""}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Annullér</Button>
          <Button onClick={async () => { await onConfirm(min); onOpenChange(false); }}>
            <Droplets size={14} className="mr-1.5" />Start vanding
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: 12, borderRadius: 10, background: "rgba(20,39,29,0.05)" }}>
      <div style={{ fontSize: 11, color: "var(--ink-500)", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600, marginTop: 2 }}>{value}</div>
    </div>
  );
}
