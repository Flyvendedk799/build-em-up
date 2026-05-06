import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, Trash2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Product = {
  id: string; name: string; slug: string; category: string;
  base_price_dkk: number; in_stock: boolean; featured: boolean; image_url: string | null;
};

export default function AdminProducts() {
  const nav = useNavigate();
  const [rows, setRows] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("id,name,slug,category,base_price_dkk,in_stock,featured,image_url")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data ?? []) as Product[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const categories = useMemo(
    () => Array.from(new Set(rows.map((r) => r.category))).sort(),
    [rows],
  );
  const filtered = rows.filter((r) =>
    (cat === "all" || r.category === cat) &&
    (q === "" || r.name.toLowerCase().includes(q.toLowerCase()) || r.slug.toLowerCase().includes(q.toLowerCase()))
  );

  function toggleAll(checked: boolean) {
    setSel(checked ? new Set(filtered.map((r) => r.id)) : new Set());
  }
  function toggleOne(id: string, checked: boolean) {
    const next = new Set(sel);
    if (checked) next.add(id); else next.delete(id);
    setSel(next);
  }

  async function bulkDelete() {
    if (sel.size === 0) return;
    if (!confirm(`Slet ${sel.size} produkter?`)) return;
    const { error } = await supabase.from("products").delete().in("id", [...sel]);
    if (error) return toast.error(error.message);
    toast.success("Slettet");
    setSel(new Set());
    load();
  }
  async function bulkFeature(featured: boolean) {
    const { error } = await supabase.from("products").update({ featured }).in("id", [...sel]);
    if (error) return toast.error(error.message);
    toast.success("Opdateret");
    setSel(new Set());
    load();
  }
  async function createNew() {
    const slug = `nyt-produkt-${Date.now().toString(36)}`;
    const { data, error } = await supabase
      .from("products")
      .insert({ name: "Nyt produkt", slug, category: "andet", base_price_dkk: 0 })
      .select("id").single();
    if (error) return toast.error(error.message);
    nav(`/admin/products/${data.id}`);
  }

  const fmt = (n: number) => new Intl.NumberFormat("da-DK").format(n);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Produkter</h1>
          <p className="text-muted-foreground">{rows.length} i alt</p>
        </div>
        <Button onClick={createNew}><Plus className="h-4 w-4" /> Nyt produkt</Button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Søg navn eller slug…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">Alle kategorier</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {sel.size > 0 && (
          <>
            <Button variant="outline" size="sm" onClick={() => bulkFeature(true)}>
              <Star className="h-4 w-4" /> Featur ({sel.size})
            </Button>
            <Button variant="outline" size="sm" onClick={() => bulkFeature(false)}>Un-featur</Button>
            <Button variant="destructive" size="sm" onClick={bulkDelete}>
              <Trash2 className="h-4 w-4" /> Slet
            </Button>
          </>
        )}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-3 w-10">
                  <Checkbox
                    checked={filtered.length > 0 && sel.size === filtered.length}
                    onCheckedChange={(v) => toggleAll(!!v)}
                  />
                </th>
                <th className="p-3">Navn</th>
                <th className="p-3">Kategori</th>
                <th className="p-3 text-right">Pris</th>
                <th className="p-3 text-center">Lager</th>
                <th className="p-3 text-center">Featured</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Indlæser…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Ingen resultater.</td></tr>
              ) : filtered.map((p) => (
                <tr key={p.id} className="border-t hover:bg-muted/30">
                  <td className="p-3">
                    <Checkbox checked={sel.has(p.id)} onCheckedChange={(v) => toggleOne(p.id, !!v)} />
                  </td>
                  <td className="p-3">
                    <Link to={`/admin/products/${p.id}`} className="font-medium hover:underline">{p.name}</Link>
                    <div className="text-xs text-muted-foreground">/{p.slug}</div>
                  </td>
                  <td className="p-3">{p.category}</td>
                  <td className="p-3 text-right">{fmt(p.base_price_dkk)} kr</td>
                  <td className="p-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded ${p.in_stock ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                      {p.in_stock ? "På lager" : "Udsolgt"}
                    </span>
                  </td>
                  <td className="p-3 text-center">{p.featured ? <Star className="h-4 w-4 inline text-yellow-500 fill-current" /> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
