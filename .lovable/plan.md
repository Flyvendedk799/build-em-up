# Havelandet → Danmarks #1 haveplatform

Set med iværksætterbriller: I dag har I 4 stærke moduler (Webshop, Havemåler, Vanding, Plantepleje AI) der lever som **øer**. De deler ikke data, har ingen fælles "habit loop", og der er ingen monetiseringsmotor ud over ad-hoc webshop-køb. Konkurrenter (Plantix, PictureThis, GroGuru, danske GreenMate) vinder på **én ting**. I kan vinde Danmark ved at være **det eneste sted** hvor måling → plan → pleje → indkøb er ét loop, krydret med dansk-specifikt indhold (DMI-vejr, kommune-affaldskalender, danske sorter, Have-Selskab-style guides).

Nedenfor: hvad der er svagt nu, og hvad der mangler for at blive nr. 1 — prioriteret efter **impact × moat**.

---

## 1. Diagnose pr. modul — det som ikke fungerer i dag

### Webshop
- Ingen **kontekstuel anbefaling** ("Du har roser i bed 3 → her er gødning til dem")
- Ingen abonnementer/refill (frø-kasser, gødning hver 3. mdr) — stort tabt LTV
- Ingen reviews, ingen UGC, ingen "købt sammen med"
- Ingen **plante-shop** — kun produkter. Et havefirma uden planter er som en boghandel uden bøger
- Ingen leveringsestimat eller fragtbeskeder

### Havemåler
- Engangsoplevelse — bruges én gang og glemmes
- Ingen **3D / højde / sol-simulation** (kun 2D polygon) → kan ikke konkurrere med iScape/Garden Planner
- Ingen "før/efter"-visning eller plantekort på kortet
- Eksporterer ikke noget (PDF, deling med landskabsarkitekt)

### Vandingsplan
- Nu OK med planter, men: **ingen rigtig hardware-integration** (Gardena, Husqvarna, Rain Bird, Hunter — alle har APIs)
- "Vand nu" er stadig en log-knap, ikke en faktisk handling
- Ingen alert-push når brugeren faktisk skal handle (kun in-app)

### Plantepleje AI
- Chat er fin, men **kontekstløs** — kender ikke brugerens have, planter, klimazone, sidste vejr
- Ingen **proaktiv** rådgivning ("Du har æbletræer → tid til at sprøjte mod skurv nu")
- Ingen billedhistorik pr. plante (sygdomsudvikling over tid)
- Ingen integration til webshop ud fra diagnose

### På tværs (det største problem)
- **Ingen daglig grund til at åbne appen.** Et havefirma skal være årstidsdrevet, ikke task-drevet
- **Ingen community / social** — ingen deling, ingen sammenligning med naboer
- **Ingen mobile-first** — alt er desktop-præget, men have-arbejde sker udenfor med en telefon
- **Ingen onboarding-flow der binder modulerne sammen** (mål have → AI foreslår planter → læg i kurv → få vandingsplan)

---

## 2. Det manglende rygsøjle-modul: **"Min Have" hub**

Dette er det vigtigste vi mangler. En `/min-have`-side som er **forsiden** efter login, og som binder alt sammen:

```text
┌─ I dag · 12. maj · 18° / let regn ──────────────┐
│  3 opgaver venter · Næste vanding kl. 06:30     │
├─ DAGENS HAVE ───────────────────────────────────┤
│ ⚠ Tomater i Bed 2 — bladmug-risiko (AI)        │
│ 💧 Spring vanding over i dag (regn 6mm)         │
│ 🌱 Tid at så græskar i drivhus (sidste frost)   │
│ 📦 "Bær-gødning" anbefales → læg i kurv         │
├─ HAVEN LIGE NU ─────────────────────────────────┤
│ [Ortofoto med plante-pins]                      │
│ 124 m² plæne · 18 planter · 4 bede             │
├─ ÅRSHJUL (sticky) ──────────────────────────────┤
│ Maj: så, plant ud, beskær syren, gødsk plæne   │
└─────────────────────────────────────────────────┘
```

Dette **alene** vil drive 3-5× retention.

---

## 3. Nye moduler / faner som mangler

### A. Plantebibliotek (`/planter`) — **moat-builder**
- Browse 500+ danske planter med filtre (sol, vand, jord, hårdfør zone, blomstringstid)
- Hver plante: pleje-kalender, danske sorter, sygdomme, companion planting
- "Tilføj til min have" → opretter automatisk i bed
- SEO-guld: hver plante = en side, der rangerer på Google

### B. Årshjul / Have-kalender (`/kalender`)
- Måned-for-måned hvad der skal gøres baseret på faktiske planter + lokal vejrhistorik
- Eksport til Google/Apple Calendar
- Push-notifikationer ("På søndag er det perfekt såvejr")
- Sammenkobling med opgavelisten

### C. Skadedyrs- og sygdomsopslag (`/diagnose`)
- Foto-upload → AI-diagnose (allerede eksisterer i Plantepleje AI, men giv det egen indgang + historik)
- Database over almindelige danske skadedyr (snegle, bladlus, tomatbladmug)
- Direkte link til behandlingsprodukter i shoppen → **konvertering**

### D. Plæne-modul (`/plaene`)
- Højdeprofil, klippe-frekvens-anbefaling
- Robotklipper-status (Husqvarna/Gardena API)
- Gødnings-kalender (NPK-plan, 4× året)
- Mos/ukrudt-diagnose via foto

### E. Drivhus & inventar (`/drivhus`)
- Hvis bruger har drivhus-zone: temperatur-log, sensorer
- Frø-inventar (hvad har jeg, hvornår udløber det)
- Sætteplan ("Du sår tomat 10. marts → planter ud 15. maj")

