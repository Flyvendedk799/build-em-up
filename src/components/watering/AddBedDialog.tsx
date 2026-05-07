import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type BedDraft = {
  id?: string;
  name: string;
  type: string;
  area_m2: number;
  sun_exposure: string;
  soil: string;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: BedDraft;
  onSave: (b: BedDraft) => Promise<void> | void;
};

const TYPES = [
  { v: "lawn", label: "Plæne" },
  { v: "bed", label: "Bed" },
  { v: "greenhouse", label: "Drivhus" },
  { v: "tree", label: "Træ" },
  { v: "terrace", label: "Terrasse" },
];
const SUNS = [
  { v: "sun", label: "☀ Fuld sol" },
  { v: "part", label: "⛅ Delvis" },
  { v: "shade", label: "☁ Skygge" },
];
const SOILS = [
  { v: "sand", label: "Sandet" },
  { v: "loam", label: "Muldet" },
  { v: "clay", label: "Leret" },
];

export default function AddBedDialog({ open, onOpenChange, initial, onSave }: Props) {
  const [b, setB] = useState<BedDraft>(initial ?? { name: "", type: "bed", area_m2: 10, sun_exposure: "sun", soil: "loam" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setB(initial ?? { name: "", type: "bed", area_m2: 10, sun_exposure: "sun", soil: "loam" });
  }, [open, initial]);

  async function submit() {
    if (!b.name.trim()) return;
    setSaving(true);
    try { await onSave(b); onOpenChange(false); } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Rediger bed" : "Tilføj bed"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="bed-name">Navn</Label>
            <Input id="bed-name" value={b.name} onChange={(e) => setB({ ...b, name: e.target.value })} placeholder="Køkkenhave, rosenbed…" autoFocus />
          </div>

          <div className="grid gap-1.5">
            <Label>Type</Label>
            <div className="flex flex-wrap gap-1.5">
              {TYPES.map(t => (
                <button key={t.v} type="button" onClick={() => setB({ ...b, type: t.v })}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-all ${b.type === t.v ? "bg-foreground text-background border-foreground" : "bg-background hover:border-foreground/40 border-border"}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="bed-area">Areal (m²)</Label>
            <div className="flex items-center gap-2">
              <Input id="bed-area" type="number" min={1} max={2000} value={b.area_m2} onChange={(e) => setB({ ...b, area_m2: Number(e.target.value) })} className="w-28" />
              <div className="flex gap-1">
                {[5, 10, 20, 50].map(n => (
                  <button key={n} type="button" onClick={() => setB({ ...b, area_m2: n })}
                    className="px-2.5 py-1 text-xs rounded-md border border-border hover:border-foreground/40 transition-colors">{n}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Sol</Label>
            <div className="flex gap-1.5">
              {SUNS.map(s => (
                <button key={s.v} type="button" onClick={() => setB({ ...b, sun_exposure: s.v })}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm border transition-all ${b.sun_exposure === s.v ? "bg-foreground text-background border-foreground" : "bg-background hover:border-foreground/40 border-border"}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Jord</Label>
            <div className="flex gap-1.5">
              {SOILS.map(s => (
                <button key={s.v} type="button" onClick={() => setB({ ...b, soil: s.v })}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm border transition-all ${b.soil === s.v ? "bg-foreground text-background border-foreground" : "bg-background hover:border-foreground/40 border-border"}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Annullér</Button>
          <Button onClick={submit} disabled={saving || !b.name.trim()}>{saving ? "Gemmer…" : "Gem bed"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
