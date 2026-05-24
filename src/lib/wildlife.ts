export type WildlifeZone = {
  id: string;
  name: string;
  type?: string | null;
  area_m2?: number | string | null;
  sun_exposure?: string | null;
  soil?: string | null;
};

export type WildlifePlant = {
  id?: string;
  zone_id?: string | null;
  plant_slug?: string | null;
  custom_name?: string | null;
  name_da?: string | null;
  qty?: number | null;
  water_need?: string | null;
};

export type WildlifeCheck = {
  key: string;
  label: string;
  met: boolean;
  detail: string;
};

export type WildlifeResident = {
  key: string;
  name: string;
  kind: string;
  likelihood: "høj" | "middel" | "lav";
  why: string;
  wants: string[];
  plants: string[];
};

export type WildlifeGap = {
  key: string;
  title: string;
  priority: "høj" | "middel";
  reason: string;
  plants: string[];
  actions: string[];
};

export type WildlifeMix = {
  key: string;
  title: string;
  bestFor: string;
  score: number;
  animals: string[];
  plants: string[];
  actions: string[];
};

export type WildlifeZonePlan = {
  zoneId: string;
  zoneName: string;
  summary: string;
  residents: string[];
  strengths: string[];
  plantSuggestions: string[];
  habitatMoves: string[];
};

export type WildlifeProfile = {
  score: number;
  label: string;
  explanation: string;
  checks: WildlifeCheck[];
  likelyResidents: WildlifeResident[];
  gaps: WildlifeGap[];
  mixes: WildlifeMix[];
  zonePlans: WildlifeZonePlan[];
  presentPlantNames: string[];
};

type BucketKey =
  | "early"
  | "summer"
  | "late"
  | "host"
  | "umbel"
  | "berry"
  | "wet"
  | "native";

const PLANT_BUCKETS: Record<BucketKey, string[]> = {
  early: [
    "seljepil", "pil", "lungeurt", "krokus", "erantis", "vintergaek",
    "engkarse", "logkarse", "dovnaelde", "dodnaelde", "viol", "folfod", "vinterkarse",
    "aeble", "paere", "kirsebaer", "blomme", "ribs", "solbaer", "stikkelsbaer",
  ],
  summer: [
    "lavendel", "timian", "merian", "oregano", "isop", "blaahat", "kattehale",
    "almindelig knopurt", "knopurt", "rodklover", "rodklver", "roedklover", "klover",
    "slangehoved", "hjulkrone", "kornblomst", "honningurt", "morgenfrue",
    "purlog", "salvie", "mynte", "basilikum", "rosmarin", "solhat",
    "rollike", "rllike", "roellike", "staude", "asters",
  ],
  late: [
    "vedbend", "efeu", "hjortetroest", "hjortetrost", "sankthansurt", "sedum",
    "djvelsbid", "djaevelsbid", "kongepen", "hestemynte", "asters", "hostasters",
    "høstasters", "kattehale", "rollike", "rllike", "roellike", "solsikke",
  ],
  host: [
    "braendenaelde", "brndenlde", "naelde", "logkarse", "engkarse", "judaspenge",
    "kal", "kaal", "rodklover", "rodklver", "roedklover", "klover", "kaellingetand",
    "torst", "trost", "toerst", "vrietorn", "viol", "graes", "svingel", "rajgraes",
    "rapgraes", "hundegras", "hundegrs",
  ],
  umbel: [
    "dild", "fennikel", "koriander", "persille", "skaerm", "skaermplante",
    "gulerod", "pastinak", "kommen", "rollike", "rllike", "roellike", "morgenfrue",
    "tagetes", "honningurt", "kornblomst", "alyssum", "purlog",
  ],
  berry: [
    "hyld", "tjorn", "tjoern", "ron", "roenne", "ribs", "solbaer",
    "stikkelsbaer", "hindbaer", "brombær", "brombaer", "jordbaer",
    "kirsebaer", "aeble", "paere", "blomme", "rose", "hyben", "vedbend",
    "kaprifolie", "solsikke",
  ],
  wet: [
    "kattehale", "engkarse", "mjodurt", "mjoedurt", "vandmynte", "baldrian",
    "gul iris", "iris", "fredlos", "fredloes", "dunhammer", "kabbeleje",
  ],
  native: [
    "seljepil", "blaahat", "kattehale", "almindelig knopurt", "rollike", "rllike",
    "roellike", "rodklover", "rodklver", "roedklover", "kaellingetand", "logkarse",
    "engkarse", "viol", "tjorn", "tjoern", "hyld", "ron", "roenne",
    "vedbend", "kaprifolie", "brndenlde", "braendenaelde", "naelde",
  ],
};

