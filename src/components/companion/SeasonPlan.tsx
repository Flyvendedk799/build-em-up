import { CalendarDays, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CareAction } from "@/lib/companionTypes";

type Props = {
  actions: Omit<CareAction, "id">[];
  onAdd: (action: Omit<CareAction, "id">) => void;
  onAddAll: () => void;
};

function priorityText(priority: CareAction["priority"]) {
  if (priority === "urgent") return "Akut";
  if (priority === "high") return "Vigtig";
  if (priority === "low") return "Lav";
  return "Normal";
}

export default function SeasonPlan({ actions, onAdd, onAddAll }: Props) {
  return (
    <section className="companion-band companion-season-plan">
      <div className="companion-section-head">
        <div>
          <div className="companion-eyebrow">Sæson-autopilot</div>
          <h2>Denne måneds plan fra planter, zoner og årshjul.</h2>
        </div>
        {actions.length > 0 && <Button onClick={onAddAll}><CalendarDays size={14} className="mr-1.5" /> Tilføj sæsonplan</Button>}
      </div>

      {actions.length === 0 ? (
        <div className="companion-empty"><Sparkles size={18} /> Ingen nye sæsonopgaver lige nu.</div>
      ) : (
        <div className="companion-season-grid">
          {actions.map((action, index) => (
            <article key={`${action.kind}-${action.zone_id}-${action.title}-${index}`}>
              <span>{priorityText(action.priority)}</span>
              <h3>{action.title}</h3>
              {action.reason && <p>{action.reason}</p>}
              <Button size="sm" variant="outline" onClick={() => onAdd(action)}>Tilføj</Button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
