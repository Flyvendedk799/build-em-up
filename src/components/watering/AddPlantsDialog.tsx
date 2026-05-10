import { useEffect, useMemo, useState } from "react";
import { Search, Plus, Minus, Leaf } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CatalogPlant = {
  slug: string;
  name_da: string;
  latin: string | null;
  category: string | null;
  water_need: string | null;
  sun: string | null;
  image_url: string | null;
};

export default function AddPlantsDialog({
  open,
  onOpenChange,
  zoneName,
  zoneSun,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  zoneName: string;
  zoneSun?: string | null;
  onAdd: (items: { slug?: string; custom_name?: string; qty: number; meta?: CatalogPlant }[]) => Promise<void>;
}) {
  const [catalog, setCatalog] = useState<CatalogPlant[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [picks, setPicks] = useState<Record<string, number>>({});
  const [customName, setCustomName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase.from("plants_catalog")
      .select("slug,name_da,latin,category,water_need,sun,image_url")
      .order("name_da")
      .then(({ data }) => {
        setCatalog((data ?? []) as CatalogPlant[]);
        setLoading(false);
      });
  }, [open]);

  useEffect(() => {
    if (!open) { setQ(""); setPicks({}); setCustomName(""); }
  }, [open]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    let list = catalog;
    if (ql) {
      list = list.filter(p =>
        p.name_da.toLowerCase().includes(ql) ||
        (p.latin || "").toLowerCase().includes(ql) ||
        (p.category || "").toLowerCase().includes(ql)
      );
    }
    return list.slice(0, 60);
  }, [catalog, q]);

  const suggestions = useMemo(() => {
    if (q || !zoneSun) return [];
    return catalog.filter(p => !p.sun || p.sun === zoneSun || p.sun === "any").slice(0, 6);
  }, [catalog, q, zoneSun]);

  const totalPicks = Object.values(picks).reduce((a, b) => a + b, 0);

  function bump(slug: string, delta: number) {
    setPicks(prev => {
      const next = { ...prev };
      const v = (next[slug] || 0) + delta;
      if (v <= 0) delete next[slug];
      else next[slug] = Math.min(50, v);
      return next;
    });
  }

  async function handleSave() {
    const items: { slug?: string; custom_name?: string; qty: number; meta?: CatalogPlant }[] = [];
    for (const [slug, qty] of Object.entries(picks)) {
      const meta = catalog.find(c => c.slug === slug);
      items.push({ slug, qty, meta });
    }
    if (customName.trim()) items.push({ custom_name: customName.trim(), qty: 1 });
    if (items.length === 0) { onOpenChange(false); return; }
    setSaving(true);
    try {
      await onAdd(items);
      toast.success(`Tilføjet ${items.reduce((a, i) => a + i.qty, 0)} plante${items.length > 1 ? "r" : ""}`);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Kunne ikke gemme");
    } finally { setSaving(false); }
  }

  const renderRow = (p: CatalogPlant) => {
    const n = picks[p.slug] || 0;
    return (
      <div key={p.slug} style={{
        display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center",
        padding: "10px 12px", borderRadius: 10,
        background: n > 0 ? "rgba(20,39,29,0.06)" : "transparent",
        border: "1px solid rgba(20,39,29,0.06)",
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>{p.name_da}</div>
          <div style={{ fontSize: 11, color: "var(--ink-500)" }}>
            {p.category || "plante"}
            {p.water_need ? ` · ${p.water_need === "high" ? "💧💧💧" : p.water_need === "low" ? "💧" : "💧💧"}` : ""}
            {p.sun ? ` · ${p.sun === "sun" ? "sol" : p.sun === "shade" ? "skygge" : "delvis"}` : ""}
          </div>
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {n > 0 && (
            <>
              <button onClick={() => bump(p.slug, -1)} className="qty-btn"><Minus size={12} /></button>
              <span style={{ minWidth: 18, textAlign: "center", fontSize: 13, fontWeight: 500 }}>{n}</span>
            </>
          )}
          <button onClick={() => bump(p.slug, +1)} className="qty-btn"><Plus size={12} /></button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Tilføj planter til {zoneName}</DialogTitle>
        </DialogHeader>

        <div style={{ position: "relative", marginTop: 4 }}>
          <Search size={16} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--ink-500)" }} />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Søg plante (tomat, rose, basilikum…)" style={{ paddingLeft: 34 }} />
        </div>

        <div style={{ maxHeight: 360, overflow: "auto", display: "grid", gap: 6, marginTop: 8 }}>
          {loading && <div style={{ textAlign: "center", padding: 20, color: "var(--ink-500)", fontSize: 13 }}>Henter katalog…</div>}
          {!loading && suggestions.length > 0 && (
            <>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, color: "var(--ink-500)", padding: "6px 4px 0" }}>
                Forslag til {zoneSun === "sun" ? "fuld sol" : zoneSun === "shade" ? "skygge" : "delvis sol"}
              </div>
              {suggestions.map(renderRow)}
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, color: "var(--ink-500)", padding: "10px 4px 0" }}>
                Alle planter
              </div>
            </>
          )}
          {!loading && filtered.map(renderRow)}
          {!loading && filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: 20, color: "var(--ink-500)", fontSize: 13 }}>Ingen match.</div>
          )}
        </div>

        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(20,39,29,0.08)" }}>
          <div style={{ fontSize: 11, color: "var(--ink-500)", marginBottom: 6 }}>Egen plante</div>
          <div style={{ display: "flex", gap: 6 }}>
            <Leaf size={16} style={{ alignSelf: "center", color: "var(--ink-500)" }} />
            <Input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="fx 'Mormors rosenbusk'" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Annullér</Button>
          <Button onClick={handleSave} disabled={saving || (totalPicks === 0 && !customName.trim())}>
            {saving ? "Gemmer…" : `Tilføj ${totalPicks + (customName.trim() ? 1 : 0)} plante${(totalPicks + (customName.trim() ? 1 : 0)) === 1 ? "" : "r"}`}
          </Button>
        </DialogFooter>

        <style>{`.qty-btn{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:99px;border:1px solid rgba(20,39,29,0.15);background:white;cursor:pointer;color:var(--ink-900);}`}</style>
      </DialogContent>
    </Dialog>
  );
}
