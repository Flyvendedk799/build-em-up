import type { Tables } from "@/integrations/supabase/types";

export type IntegrationConnection = Tables<"integration_connections">;

export type IntegrationProvider = {
  provider: string;
  kind: string;
  name: string;
  description: string;
  scope: "profile" | "garden" | "device" | "calendar" | "notification" | "ai";
  tools: string[];
  route: string;
  canActivateLocally: boolean;
};

export const CROSS_PLATFORM_PROVIDERS: IntegrationProvider[] = [
  {
    provider: "profile-context",
    kind: "profile",
    name: "Fælles haveprofil",
    description: "Deler aktiv have, adresse, mål, bed og plantekontekst på tværs af værktøjerne.",
    scope: "profile",
    tools: ["Profil", "Havemåler", "Min have", "Havekompagnon", "Plantepleje AI"],
    route: "/konto",
    canActivateLocally: true,
  },
  {
    provider: "app-handoff",
    kind: "handoff",
    name: "Kontekst-handoff",
    description: "Åbner næste værktøj med samme have, zone, plante og arbejdsflow.",
    scope: "profile",
    tools: ["Plantepleje AI", "Havekompagnon", "Havemåler"],
    route: "/havekompagnon",
    canActivateLocally: true,
  },
  {
    provider: "ai-garden-memory",
    kind: "ai_memory",
    name: "AI-havehukommelse",
    description: "Giver AI adgang til seneste observationer, opgaver, diagnoser og sensorer.",
    scope: "ai",
    tools: ["Plantepleje AI", "Havekompagnon", "Plan"],
    route: "/ai",
    canActivateLocally: true,
  },
  {
    provider: "calendar-sync",
    kind: "calendar",
    name: "Kalender-sync",
    description: "Eksporterer plejeplaner, opfølgningsopgaver og sæsonhandlinger til kalender.",
    scope: "calendar",
    tools: ["Plan", "Plantepleje AI", "Havekompagnon"],
    route: "/havekompagnon",
    canActivateLocally: true,
  },
  {
    provider: "push-reminders",
    kind: "notifications",
    name: "Push og påmindelser",
    description: "Samler vigtige opgaver, sygdomsopfølgning og device-signaler i notifikationer.",
    scope: "notification",
    tools: ["Profil", "Plan", "Smart have", "Plantepleje AI"],
    route: "/konto",
    canActivateLocally: true,
  },
  {
    provider: "smart-garden-devices",
    kind: "devices",
    name: "Smart garden devices",
    description: "Fugtsensorer, ventiler, drivhus og robotklipper kobles til kort og anbefalinger.",
    scope: "device",
    tools: ["Smart have", "Vanding", "Havekompagnon"],
    route: "/havekompagnon",
    canActivateLocally: false,
  },
  {
    provider: "local-weather",
    kind: "weather",
    name: "Lokal vejrpræcision",
    description: "Bruger adresse, position og vejrstationer til bedre vanding, frost og sygdomsrisiko.",
    scope: "garden",
    tools: ["Vanding", "Havekompagnon", "Plantepleje AI"],
    route: "/havekompagnon",
    canActivateLocally: true,
  },
];

export function connectionFor(provider: IntegrationProvider, connections: IntegrationConnection[]) {
  return connections.find((connection) => connection.provider === provider.provider && connection.kind === provider.kind) ?? null;
}

export function isConnectionActive(connection: IntegrationConnection | null | undefined) {
  return connection?.status === "connected" || connection?.status === "active" || connection?.status === "ready";
}

export function integrationStatusLabel(connection: IntegrationConnection | null | undefined) {
  if (!connection) return "Ikke aktiv";
  if (isConnectionActive(connection)) return "Aktiv";
  if (connection.status === "paused") return "Sat på pause";
  if (connection.status === "planned") return "Klar til opsætning";
  return connection.status;
}

export function integrationReadiness(connections: IntegrationConnection[]) {
  const active = CROSS_PLATFORM_PROVIDERS.filter((provider) => isConnectionActive(connectionFor(provider, connections))).length;
  const score = CROSS_PLATFORM_PROVIDERS.length === 0 ? 0 : Math.round((active / CROSS_PLATFORM_PROVIDERS.length) * 100);
  const missing = CROSS_PLATFORM_PROVIDERS.filter((provider) => !isConnectionActive(connectionFor(provider, connections)));
  return { active, total: CROSS_PLATFORM_PROVIDERS.length, score, missing };
}

export const TOOL_FLOW = [
  {
    name: "Profil",
    route: "/konto",
    shares: "Adresse, aktiv have, notifikationer og integrationsvalg.",
  },
  {
    name: "Havemåler",
    route: "/havemaaler",
    shares: "Målt have, ortofoto, areal og zoner.",
  },
  {
    name: "Min have",
    route: "/min-have",
    shares: "Overblik over haver, planter, opgaver og status.",
  },
  {
    name: "Havekompagnon",
    route: "/havekompagnon",
    shares: "Kort, observationer, sensorer, plejeplan og sæsonhandlinger.",
  },
  {
    name: "Plantepleje AI",
    route: "/ai",
    shares: "Foto, diagnose, vækst, handlingsplan og journal.",
  },
  {
    name: "Kalender og enheder",
    route: "/havekompagnon",
    shares: "Påmindelser, device-signaler, vanding og opfølgning.",
  },
];
