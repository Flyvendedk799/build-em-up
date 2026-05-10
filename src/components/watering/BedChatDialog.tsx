import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

export default function BedChatDialog({
  open, onOpenChange, zoneName, plantNames, sun, soil,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  zoneName: string;
  plantNames: string[];
  sun?: string | null;
  soil?: string | null;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!open) { setMessages([]); setInput(""); } }, [open]);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);

  const ctxLine = `Kontekst: Bedet "${zoneName}"${sun ? ` · ${sun === "sun" ? "fuld sol" : sun === "part" ? "delvis sol" : "skygge"}` : ""}${soil ? ` · ${soil === "sand" ? "sandet" : soil === "clay" ? "leret" : "muldet"} jord` : ""}${plantNames.length ? ` · planter: ${plantNames.slice(0, 10).join(", ")}` : ""}.`;

  async function send(text: string) {
    if (!text.trim() || sending) return;
    setInput("");
    const userMsg: Msg = { role: "user", content: text };
    const sysMsg: Msg = { role: "assistant", content: ctxLine };
    const history = messages.length === 0 ? [{ role: "user" as const, content: ctxLine + "\n\nSpørgsmål: " + text }] : [...messages, userMsg];
    setMessages(prev => [...prev, userMsg]);
    setSending(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/garden-chat`;
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ messages: history }),
      });
      if (!resp.ok) {
        if (resp.status === 429) toast.error("AI er optaget — prøv igen");
        else if (resp.status === 402) toast.error("AI-kredit opbrugt");
        else toast.error("AI-fejl");
        return;
      }
      if (!resp.body) return;
      let acc = "";
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);
      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const r = await reader.read();
        if (r.done) break;
        buf += dec.decode(r.value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl); buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") return;
          try {
            const j = JSON.parse(data);
            const c = j?.choices?.[0]?.delta?.content;
            if (c) { acc += c; setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, content: acc } : m)); }
          } catch {}
        }
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Fejl");
    } finally { setSending(false); }
  }

  const suggestions = [
    "Skal jeg vande nu?",
    "Hvad kan jeg så her i denne måned?",
    "Hvilke planter passer godt sammen i dette bed?",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles size={16} />Spørg AI om {zoneName}</DialogTitle>
        </DialogHeader>

        <div ref={scrollRef} style={{ maxHeight: 380, minHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, padding: "4px 0" }}>
          {messages.length === 0 ? (
            <div className="grid gap-2">
              <div className="text-xs text-muted-foreground mb-1">{ctxLine}</div>
              {suggestions.map(s => (
                <button key={s} onClick={() => send(s)}
                  className="text-left text-sm px-3 py-2 rounded-lg border hover:bg-accent transition"
                  style={{ borderColor: "rgba(20,39,29,0.08)" }}>
                  {s}
                </button>
              ))}
            </div>
          ) : messages.map((m, i) => (
            <div key={i} style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "88%", padding: "9px 13px", borderRadius: 14,
              background: m.role === "user" ? "var(--forest-800)" : "var(--ink-50)",
              color: m.role === "user" ? "white" : "var(--ink-900)",
              fontSize: 13.5, lineHeight: 1.5,
            }}>
              {m.role === "assistant"
                ? <div className="prose prose-sm" style={{ maxWidth: "none" }}><ReactMarkdown>{m.content || "…"}</ReactMarkdown></div>
                : m.content}
            </div>
          ))}
          {sending && messages[messages.length - 1]?.role === "user" && (
            <div style={{ alignSelf: "flex-start", color: "var(--ink-500)", fontSize: 12 }}>
              <Loader2 size={12} className="inline animate-spin mr-1" />tænker…
            </div>
          )}
        </div>

        <div className="flex gap-2 items-end pt-2 border-t" style={{ borderColor: "rgba(20,39,29,0.06)" }}>
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder={`Spørg om ${zoneName}…`}
            rows={1}
            style={{ minHeight: 40, maxHeight: 100, resize: "none", fontSize: 13 }}
            disabled={sending}
          />
          <Button onClick={() => send(input)} disabled={sending || !input.trim()} size="sm" style={{ height: 40 }}>
            <Send size={14} />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
