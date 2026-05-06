import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Send } from "lucide-react";

export default function AdminNotifications() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [audience, setAudience] = useState("all");
  const [sending, setSending] = useState(false);

  async function send() {
    if (!title.trim()) return toast.error("Titel mangler");
    if (!confirm(`Send "${title}" til ${audience === "all" ? "alle brugere" : audience}?`)) return;
    setSending(true);
    const { data, error } = await supabase.functions.invoke("admin-broadcast", {
      body: { title, body, link: link || null, audience },
    });
    setSending(false);
    if (error) return toast.error(error.message);
    toast.success(`Sendt til ${data?.sent ?? 0} brugere`);
    setTitle(""); setBody(""); setLink("");
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Notifikationer</h1>
        <p className="text-sm text-muted-foreground">Send en besked til alle eller en gruppe brugere.</p>
      </div>

      <Card className="p-6 space-y-4">
        <div>
          <Label>Titel *</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Fx: Nyhed: Forårsudsalg" />
        </div>
        <div>
          <Label>Tekst</Label>
          <Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
        <div>
          <Label>Link (valgfri)</Label>
          <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="/webshop" />
        </div>
        <div>
          <Label>Målgruppe</Label>
          <Select value={audience} onValueChange={setAudience}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle brugere</SelectItem>
              <SelectItem value="admins">Kun admins</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={send} disabled={sending}>
          <Send className="h-4 w-4 mr-2" />{sending ? "Sender…" : "Send broadcast"}
        </Button>
      </Card>
    </div>
  );
}
