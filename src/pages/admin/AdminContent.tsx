import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Save, Trash2 } from "lucide-react";

type Block = { key: string; value: any; updated_at: string };

export default function AdminContent() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("content_blocks").select("*").order("key");
    setBlocks(data ?? []);
    setDrafts(Object.fromEntries((data ?? []).map((b) => [b.key, JSON.stringify(b.value, null, 2)])));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save(key: string) {
    let parsed: any;
    try { parsed = JSON.parse(drafts[key]); }
    catch { return toast.error("Ugyldig JSON"); }
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("content_blocks")
      .upsert({ key, value: parsed, updated_by: user?.id, updated_at: new Date().toISOString() });
    if (error) return toast.error(error.message);
    toast.success(`Gemte ${key}`);
    load();
  }

  async function create() {
    const k = newKey.trim();
    if (!k) return;
    const { error } = await supabase.from("content_blocks").insert({ key: k, value: {} });
    if (error) return toast.error(error.message);
    setNewKey("");
    load();
  }

  async function remove(key: string) {
    if (!confirm(`Slet "${key}"?`)) return;
    const { error } = await supabase.from("content_blocks").delete().eq("key", key);
    if (error) return toast.error(error.message);
    toast.success("Slettet");
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Indholdsblokke</h1>
        <p className="text-sm text-muted-foreground">
          Nøgle/værdi (JSON) — læses i UI med <code>useContentBlock(key, fallback)</code>.
        </p>
      </div>

      <Card className="p-4 flex gap-2">
        <Input placeholder="ny.nøgle (fx home.hero)" value={newKey} onChange={(e) => setNewKey(e.target.value)} />
        <Button onClick={create}><Plus className="h-4 w-4 mr-1" /> Opret</Button>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground">Indlæser…</p>
      ) : blocks.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">Ingen blokke endnu.</Card>
      ) : (
        <div className="space-y-3">
          {blocks.map((b) => (
            <Card key={b.key} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-mono text-sm font-medium">{b.key}</div>
                  <div className="text-xs text-muted-foreground">
                    Opdateret {new Date(b.updated_at).toLocaleString("da-DK")}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => save(b.key)}><Save className="h-4 w-4 mr-1" /> Gem</Button>
                  <Button size="sm" variant="destructive" onClick={() => remove(b.key)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Textarea
                rows={6} className="font-mono text-xs"
                value={drafts[b.key] ?? ""}
                onChange={(e) => setDrafts({ ...drafts, [b.key]: e.target.value })}
              />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
