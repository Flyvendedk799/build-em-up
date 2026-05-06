import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Trash2, Upload, Copy, Search } from "lucide-react";

type FileRow = { name: string; id?: string; updated_at?: string; metadata?: { size?: number; mimetype?: string } };

const BUCKET = "product-media";

export default function AdminMedia() {
  const [files, setFiles] = useState<FileRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.storage.from(BUCKET).list("", {
      limit: 200, sortBy: { column: "updated_at", order: "desc" },
    });
    if (error) toast.error(error.message);
    setFiles((data ?? []).filter((f) => f.name && !f.name.startsWith(".")));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function onFiles(list: FileList | null) {
    if (!list || !list.length) return;
    setUploading(true);
    for (const file of Array.from(list)) {
      const path = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: "3600" });
      if (error) toast.error(`${file.name}: ${error.message}`);
    }
    setUploading(false);
    toast.success("Upload færdig");
    load();
  }

  async function remove(name: string) {
    if (!confirm(`Slet ${name}?`)) return;
    const { error } = await supabase.storage.from(BUCKET).remove([name]);
    if (error) return toast.error(error.message);
    toast.success("Slettet");
    load();
  }

  function publicUrl(name: string) {
    return supabase.storage.from(BUCKET).getPublicUrl(name).data.publicUrl;
  }

  const filtered = files.filter((f) => f.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Mediebibliotek</h1>
          <p className="text-sm text-muted-foreground">Filer i bucket <code>{BUCKET}</code></p>
        </div>
        <div className="flex gap-2">
          <input ref={inputRef} type="file" multiple hidden onChange={(e) => onFiles(e.target.files)} />
          <Button onClick={() => inputRef.current?.click()} disabled={uploading}>
            <Upload className="h-4 w-4 mr-2" />{uploading ? "Uploader…" : "Upload"}
          </Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Søg filnavn…" className="pl-9" />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Indlæser…</p>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">Ingen filer.</Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filtered.map((f) => {
            const url = publicUrl(f.name);
            const isImage = (f.metadata?.mimetype ?? "").startsWith("image/") || /\.(png|jpe?g|webp|gif|svg)$/i.test(f.name);
            return (
              <Card key={f.name} className="overflow-hidden group relative">
                <div className="aspect-square bg-muted flex items-center justify-center">
                  {isImage ? (
                    <img src={url} alt={f.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <span className="text-xs text-muted-foreground p-2 break-all">{f.name}</span>
                  )}
                </div>
                <div className="p-2 text-xs">
                  <div className="truncate" title={f.name}>{f.name}</div>
                  <div className="text-muted-foreground">
                    {f.metadata?.size ? `${(f.metadata.size / 1024).toFixed(0)} KB` : ""}
                  </div>
                </div>
                <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <Button size="icon" variant="secondary" className="h-7 w-7"
                    onClick={() => { navigator.clipboard.writeText(url); toast.success("URL kopieret"); }}>
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="destructive" className="h-7 w-7" onClick={() => remove(f.name)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