const MIX_TEMPLATES = [
  {
    key: "all-season-pollinators",
    title: "Bestøver-bånd hele sæsonen",
    bestFor: "vilde bier, humlebier, sommerfugle og svirrefluer",
    buckets: ["early", "summer", "late"] as BucketKey[],
    plants: ["seljepil", "lungeurt", "blåhat", "almindelig knopurt", "timian", "kattehale", "vedbend"],
    animals: ["humlebier", "murerbier", "maskebier", "svirrefluer", "sommerfugle"],
    actions: ["vælg især enkle blomster", "plant i klumper på mindst 3-5 planter", "undgå sprøjtegift"],
  },
  {
    key: "butterfly-nursery",
    title: "Sommerfuglenes børnehave",
    bestFor: "admiral, dagpåfugleøje, kålsommerfugle, aurora og græsrandøje",
    buckets: ["host", "summer", "late"] as BucketKey[],
    plants: ["brændenælde i et hjørne", "løgkarse", "rødkløver", "almindelig knopurt", "sankthansurt", "tørst"],
    animals: ["admiral", "dagpåfugleøje", "nældens takvinge", "aurora", "citronsommerfugl"],
    actions: ["lad en plænestribe stå lang", "gem kvas eller brændestakle til overvintring", "klip først efter blomstring"],
  },
  {
    key: "kitchen-garden-helpers",
    title: "Nyttedyr omkring køkkenhaven",
    bestFor: "mariehøns, svirrefluer, snyltehvepse, løbebiller og bestøvere",
    buckets: ["umbel", "summer", "native"] as BucketKey[],
    plants: ["dild", "fennikel", "koriander", "persille i blomst", "røllike", "morgenfrue", "honningurt"],
    animals: ["mariehøns", "svirrefluer", "snyltehvepse", "løbebiller", "humlebier"],
    actions: ["lad enkelte krydderurter gå i blomst", "læg sten eller træstykker som skjul", "hold jorden dækket"],
  },
  {
    key: "berries-and-birds",
    title: "Bær, skjul og småfugle",
    bestFor: "solsorte, mejser, gråspurve, pindsvin og jordlevende insekter",
    buckets: ["berry", "late", "native"] as BucketKey[],
    plants: ["tjørn", "hyld", "røn", "ribs", "solbær", "vedbend", "kaprifolie", "solsikke"],
    animals: ["solsorte", "mejser", "gråspurve", "pindsvin", "edderkopper"],
    actions: ["lav tæt beplantning i flere højder", "lad frøstande stå vinteren over", "læg et lavt vandfad"],
  },
  {
    key: "water-edge",
    title: "Mini-vandhul og fugtig kant",
    bestFor: "frøer, tudser, guldsmede, vandinsekter og drikkende fugle",
    buckets: ["wet", "summer", "native"] as BucketKey[],
    plants: ["kattehale", "engkarse", "mjødurt", "vandmynte", "gul iris", "baldrian"],
    animals: ["frøer", "tudser", "guldsmede", "vandinsekter", "fugle"],
    actions: ["lav lav kant eller stenrampe", "brug regnvand", "undgå fisk i små vandhuller"],
  },
] as const;

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function plantName(plant: WildlifePlant) {
  return plant.custom_name || plant.name_da || plant.plant_slug || "Plante";
}

function plantHaystack(plant: WildlifePlant) {
  return normalize([plant.plant_slug, plant.custom_name, plant.name_da].filter(Boolean).join(" "));
}

