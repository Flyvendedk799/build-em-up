import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Bird,
  Bug,
  CheckCircle2,
  CircleCheck,
  Droplets,
  Flower2,
  Leaf,
  MapPin,
  PawPrint,
  ShieldCheck,
  Sparkles,
  Target,
  Trees,
  Waves,
} from "lucide-react";
import {
  buildWildlifeProfile,
  type WildlifePlant,
  type WildlifeResident,
  type WildlifeZone,
} from "@/lib/wildlife";

export type FocusKey = "all" | "pollinators" | "butterflies" | "helpers" | "birds" | "water";

type Props = {
  zones: WildlifeZone[];
  plantsByZone: Record<string, WildlifePlant[]>;
  /** Optional external focus (e.g. driven by the 3D habitat hero). Syncs the
   *  analysis filter when it changes, while local focus buttons keep working. */
  focus?: FocusKey;
};

const FOCUS_OPTIONS: {
  key: FocusKey;
  label: string;
  hint: string;
  icon: typeof Bug;
  residents: string[];
  mixes: string[];
  gaps: string[];
}[] = [
  {
    key: "all",
    label: "Alt liv",
    hint: "hele havens balance",
    icon: Sparkles,
    residents: [],
    mixes: [],
    gaps: [],
  },
  {
    key: "pollinators",
    label: "Bestøvere",
    hint: "bier, humlebier, svirrefluer",
    icon: Bug,
    residents: ["wild-bees", "beneficial-insects"],
    mixes: ["all-season-pollinators", "kitchen-garden-helpers"],
    gaps: ["early", "late", "nesting"],
  },
  {
    key: "butterflies",
    label: "Sommerfugle",
    hint: "nektar, larver, overvintring",
    icon: Flower2,
    residents: ["butterflies"],
    mixes: ["butterfly-nursery", "all-season-pollinators"],
    gaps: ["host", "early", "late"],
  },
  {
    key: "helpers",
    label: "Nyttedyr",
    hint: "mod bladlus og ubalance",
    icon: ShieldCheck,
    residents: ["beneficial-insects", "hedgehogs-ground"],
    mixes: ["kitchen-garden-helpers", "all-season-pollinators"],
    gaps: ["nesting", "early", "late"],
  },
  {
    key: "birds",
    label: "Fugle",
    hint: "bær, frø, skjul",
    icon: Bird,
    residents: ["birds", "hedgehogs-ground"],
    mixes: ["berries-and-birds"],
    gaps: ["birds", "water", "late"],
  },
  {
    key: "water",
    label: "Vandliv",
    hint: "padder, guldsmede, drikke",
    icon: Waves,
    residents: ["water-life", "birds"],
    mixes: ["water-edge"],
    gaps: ["water"],
  },
];

const GAP_IMPACT: Record<string, number> = {
  early: 8,
  late: 8,
  host: 9,
  water: 6,
  birds: 5,
  nesting: 4,
};

