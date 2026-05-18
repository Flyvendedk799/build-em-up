import { useEffect, useMemo, useState } from "react";
import { Camera, CheckCircle2, Footprints, MapPin, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";
import { mapAnchor, type CareAction, type GardenRoundStep } from "@/lib/companionTypes";

type Garden = Pick<Tables<"gardens">, "id" | "name">;
type Zone = Pick<Tables<"garden_zones">, "id" | "name" | "type">;
type Observation = Pick<Tables<"garden_observations">, "id" | "zone_id" | "kind" | "created_at">;

type Props = {
  userId: string;
  garden: Garden;
  zones: Zone[];
  observations: Observation[];
  actions: CareAction[];
  onScanZone: (zoneId: string) => void;
  onCompleteAction: (id: string) => void;
  onSaved: () => void;
};

function storageKey(gardenId: string) {
  return `companion.round.${gardenId}`;
}

function buildSteps(zones: Zone[], saved?: GardenRoundStep[]) {
  return zones.map((zone, index) => {
    const existing = saved?.find((step) => step.zone_id === zone.id);
    return existing ?? {
      zone_id: zone.id,
      status: index === 0 ? "active" : "pending",
      observations: [],
      completed_task_ids: [],
    };
  }) as GardenRoundStep[];
}

export default function GardenRound({ userId, garden, zones, observations, actions, onScanZone, onCompleteAction, onSaved }: Props) {
  const [steps, setSteps] = useState<GardenRoundStep[]>(() => {
    const raw = localStorage.getItem(storageKey(garden.id));
    try {
      return buildSteps(zones, raw ? JSON.parse(raw) as GardenRoundStep[] : undefined);
    } catch {
      return buildSteps(zones);
    }
  });

  useEffect(() => {
    setSteps((prev) => buildSteps(zones, prev));
  }, [zones]);

  useEffect(() => {
    localStorage.setItem(storageKey(garden.id), JSON.stringify(steps));
  }, [garden.id, steps]);

  const activeIndex = Math.max(0, steps.findIndex((step) => step.status === "active"));
  const activeStep = steps[activeIndex] ?? steps[0] ?? null;
  const activeZone = activeStep ? zones.find((zone) => zone.id === activeStep.zone_id) ?? null : null;
  const done = steps.filter((step) => step.status === "done").length;
  const zoneActions = activeStep ? actions.filter((action) => action.status === "open" && action.zone_id === activeStep.zone_id) : [];
  const zoneObservations = activeStep ? observations.filter((obs) => obs.zone_id === activeStep.zone_id) : [];
  const complete = done === steps.length && steps.length > 0;

  const summary = useMemo(() => ({
    zones: steps.length,
    observations: observations.length,
    openActions: actions.filter((action) => action.status === "open").length,
  }), [actions, observations.length, steps.length]);

  async function completeZone() {
    if (!activeStep || !activeZone) return;
    const anchor = mapAnchor(garden.id, activeZone.id, null, 0.5, 0.5, "zone_center");
    const { data, error } = await supabase.from("garden_observations").insert({
      user_id: userId,
      garden_id: garden.id,
      zone_id: activeZone.id,
      kind: "photo",
      caption: `Havegang gennemført i ${activeZone.name}`,
      anchor,
      ai_result: {
        round: true,
        checked_at: new Date().toISOString(),
        open_tasks_seen: zoneActions.map((action) => action.id),
      } as Json,
    }).select().single();
    if (error || !data) {
      toast.error(error?.message ?? "Kunne ikke gemme havegangen");
      return;
    }

    setSteps((prev) => prev.map((step, index) => {
      if (step.zone_id === activeStep.zone_id) {
        return { ...step, status: "done", observations: [...step.observations, data.id] };
      }
      if (index === activeIndex + 1) return { ...step, status: "active" };
      return step;
    }));
    toast.success(`${activeZone.name} er tjekket`);
    onSaved();
  }

  function restart() {
    const next = buildSteps(zones);
    setSteps(next);
    localStorage.setItem(storageKey(garden.id), JSON.stringify(next));
  }

  if (zones.length === 0) {
    return (
      <section className="companion-band companion-empty">
        <MapPin size={18} />
        Opret eller mål zoner først, så kan Havekompagnonen guide dig rundt.
      </section>
    );
  }

  return (
    <div className="companion-round">
      <section className="companion-band companion-round-hero">
        <div>
          <div className="companion-eyebrow">Havegang</div>
          <h2>{complete ? "Runden er færdig." : `Gå til ${activeZone?.name ?? "næste zone"}.`}</h2>
          <p>{complete ? `Du har været igennem ${done} zoner. Brug opsummeringen til at planlægge resten af dagen.` : "Tjek zonen, scan hvis noget ser anderledes ud, og luk opgaver direkte fra runden."}</p>
        </div>
        <div className="companion-round-score">
          <Footprints size={20} />
          <span>{done}/{steps.length}</span>
          <small>zoner</small>
        </div>
      </section>

      <div className="companion-round-grid">
        <section className="companion-band">
          <div className="companion-round-steps">
            {steps.map((step, index) => {
              const zone = zones.find((item) => item.id === step.zone_id);
              return (
                <button
                  key={step.zone_id}
                  className={step.status}
                  onClick={() => setSteps((prev) => prev.map((row) => ({ ...row, status: row.zone_id === step.zone_id ? "active" : row.status === "active" ? "pending" : row.status })))}
                >
                  <span>{step.status === "done" ? <CheckCircle2 size={14} /> : index + 1}</span>
                  <strong>{zone?.name ?? "Zone"}</strong>
                  <small>{zone?.type ?? "zone"}</small>
                </button>
              );
            })}
          </div>
        </section>

        <section className="companion-band">
          <div className="companion-section-head">
            <div>
              <div className="companion-eyebrow">Aktuel zone</div>
              <h2>{activeZone?.name ?? "Runde færdig"}</h2>
            </div>
            <Button variant="outline" size="sm" onClick={restart}><RotateCcw size={14} className="mr-1.5" /> Start forfra</Button>
          </div>

          {!complete && activeZone && (
            <>
              <div className="companion-round-actions">
                <Button onClick={() => onScanZone(activeZone.id)}><Camera size={14} className="mr-1.5" /> Scan zonen</Button>
                <Button variant="outline" onClick={completeZone}><CheckCircle2 size={14} className="mr-1.5" /> Marker tjekket</Button>
              </div>
              <div className="companion-round-facts">
                <span>{zoneObservations.length} observationer</span>
                <span>{zoneActions.length} åbne opgaver</span>
              </div>
              {zoneActions.length > 0 && (
                <div className="companion-round-task-list">
                  {zoneActions.slice(0, 4).map((action) => (
                    <article key={action.id}>
                      <div>
                        <strong>{action.title}</strong>
                        {action.reason && <p>{action.reason}</p>}
                      </div>
                      <Button size="sm" variant="outline" onClick={() => onCompleteAction(action.id)}>Klar</Button>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}

          {complete && (
            <div className="companion-round-summary">
              <Play size={18} />
              <strong>{summary.zones} zoner tjekket</strong>
              <span>{summary.observations} observationer i hukommelsen · {summary.openActions} åbne opgaver tilbage</span>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