function zoneHaystack(zone: WildlifeZone) {
  return normalize([zone.name, zone.type, zone.sun_exposure, zone.soil].filter(Boolean).join(" "));
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function matchesBucket(plant: WildlifePlant, bucket: BucketKey) {
  const haystack = plantHaystack(plant);
  return PLANT_BUCKETS[bucket].some((needle) => haystack.includes(normalize(needle)));
}

function matchingNames(plants: WildlifePlant[], bucket: BucketKey) {
  return unique(plants.filter((plant) => matchesBucket(plant, bucket)).map(plantName));
}

function zoneHas(zone: WildlifeZone, needles: string[]) {
  const haystack = zoneHaystack(zone);
  return needles.some((needle) => haystack.includes(normalize(needle)));
}

function likelihood(score: number): WildlifeResident["likelihood"] {
  if (score >= 3) return "høj";
  if (score >= 1) return "middel";
  return "lav";
}

function detail(names: string[], fallback: string) {
  if (names.length === 0) return fallback;
  return names.slice(0, 3).join(", ");
}

function hasAny(plants: WildlifePlant[], bucket: BucketKey) {
  return plants.some((plant) => matchesBucket(plant, bucket));
}

export function buildWildlifeProfile(zones: WildlifeZone[], plantsByZone: Record<string, WildlifePlant[]>): WildlifeProfile {
  const plants = Object.values(plantsByZone).flat();
  const presentPlantNames = unique(plants.map(plantName));
  const early = matchingNames(plants, "early");
  const summer = matchingNames(plants, "summer");
  const late = matchingNames(plants, "late");
  const host = matchingNames(plants, "host");
  const umbel = matchingNames(plants, "umbel");
  const berry = matchingNames(plants, "berry");
  const wetPlants = matchingNames(plants, "wet");
  const native = matchingNames(plants, "native");

  const hasPond = zones.some((zone) => zone.type === "pond" || zoneHas(zone, ["dam", "vandhul", "vand", "so", "sø", "regnbed", "fugt"]));
  const hasLawn = zones.some((zone) => zone.type === "lawn" || zoneHas(zone, ["plaene", "plne", "graes", "græs"]));
  const hasTreeOrShrub = zones.some((zone) => zone.type === "tree" || zoneHas(zone, ["trae", "træ", "busk", "haek", "hæk", "frugt", "lund"]));
  const hasKitchenZone = zones.some((zone) => zoneHas(zone, ["kokken", "køkken", "grontsag", "grøntsag", "tomat", "drivhus"]) || zone.type === "greenhouse");
  const hasSunnySand = zones.some((zone) => zone.sun_exposure === "sun" && zone.soil === "sand");
  const distinctPlantCount = new Set(plants.map((plant) => plant.plant_slug || plant.name_da || plant.custom_name).filter(Boolean)).size;

  const checks: WildlifeCheck[] = [
    { key: "early", label: "Tidlig nektar", met: early.length > 0, detail: detail(early, "mangler marts-april blomster") },
    { key: "summer", label: "Sommerblomstring", met: summer.length > 0, detail: detail(summer, "mangler stærke sommerblomster") },
    { key: "late", label: "Sen føde", met: late.length > 0, detail: detail(late, "mangler august-oktober blomster") },
    { key: "host", label: "Værtsplanter", met: host.length > 0 || hasLawn, detail: detail(host, hasLawn ? "lang plæne kan bære larver" : "mangler larveplanter") },
    { key: "structure", label: "Skjul i højder", met: hasTreeOrShrub || hasLawn, detail: hasTreeOrShrub ? "træer/buske giver skjul" : hasLawn ? "plæne kan få lang stribe" : "tilføj hæk, buske eller kvas" },
    { key: "water", label: "Vand", met: hasPond, detail: hasPond ? "vandzone registreret" : "mangler vandfad eller mini-vandhul" },
  ];

  let score = 18;
  if (plants.length > 0) score += 8;
  if (distinctPlantCount >= 6) score += 8;
  if (distinctPlantCount >= 12) score += 6;
  if (early.length) score += 11;
  if (summer.length) score += 11;
  if (late.length) score += 11;
  if (host.length || hasLawn) score += 10;
  if (umbel.length || hasKitchenZone) score += 6;
  if (berry.length || hasTreeOrShrub) score += 7;
  if (hasPond || wetPlants.length) score += 8;
  if (native.length) score += 5;
  score = Math.max(8, Math.min(100, score));

  const likelyResidents: WildlifeResident[] = [
    {
      key: "wild-bees",
      name: "Vilde bier og humlebier",
      kind: "bestøvere",
      likelihood: likelihood([early, summer, late].filter((list) => list.length > 0).length + (hasSunnySand ? 1 : 0)),
      why: early.length || summer.length || late.length
        ? `Der er føde i haven via ${detail([...early, ...summer, ...late], "blomstrende planter")}.`
        : "De kommer først stabilt, når der er blomster fra forår til sensommer.",
      wants: ["åbne blomster i flere sæsoner", "solrige uforstyrrede hjørner", "bar sandet jord eller tørt bihotel"],
      plants: ["seljepil", "blåklokke", "timian", "lavendel", "rødkløver", "vedbend"],
    },
    {
      key: "butterflies",
      name: "Sommerfugle",
      kind: "nektar og larver",
      likelihood: likelihood((summer.length ? 1 : 0) + (late.length ? 1 : 0) + (host.length ? 2 : 0) + (hasLawn ? 1 : 0)),
      why: host.length
        ? `Larverne får værtsplanter som ${detail(host, "værtsplanter")}, og de voksne kan søge nektar.`
        : "Nektarplanter hjælper voksne sommerfugle, men flere værtsplanter vil gøre haven til et ynglested.",
      wants: ["nektar i sol", "værtsplanter til larver", "langt græs eller kvas til overvintring"],
      plants: ["brændenælde", "løgkarse", "almindelig knopurt", "blåhat", "rødkløver", "sankthansurt"],
    },
    {
      key: "beneficial-insects",
      name: "Svirrefluer, mariehøns og snyltehvepse",
      kind: "nyttedyr mod skadedyr",
      likelihood: likelihood((umbel.length ? 2 : 0) + (hasKitchenZone ? 1 : 0) + (summer.length ? 1 : 0)),
      why: umbel.length
        ? `Små åbne blomster som ${detail(umbel, "krydderurter i blomst")} giver nektar til nyttedyr.`
        : "De trives bedst, når køkkenhaven har små blomster fra skærmplanter og urter.",
      wants: ["urter der får lov at blomstre", "skjul i jorddække", "ingen rutinemæssig sprøjtning"],
      plants: ["dild", "fennikel", "persille", "koriander", "røllike", "morgenfrue"],
    },
    {
      key: "birds",
      name: "Småfugle",
      kind: "frø, bær og insektjagt",
      likelihood: likelihood((berry.length ? 2 : 0) + (hasTreeOrShrub ? 1 : 0) + (hasLawn ? 1 : 0)),
      why: berry.length
        ? `Bær/frø som ${detail(berry, "bærbuske og frøstande")} giver mad og insektliv.`
        : "Buske, bær og frøstande vil gøre haven mere interessant for fugle.",
      wants: ["tætte buske", "bær og frøstande", "vand til bad og drikke"],
      plants: ["tjørn", "hyld", "røn", "solbær", "ribs", "vedbend", "solsikke"],
    },
    {
      key: "hedgehogs-ground",
      name: "Pindsvin og jordlevende nyttedyr",
      kind: "skjul og fødekæde",
      likelihood: likelihood((hasLawn ? 1 : 0) + (hasTreeOrShrub ? 1 : 0) + (zones.length >= 3 ? 1 : 0)),
      why: "De følger især efter skjul, blade, kvas og et rigt insektliv tæt på jorden.",
      wants: ["kvasbunke eller bladhjørne", "passage under hegn", "rolig jord og mørke om natten"],
      plants: ["hjemmehørende hæk", "skovjordbær", "vedbend", "rødkløver", "bunddække"],
    },
    {
      key: "water-life",
      name: "Frøer, tudser og guldsmede",
      kind: "vand og fugtig kant",
      likelihood: likelihood((hasPond ? 3 : 0) + (wetPlants.length ? 1 : 0)),
      why: hasPond
        ? "En vandzone kan hurtigt blive drikkeplads og ynglested, især med planter i kanten."
        : "De kræver normalt vand i nærheden, så et lille regnvands-vandhul er det store spring.",
      wants: ["lav kant eller rampe", "fugtige kantplanter", "ingen fisk i små vandhuller"],
      plants: ["kattehale", "engkarse", "mjødurt", "vandmynte", "gul iris"],
    },
  ];

  const gaps: WildlifeGap[] = [
    !early.length && {
      key: "early",
      title: "Tilføj tidlig mad",
      priority: "høj" as const,
      reason: "De første humlebidronninger og tidlige sommerfugle mangler energi i marts-april.",
      plants: ["seljepil", "lungeurt", "krokus", "engkarse", "løgkarse"],
      actions: ["plant tæt på solrige læsteder", "vælg enkle blomster frem for fyldte sorter"],
    },
    !late.length && {
      key: "late",
      title: "Luk sensommer-hullet",
      priority: "høj" as const,
      reason: "Sen blomstring holder bier, svirrefluer og sommerfugle i haven, når mange bede er færdige.",
      plants: ["vedbend", "hjortetrøst", "sankthansurt", "djævelsbid", "kattehale"],
      actions: ["lad visne frøstande stå vinteren over", "deadhead kun noget af bedet"],
    },
    !host.length && !hasLawn && {
      key: "host",
      title: "Giv larverne værtsplanter",
      priority: "høj" as const,
      reason: "Nektar lokker voksne sommerfugle, men værtsplanter gør at de kan yngle.",
      plants: ["brændenælde", "løgkarse", "rødkløver", "kællingetand", "tørst"],
      actions: ["læg værtsplanter i et roligt hjørne", "klip ikke hele området på én gang"],
    },
    !hasPond && {
      key: "water",
      title: "Lav et sikkert vandpunkt",
      priority: "middel" as const,
      reason: "Vand løfter både fugle, insekter, padder og tørre perioder.",
      plants: ["kattehale", "vandmynte", "engkarse", "mjødurt"],
      actions: ["sæt et lavt vandfad med sten", "eller grav en balje ned som mini-vandhul"],
    },
    !berry.length && !hasTreeOrShrub && {
      key: "birds",
      title: "Byg mad og skjul i højden",
      priority: "middel" as const,
      reason: "Fugle og mange insekter har brug for tæt struktur, bær og frø.",
      plants: ["tjørn", "hyld", "røn", "ribs", "solbær", "vedbend"],
      actions: ["plant i flere lag: bunddække, busk og klatrer", "lad enkelte frøstande stå"],
    },
    !hasSunnySand && {
      key: "nesting",
      title: "Skab redeplads til jordbier",
      priority: "middel" as const,
      reason: "Mange vilde bier bruger tør, bar jord mere end et dekorativt bihotel.",
      plants: ["timian", "blåklokke", "røllike", "lavendel"],
      actions: ["lav en solrig plet med bar sandet jord", "hold den fri for tæt bunddække"],
    },
  ].filter(Boolean) as WildlifeGap[];

  const mixes = MIX_TEMPLATES.map((mix) => {
    const bucketHits = mix.buckets.filter((bucket) => hasAny(plants, bucket)).length;
    const habitatHits = [
      mix.key === "water-edge" && (hasPond || wetPlants.length > 0),
      mix.key === "butterfly-nursery" && hasLawn,
      mix.key === "berries-and-birds" && hasTreeOrShrub,
      mix.key === "kitchen-garden-helpers" && hasKitchenZone,
    ].filter(Boolean).length;
    const mixScore = Math.min(100, Math.round(((bucketHits + habitatHits) / (mix.buckets.length + 1)) * 100));
    return { ...mix, score: mixScore };
  }).sort((a, b) => b.score - a.score);

  const zonePlans = zones.map((zone) => buildZonePlan(zone, plantsByZone[zone.id] ?? [], {
    hasPond,
  }));

  const label = score >= 76 ? "Stærkt dyrelivspotentiale" : score >= 52 ? "Godt fundament" : "Klar til at blive vildere";
  const explanation = plants.length
    ? `Baseret på ${presentPlantNames.length} registrerede plante${presentPlantNames.length === 1 ? "" : "r"} og ${zones.length} zone${zones.length === 1 ? "" : "r"}.`
    : "Tilføj planter i dine bede for at få en mere præcis dyrelivsprofil.";

  return {
    score,
    label,
    explanation,
    checks,
    likelyResidents,
    gaps,
    mixes: mixes as unknown as WildlifeMix[],
    zonePlans,
    presentPlantNames,
  };
}

function buildZonePlan(
  zone: WildlifeZone,
  plants: WildlifePlant[],
  context: { hasPond: boolean },
): WildlifeZonePlan {
  const early = matchingNames(plants, "early");
  const summer = matchingNames(plants, "summer");
  const late = matchingNames(plants, "late");
  const host = matchingNames(plants, "host");
  const umbel = matchingNames(plants, "umbel");
  const berry = matchingNames(plants, "berry");
  const wet = matchingNames(plants, "wet");
  const type = zone.type ?? "bed";

  const strengths = [
    early.length > 0 && `tidlig føde: ${detail(early, "")}`,
    summer.length > 0 && `sommernektar: ${detail(summer, "")}`,
    late.length > 0 && `sen blomstring: ${detail(late, "")}`,
    host.length > 0 && `værtsplanter: ${detail(host, "")}`,
    umbel.length > 0 && `nyttedyrsmad: ${detail(umbel, "")}`,
    berry.length > 0 && `bær/frø: ${detail(berry, "")}`,
    wet.length > 0 && `fugtplanter: ${detail(wet, "")}`,
    type === "lawn" && "plæne kan blive mini-eng",
    type === "tree" && "træzone giver højde og skjul",
    type === "greenhouse" && "drivhus kan bruge nyttedyr i kanten",
  ].filter(Boolean) as string[];

  const residents = unique([
    (early.length || summer.length || late.length) ? "vilde bier og humlebier" : "",
    (summer.length || late.length || host.length || type === "lawn") ? "sommerfugle" : "",
    (umbel.length || type === "greenhouse" || zoneHas(zone, ["kokken", "køkken", "grontsag", "grøntsag"])) ? "svirrefluer og mariehøns" : "",
    (berry.length || type === "tree") ? "småfugle" : "",
    (type === "lawn" || type === "bed") ? "jordbiller og regnorme" : "",
    (type === "pond" || wet.length || zoneHas(zone, ["vand", "dam", "regnbed"])) ? "frøer, tudser og guldsmede" : "",
  ]);

  const plantSuggestions = zonePlantSuggestions(zone, { early, summer, late, host, umbel, berry, wet });
  const habitatMoves = unique([
    zone.sun_exposure === "sun" && zone.soil === "sand" ? "lad en håndflade-stor bar sandplet være redeplads" : "",
    type === "lawn" ? "slå kun en sti og lad en stribe stå til sensommer" : "",
    type === "tree" || zone.sun_exposure === "shade" ? "lad lidt blade og kviste ligge under buske/træer" : "",
    type === "greenhouse" ? "lad dild, koriander eller persille blomstre lige udenfor døren" : "",
    type === "terrace" ? "brug krukker med timian, lavendel, blåhat og vandfad med sten" : "",
    !context.hasPond ? "tilføj et lavt vandfad med sten som landingsplads" : "",
    "undgå sprøjtegift i zonen",
  ]);

  const summary = strengths.length > 0
    ? `${zone.name} har især værdi for ${residents.slice(0, 3).join(", ") || "små nyttedyr"}.`
    : `${zone.name} kan blive stærkere for dyreliv med blomster, skjul og vand.`;

  return {
    zoneId: zone.id,
    zoneName: zone.name,
    summary,
    residents,
    strengths: strengths.length ? strengths : ["ingen stærke dyrelivssignaler registreret endnu"],
    plantSuggestions,
    habitatMoves,
  };
}

function zonePlantSuggestions(
  zone: WildlifeZone,
  current: Record<"early" | "summer" | "late" | "host" | "umbel" | "berry" | "wet", string[]>,
) {
  const suggestions: string[] = [];
  const type = zone.type ?? "bed";
  if (type === "pond" || zoneHas(zone, ["vand", "dam", "regnbed", "fugt"])) {
    suggestions.push("kattehale", "engkarse", "mjødurt", "vandmynte");
  } else if (type === "lawn") {
    suggestions.push("rødkløver", "kællingetand", "blåhat", "almindelig knopurt");
  } else if (type === "tree" || zone.sun_exposure === "shade") {
    suggestions.push("lungeurt", "døvnælde", "vedbend", "skovjordbær", "løgkarse");
  } else if (type === "greenhouse") {
    suggestions.push("dild", "fennikel", "koriander", "morgenfrue", "tagetes");
  } else if (type === "terrace") {
    suggestions.push("timian", "lavendel", "purløg", "blåhat", "sankthansurt");
  } else {
    suggestions.push("seljepil eller lungeurt", "timian", "blåhat", "almindelig knopurt", "røllike", "sankthansurt");
  }

  if (!current.early.length) suggestions.push("tidlig krokus eller engkarse");
  if (!current.late.length) suggestions.push("vedbend eller hjortetrøst");
  if (!current.host.length) suggestions.push("et lille hjørne med brændenælde eller løgkarse");
  return unique(suggestions).slice(0, 7);
}
