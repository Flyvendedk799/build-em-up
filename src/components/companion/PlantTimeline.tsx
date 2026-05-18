import { Activity, Camera, CheckCircle2, Flower2, Leaf, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/integrations/supabase/types";
import type { HealthScore, ProblemResolutionState, TimelineEvent } from "@/lib/companionTypes";
import { buildTimeline, latestGrowthPair, problemResolutionState } from "@/lib/companionTimeline";

type Plant = Tables<"user_plants"> & {
  plants_catalog?: { name_da: string | null; water_need: string | null; image_url: string | null } | null;
};
type Observation = Tables<"garden_observations">;
type HealthLog = Tables<"plant_health_log">;
type Growth = Tables<"plant_growth_snapshots">;
type Task = Tables<"task_log">;
type Journal = Tables<"garden_journal">;

type Props = {
  plant: Plant;
  zoneName?: string | null;
  observations: Observation[];
  healthLogs: HealthLog[];
  growthSnapshots: Growth[];
  tasks: Task[];
  journal: Journal[];
  healthScore?: HealthScore;
  onScan: () => void;
  onFollowUp: (state: ProblemResolutionState) => void;
};

function plantName(plant: Plant) {
  return plant.custom_name || plant.plants_catalog?.name_da || plant.plant_slug || "Plante";
}

function dateLabel(iso?: string | null) {
  if (!iso) return "uden dato";
  return new Date(iso).toLocaleDateString("da-DK", { day: "numeric", month: "short" });
}

function iconFor(event: TimelineEvent) {
  if (event.type === "diagnosis") return <Leaf size={15} />;
  if (event.type === "growth") return <Flower2 size={15} />;
  if (event.type === "task") return <CheckCircle2 size={15} />;
  if (event.type === "harvest") return <Sprout size={15} />;
  return <Camera size={15} />;
}

function stateText(state: ProblemResolutionState) {
  if (state === "open") return "Åbent problem";
  if (state === "watching") return "Hold øje";
  if (state === "improving") return "Bedring set";
  return "Løst";
}

export default function PlantTimeline({ plant, zoneName, observations, healthLogs, growthSnapshots, tasks, journal, healthScore, onScan, onFollowUp }: Props) {
  const events = buildTimeline({ observations, healthLogs, growthSnapshots, tasks, journal, plantId: plant.id });
  const growthPair = latestGrowthPair(growthSnapshots, plant.id);
  const resolution = problemResolutionState(healthLogs, tasks, plant.id);

  return (
    <section className="companion-band companion-plant-timeline">
      <div className="companion-section-head">
        <div>
          <div className="companion-eyebrow">Plantetidslinje</div>
          <h2>{plantName(plant)}</h2>
          <p>{zoneName || "Ikke placeret"} · {plant.lifecycle_status || "observeret"} · {plant.health_status || "ukendt helbred"}</p>
        </div>
        <Button onClick={onScan}><Camera size={14} className="mr-1.5" /> Scan igen</Button>
      </div>

      <div className="companion-timeline-status">
        <article>
          <Activity size={17} />
          <span>{healthScore?.score ?? "-"}</span>
          <small>{healthScore?.explanation ?? "Scoringen opdateres med flere observationer."}</small>
        </article>
        <article>
          <Leaf size={17} />
          <span>{stateText(resolution)}</span>
          <small>Seneste sygdoms-/skadedyrsløkke</small>
        </article>
        <article>
          <Flower2 size={17} />
          <span>{growthPair.length >= 2 ? "Sammenligning klar" : "Mangler foto"}</span>
          <small>{growthPair.length >= 2 ? "Seneste to vækstspor vises nedenfor." : "Tag endnu et vækstfoto fra samme vinkel."}</small>
        </article>
      </div>

      <div className="companion-growth-compare">
        {[growthPair[1], growthPair[0]].map((growth, index) => (
          <article key={growth?.id ?? index} className={!growth ? "empty" : ""}>
            <strong>{growth ? dateLabel(growth.created_at) : index === 0 ? "Før" : "Nu"}</strong>
            {growth ? (
              <>
                <span>{growth.stage || "stadie ukendt"} · {growth.vigor || "vigor ukendt"}</span>
                <small>{growth.estimated_height_cm ? `${growth.estimated_height_cm} cm · ` : ""}{growth.harvest_readiness || "høst ukendt"}</small>
                {(growth.anomaly_flags ?? []).length > 0 && <em>{growth.anomaly_flags.join(", ")}</em>}
              </>
            ) : (
              <span>Kræver endnu et vækstfoto.</span>
            )}
          </article>
        ))}
      </div>

      {resolution !== "resolved" && (
        <div className="companion-issue-actions">
          <Button variant="outline" size="sm" onClick={() => onFollowUp("watching")}>Følg op</Button>
          <Button variant="outline" size="sm" onClick={() => onFollowUp("improving")}>Bedring set</Button>
          <Button size="sm" onClick={() => onFollowUp("resolved")}>Løst</Button>
        </div>
      )}

      <div className="companion-timeline-list">
        {events.slice(0, 12).map((event) => (
          <article key={event.id}>
            {event.image_url ? <img src={event.image_url} alt="" /> : <span>{iconFor(event)}</span>}
            <div>
              <strong>{event.title}</strong>
              <small>{event.subtitle} · {dateLabel(event.created_at)}</small>
            </div>
          </article>
        ))}
        {events.length === 0 && (
          <div className="companion-empty"><Camera size={18} /> Ingen tidslinje endnu. Start med en scan.</div>
        )}
      </div>
    </section>
  );
}
