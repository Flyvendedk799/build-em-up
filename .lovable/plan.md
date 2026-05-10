# Vandingsplan 2.0 — planter, intelligens og kontrol

I dag kan man oprette bede, men ikke tilføje planter, og siden mangler dybde: ingen planteinventar, ingen vandingshistorik pr. bed, ingen mulighed for at justere AI-anbefalingen, og ingen rigtig "gør det nu"-følelse. Denne plan løfter siden fra et statisk skema til et levende havestyringscenter.

## 1. Planter i bede (kerne-mangel i dag)

**Plantekort på hvert bed** under header:
- Chip-række med 🌿 ikon, navn, antal: "Tomat ×3 · Rose ×2 · Salat …"
- Klik chip → popover med plantebillede, vandbehov, sol-krav, fjern-knap
- Tom-tilstand: stor "+ Tilføj planter" CTA

**`AddPlantsDialog`** (ny):
- Søgefelt over `plants_catalog` med live-filter (name_da, latin, kategori)
- Resultater grupperet efter kategori (Grønt, Blomster, Krydderurter, Træer, Bær)
- Hver række viser navn, vandbehov-ikon (low/med/high), sol, antal-stepper
- Kan vælge flere på én gang → "Tilføj 5 planter"
- Fallback: "+ Tilføj egen plante" med frit navn → gemmes som `custom_name`
- Smart-forslag: viser top 6 planter der passer til bedet's `sun_exposure` + `soil`

## 2. Bedet som rigtigt produkt

**Udvidet bed-kort:**
- Plante-thumbnails (4 første som små billeder), resten som "+5"
- Vandbehov-summering: "Højt vandbehov" hvis flere planter er high → AI får mere vægt
- Helbredsindikator: rød prik hvis nogen plante har åbne `ai_recommendations`

**Bed-detaljedrawer** (klik på bed-navn):
- Fuld plante-liste med plantedato, noter
- Vandingshistorik kun for dette bed (mini-graf, sidste 30 dage)
- "Skift sol/jord" inline-edit
- "Dupliker bed" og "Flyt planter til andet bed"

## 3. Manuel "Vand nu" der virker

I dag logger "Vand nu" bare 5 mm. Erstat med:
- **Quick-vand-dialog**: vælg minutter (5/10/15/20/custom), viser estimerede liter live
- Vis hvilke planter der vandes
- Efter vanding: toast med "Næste anbefalede vanding: tirsdag" baseret på fugt
- Fortrydknap (5 sek) — sletter event hvis tryk på fortryd

## 4. Smartere AI-plan

- **Forklaring**: hvert AI-forslag har "Hvorfor?" knap → viser regnvarsel, plantebehov, jordtype
- **Lås zoner**: "Behold min nuværende plan for køkkenhaven" checkbox før generering
- **AI-historik**: gem sidste 3 planer med dato → "Gå tilbage til plan fra 3. maj"
- **Sammenligning**: før-anvend dialog viser "før → efter" pr. bed (mm/uge, antal vandinger)
- **Force-refresh** med ny vejrudsigt (knap "Opdater med dagens vejr")

## 5. Opgaver og påmindelser

Brug eksisterende `task_log` tabel til vandingsrelaterede opgaver:
- Auto-skab opgave når plante tilføjes ("Plant Tomat i Køkkenhaven inden 7 dage")
- "Tjek fugt manuelt" opgave hvis bed ikke har sensor
- Hak af direkte fra bed-kortet
- Notifikations-bell-integration (`notifications` tabel) ved regn-varsel om morgenen

## 6. Vejr-overlay forbedringer

- Klik en dag i 7-dages strip → highlight hvilke bede der vandes/skippes den dag
- Hover → tooltip med temp/regn/vind-detaljer
- "Vejr-effekt"-badge på bed: "−12 L sparet i denne uge pga. regn"
- Time-by-time popover for i dag (regn de næste 24 timer som mini-graf)

## 7. Forbrug og indsigt

**Ny "Indsigt"-fane** (4. tab ved siden af Bede/Kalender/Sæson):
- Total liter sidste 7/30/365 dage
- Sparet pga. regn (sammenligning mod fast skema)
- Top-5 mest vandintensive bede (bar chart)
- CO₂/kr.-estimat (~5 kr/m³ vand i DK)
- Eksport CSV af alle vandinger

## 8. Polish og kvalitet-of-life

- **Drag-to-reorder** bede (gem `sort` i metadata-felt eller nyt kolonne)
- **Bulk-handling**: "Pause alle bede i 3 dage" mens man er på ferie
- **Profil pr. årstid**: forår/sommer/efterår presets pr. bed (gemt i `garden_zones.microclimate`)
- **Tastaturgenveje**: `n` = nyt bed, `a` = AI-plan, `w` = vand nu på fokuseret bed
- **Tom-tilstand på siden**: bedre onboarding-illustration når ingen bede
- **Mobile**: bed-kort kollapser til accordion, sticky "Vand nu"-FAB

## 9. Performance

- Parallel-load `gardens`, `zones`, `schedules`, `events`, `user_plants` i én Promise.all
- Cache `plants_catalog` i React Query (sjælden ændring)
- Virtualiser plantesøgning hvis kataloget vokser

---

## Tekniske detaljer

**Filer der oprettes:**
- `src/components/watering/AddPlantsDialog.tsx`
- `src/components/watering/PlantChips.tsx`
- `src/components/watering/BedDetailDrawer.tsx`
- `src/components/watering/QuickWaterDialog.tsx`
- `src/components/watering/InsightsTab.tsx`
- `src/components/watering/AiPlanHistory.tsx`

**Filer der ændres:**
- `src/pages/WateringPlan.tsx` — parallel load, ny tab, plant-state, integrationer
- `src/components/watering/AiPlanPreview.tsx` — "hvorfor"-forklaringer, sammenligning
- `src/lib/wateringAI.ts` — udvid `decide()` med plante-vægtning

**Database:** Ingen migrations nødvendige — alle nødvendige tabeller findes (`user_plants`, `plants_catalog`, `task_log`, `notifications`, `watering_runs`, `ai_recommendations`).

**Ude af scope (senere):**
- Rigtig sensor-integration (devices-tabellen er klar, men kræver hardware-flow)
- Foto-dagbog pr. bed
- Deling af plan med samboer

---

Vil du have det hele, eller skal vi starte med fase 1+2+3 (planter, bedkort, vand-nu)?
