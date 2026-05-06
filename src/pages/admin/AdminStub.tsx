import { Card, CardContent } from "@/components/ui/card";

export function AdminStub({ title, note }: { title: string; note?: string }) {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <Card><CardContent className="pt-6">
        <p className="text-muted-foreground">
          {note ?? "Denne sektion bliver bygget i en kommende sekvens."}
        </p>
      </CardContent></Card>
    </div>
  );
}