### F. Community / "Have-tråden" (`/feed`)
- Brugerne deler "før/efter", spørger om diagnose
- Like, kommentar, følg naboer i samme postnummer
- **Eksperter** (gartnere, havearkitekter) svarer mod betaling → marketplace

### G. Have-marketplace
- Lokale gartnere, anlægs-firmaer, robotklipper-service
- Provision pr. booking → ny indtægtskilde
- Kun verificerede DK-firmaer

### H. Onboarding-flow (kritisk)
Et 90-sekunders flow ved første login:
1. Adresse → vejrzone, jordtype, frost-datoer (DMI)
2. Mål haven (havemåler — auto)
3. AI foreslår 5 planter til din zone
4. Sæt vandingsplan automatisk
5. Få første opgaveliste

---

## 4. Forretningsmodel — fra ad-hoc til **moat**

### Indtægtskilder vi mangler
| Kilde | Potentiale | Implementering |
|---|---|---|
| **Havelandet+** abonnement (49 kr/md) | Kerne — 30%+ af LTV | AI-features, ubegrænset diagnoser, premium guides, ingen ads |
| **Frø/plante-abonnement** (sæsonkasse) | Høj retention | Forår/sommer/efterår-kasse leveret |
| **Refill-abonnement** (gødning, jord) | Recurring | Auto-shipment hver X uger |
| **Marketplace-provision** (gartnere) | Skalerbar | 10-15% pr. booking |
| **Affiliate** (planteskoler vi ikke selv leverer) | Lavt arbejde | Partnerskab Plantorama m.fl. |
| **Hardware-bundles** (sensorer, robotklipper) | Høj AOV | White-label sensor + app-pairing |

### Loyalty
- "Have-point" pr. opgave hak/køb → rabat
- Streak-system ("47 dage have-helt") — gamification

---

## 5. Dansk-specifikke moats konkurrenter ikke kan matche

1. **DMI vejr-integration** (10-dages, lokalt postnummer, frost-varsel)
2. **DAWA + matrikel** (kender din præcise grund — allerede in!)
3. **Kommune-affaldskalender** (haveaffald-uger, kompost-tilladelser)
4. **Danske plantesorter** ('Discovery' æbler, 'Ribston' osv.)
5. **Fredede arter / invasive** (Rynket Rose-advarsel, bjørneklo-rapportering til kommune)
6. **Hårdførhedszoner DK** (zone 1-4, ikke US-zoner som PictureThis bruger)
7. **Dansk på dansk** — al AI på dansk, ikke oversat
8. **Have-Selskabet-style indhold** — månedsguides, partnerskab evt.

---

## 6. UX / platform-niveau forbedringer

- **Mobile-først PWA** — installerbar, offline-kalender, kamera-direct-til-diagnose
- **Push-notifikationer** (regn-skip, tid at så, ordre afsendt)
- **Kommandopalette** (⌘K findes — udvid med actions, ikke kun navigation)
- **Delbare links** ("Se min have" → læselig offentlig side, lead-magnet)
- **Dark mode** — udendørs i sol
- **Tilgængelighed** — store touch targets, høj kontrast (mange brugere er 50+)
- **Onboarding tooltips** (Shepherd.js) første gang hver feature bruges
- **Konsolideret navigation** — i dag 4 toplinks. Bør være: Min Have · Planter · Webshop · Mere ▾

---

## 7. Vækst-motorer (det glemte)

- **SEO-fundament**: hver plante, hvert skadedyr, hver "hvordan beskærer jeg X" = en landingsside
- **Email-sekvens**: "Din have i maj" månedlig mail (genåbnings-trigger)
- **Referral**: "Inviter en have-ven, få 50 kr"
- **Indhold**: ugentlig blog/video — gartner som ansigt
- **Partnerskaber**: BoligMagasinet, Have-Selskabet, danske planteskoler
- **Lokale events**: "Havelandet-dag" hos planteskoler (offline → online)

---

## 8. Anbefalet rækkefølge (12-ugers roadmap)

**Fase 1 — Fundamentet (uge 1-3)**
1. `/min-have` hub-forside med dagens opgaver
2. Onboarding-flow der binder modulerne sammen
3. Notifikationer (push + email)
4. Mobile/PWA polish

**Fase 2 — Indhold-moat (uge 4-7)**
5. Plantebibliotek med 200 danske arter (SEO-sider)
6. Årshjul / kalender-modul
7. Skadedyrs-database
8. Hver plante kobler til webshop-produkter (gødning, redskaber)

**Fase 3 — Monetisering (uge 8-10)**
9. Havelandet+ abonnement (Stripe)
10. Frø-kasse abonnement
11. Wishlist → auto-genbestilling

**Fase 4 — Moat (uge 11-12+)**
12. Community feed
13. Marketplace-MVP (3-5 gartnere)
14. Hardware-integrationer (Gardena først)

---

## 9. Hvad jeg foreslår vi gør **i næste loop**

Ikke alt på én gang. Vælg én af disse som første konkrete sprint:

**A. "Min Have" hub-forside** — højeste retention-impact, 3-4 dages arbejde
**B. Plantebibliotek + SEO** — højeste vækst-impact, 1 uges arbejde
**C. Onboarding-flow** — højeste konvertering-impact, 2 dage
**D. Havelandet+ abonnement** — højeste revenue-impact, 3 dage

Min anbefaling som iværksætter: **A først** (forsiden er der brugeren lander efter login — uden den er resten ligegyldigt), derefter **C** (få nye brugere helt igennem), så **B** (vækstmotor), så **D** (når retention er bevist).

---

Hvilken vil du have vi tager først? Eller skal vi køre A+C i samme sprint?