export default function WildlifeTab({ zones, plantsByZone, focus: externalFocus }: Props) {
  const [focus, setFocus] = useState<FocusKey>(externalFocus ?? "all");
  const [selectedMixKey, setSelectedMixKey] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [plannedKeys, setPlannedKeys] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    if (externalFocus) {
      setFocus(externalFocus);
      setSelectedMixKey(null);
    }
  }, [externalFocus]);
  const profile = useMemo(() => buildWildlifeProfile(zones, plantsByZone), [zones, plantsByZone]);
  const focusConfig = FOCUS_OPTIONS.find((option) => option.key === focus) ?? FOCUS_OPTIONS[0];
  const shownResidents = focus === "all"
    ? profile.likelyResidents
    : profile.likelyResidents.filter((resident) => focusConfig.residents.includes(resident.key));
  const shownGaps = focus === "all"
    ? profile.gaps
    : profile.gaps.filter((gap) => focusConfig.gaps.includes(gap.key));
  const shownMixes = focus === "all"
    ? profile.mixes
    : profile.mixes.filter((mix) => focusConfig.mixes.includes(mix.key));
  const selectedMix = shownMixes.find((mix) => mix.key === selectedMixKey) ?? shownMixes[0] ?? profile.mixes[0];
  const selectedMixZones = selectedMix ? zonesForMix(selectedMix.key, profile.zonePlans) : [];
  const selectedZone = profile.zonePlans.find((zone) => zone.zoneId === selectedZoneId) ?? profile.zonePlans[0] ?? null;
  const highResidents = profile.likelyResidents.filter((resident) => resident.likelihood === "høj").length;
  const zoneCount = profile.zonePlans.length;
  const plannedImpact = Array.from(plannedKeys).reduce((sum, key) => sum + (GAP_IMPACT[key] ?? 3), 0);
  const projectedScore = Math.min(100, profile.score + plannedImpact);

  function togglePlanned(key: string) {
    setPlannedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="wildlife-page">
      <section className="companion-band wildlife-hero">
        <div>
          <div className="companion-eyebrow">Dyreliv</div>
          <h2>{profile.label}</h2>
          <p>{profile.explanation} Profilen vurderer hvem haven allerede hjælper, og hvilke planter eller små habitater der giver mest ekstra liv.</p>
          <div className="wildlife-check-grid">
            {profile.checks.map((check) => (
              <span key={check.key} className={check.met ? "met" : ""}>
                <CircleCheck size={13} />
                <strong>{check.label}</strong>
                {check.detail}
              </span>
            ))}
          </div>
        </div>
        <div className="wildlife-score-card" aria-label={`Dyrelivsscore ${profile.score} ud af 100`}>
          <div className="wildlife-score-ring" style={{ ["--score" as string]: `${profile.score}%` }}>
            <span>{profile.score}</span>
            <small>/ 100</small>
          </div>
          <div className="wildlife-score-facts">
            <span><Bug size={13} /> {highResidents} stærke gæster</span>
            <span><Leaf size={13} /> {profile.presentPlantNames.length} planter</span>
            <span><Target size={13} /> {profile.gaps.length} næste greb</span>
          </div>
        </div>
      </section>

      <section className="wildlife-control-panel" aria-label="Dyrelivsfokus">
        <div className="wildlife-focus-grid">
          {FOCUS_OPTIONS.map(({ key, label, hint, icon: Icon }) => (
            <button key={key} className={focus === key ? "active" : ""} onClick={() => { setFocus(key); setSelectedMixKey(null); }}>
              <Icon size={16} />
              <strong>{label}</strong>
              <small>{hint}</small>
            </button>
          ))}
        </div>
        <div className="wildlife-plan-preview">
          <span>Planlagt effekt</span>
          <strong>{profile.score} <ArrowRight size={14} /> {projectedScore}</strong>
          <small>{plannedKeys.size} greb valgt</small>
        </div>
      </section>

      {profile.presentPlantNames.length === 0 && (
        <section className="wildlife-empty">
          <Sparkles size={18} />
          Tilføj planter i fanen Planter for at gøre dyrelivsprofilen mere præcis. Indtil da viser vi de bedste basisgreb for en dansk have.
        </section>
      )}

      <section className="wildlife-section">
        <div className="companion-section-head">
          <div>
            <div className="companion-eyebrow">Hvem kan komme?</div>
            <h2>Arter og grupper haven sandsynligvis kan tiltrække.</h2>
          </div>
        </div>
        <div className="wildlife-resident-grid">
          {shownResidents.map((resident) => (
            <article key={resident.key} className={`wildlife-card wildlife-card--${resident.likelihood}`}>
              <div className="wildlife-card-top">
                <ResidentIcon resident={resident} />
                <span>{resident.likelihood} chance</span>
              </div>
              <h3>{resident.name}</h3>
              <small>{resident.kind}</small>
              <p>{resident.why}</p>
              <ChipList title="Vil have" items={resident.wants} />
              <ChipList title="Plant mere" items={resident.plants} />
            </article>
          ))}
        </div>
      </section>

      <section className="wildlife-section wildlife-two-col">
        <div>
          <div className="companion-section-head">
            <div>
              <div className="companion-eyebrow">Huller i kæden</div>
              <h2>Næste greb med størst effekt.</h2>
            </div>
          </div>
          <div className="wildlife-stack">
            {shownGaps.slice(0, 5).map((gap) => {
              const isPlanned = plannedKeys.has(gap.key);
              return (
              <article key={gap.key} className={`wildlife-action ${isPlanned ? "planned" : ""}`}>
                <div>
                  <span>{gap.priority} prioritet</span>
                  <h3>{gap.title}</h3>
                  <p>{gap.reason}</p>
                </div>
                <ChipList title="Planter" items={gap.plants} />
                <ChipList title="Gør" items={gap.actions} />
                <button className="wildlife-plan-toggle" onClick={() => togglePlanned(gap.key)}>
                  {isPlanned ? <CheckCircle2 size={14} /> : <Target size={14} />}
                  {isPlanned ? "Planlagt" : `Planlæg +${GAP_IMPACT[gap.key] ?? 3}`}
                </button>
              </article>
            );})}
          </div>
        </div>

        <div>
          <div className="companion-section-head">
            <div>
              <div className="companion-eyebrow">Optimale mix</div>
              <h2>Kombinationer der løfter flere arter på én gang.</h2>
            </div>
          </div>
          <div className="wildlife-mix-workbench">
            <div className="wildlife-stack">
              {shownMixes.map((mix) => (
                <button
                  key={mix.key}
                  className={`wildlife-mix ${selectedMix?.key === mix.key ? "selected" : ""}`}
                  onClick={() => setSelectedMixKey(mix.key)}
                >
                <div className="wildlife-mix-score">{mix.score}% match</div>
                <div>
                  <h3>{mix.title}</h3>
                  <p>{mix.bestFor}</p>
                </div>
                </button>
              ))}
            </div>
            {selectedMix && (
              <article className="wildlife-recipe">
                <span>Valgt mix</span>
                <h3>{selectedMix.title}</h3>
                <p>{selectedMix.bestFor}</p>
                <ChipList title="Dyreliv" items={selectedMix.animals} />
                <ChipList title="Planter" items={selectedMix.plants} />
                <ChipList title="Gør" items={selectedMix.actions} />
                {selectedMixZones.length > 0 && (
                  <div className="wildlife-chip-block">
                    <span>Bedst i</span>
                    <div>
                      {selectedMixZones.map((zone) => (
                        <small key={zone.zoneId}><MapPin size={11} />{zone.zoneName}</small>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            )}
          </div>
        </div>
      </section>

      <section className="wildlife-section">
        <div className="companion-section-head">
          <div>
            <div className="companion-eyebrow">Bede og zoner</div>
            <h2>Hvad hvert område kan blive bedst til.</h2>
          </div>
          <span className="wildlife-zone-count">{zoneCount} zone{zoneCount === 1 ? "" : "r"}</span>
        </div>
        {selectedZone ? (
          <div className="wildlife-zone-workbench">
            <div className="wildlife-zone-picker">
              {profile.zonePlans.map((zone) => (
                <button key={zone.zoneId} className={selectedZone.zoneId === zone.zoneId ? "active" : ""} onClick={() => setSelectedZoneId(zone.zoneId)}>
                  <MapPin size={13} />
                  {zone.zoneName}
                </button>
              ))}
            </div>
            <article className="wildlife-zone-card wildlife-zone-card--featured">
              <h3>{selectedZone.zoneName}</h3>
              <p>{selectedZone.summary}</p>
              <ChipList title="Kan støtte" items={selectedZone.residents} />
              <ChipList title="Styrker" items={selectedZone.strengths} />
              <ChipList title="Plant her" items={selectedZone.plantSuggestions} />
              <ChipList title="Habitatgreb" items={selectedZone.habitatMoves} />
            </article>
          </div>
        ) : (
          <section className="wildlife-empty">
            <MapPin size={18} />
            Mål eller opret zoner for at få præcise anbefalinger pr. område.
          </section>
        )}
      </section>
    </div>
  );
}

function ResidentIcon({ resident }: { resident: WildlifeResident }) {
  if (resident.key === "birds") return <Bird size={18} />;
  if (resident.key === "hedgehogs-ground") return <PawPrint size={18} />;
  if (resident.key === "water-life") return <Waves size={18} />;
  if (resident.key === "wild-bees" || resident.key === "beneficial-insects") return <Bug size={18} />;
  if (resident.key === "butterflies") return <Flower2 size={18} />;
  return <Trees size={18} />;
}

function ChipList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="wildlife-chip-block">
      <span>{title}</span>
      <div>
        {items.map((item) => (
          <small key={item}>
            {title === "Gør" || title === "Habitatgreb" ? <ShieldCheck size={11} /> : title === "Plant her" || title === "Planter" || title === "Plant mere" ? <SproutIcon /> : <Droplets size={11} />}
            {item}
          </small>
        ))}
      </div>
    </div>
  );
}

function SproutIcon() {
  return <Leaf size={11} />;
}

function zonesForMix(mixKey: string, zones: { zoneId: string; zoneName: string; residents: string[]; plantSuggestions: string[] }[]) {
  const needles: Record<string, string[]> = {
    "all-season-pollinators": ["bier", "humlebier"],
    "butterfly-nursery": ["sommerfugle"],
    "kitchen-garden-helpers": ["svirrefluer", "mariehøns"],
    "berries-and-birds": ["småfugle"],
    "water-edge": ["frøer", "guldsmede"],
  };
  const terms = needles[mixKey] ?? [];
  const matches = zones.filter((zone) => {
    const haystack = [...zone.residents, ...zone.plantSuggestions].join(" ").toLowerCase();
    return terms.some((term) => haystack.includes(term));
  });
  return (matches.length ? matches : zones).slice(0, 3);
}
