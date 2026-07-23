---
id: "LOT-03"
titre: "Cartes jalon J21 / momentum"
statut: "livré"
dépend_de: "LOT-01"
---

# LOT-03 — Cartes jalon J21 / momentum

Statut : livré (PR de ce lot). Sans migration, lecture seule.

## Livré

- **Nouveau type de carte `jalon_j21`** (`cartes.ts`, `refus.ts`,
  `FilDuJour.tsx` icône `Flag`). Position dans le Fil : après signalements et
  relectures, avant les retards. `resumeFil` compte « N jalon(s) ».
- **Détection** (`lib/fil/jalonsJ21.ts`, pur) : « jalon atteint sans décision
  consignée » = DIFFÉRENCE entre deux artefacts persistés distincts (arbitrage
  A1) —
  - J21 soumis → `ProtocolCheckin` `pointEtape='J21'` ;
  - décision consignée → `AssessmentEpisode` `milestone='J21'`.
  Une décision « Continuer » ne crée aucun artefact ; se fonder sur l'épisode
  J21 (marqueur persisté le plus fiable) évite d'en inventer un. L'ancre du
  refus G1 est le check-in J21 le plus récent (une correction fait revenir la
  carte — fait nouveau, nouvelle décision).
- **Momentum** (`lib/fil/momentumJ21.ts`) : enrichissement FACTUEL et optionnel
  via `construireTrajectoire` (T0 → dernier jalon mesuré), borné aux
  patients-jalon (2 requêtes, pas de N+1). Souvent indisponible — le check-in
  J21 de pilotage et la re-mesure d'équilibre à J21 sont distincts (A1) : dans
  ce cas la carte n'affiche RIEN, jamais un 0 (A8-2).
- **« Pourquoi maintenant »** 100 % sourcé : date du check-in J21 + action
  principale observée (si le check-in est lisible) + momentum (si mesuré).
- **Route Fil** (`api/praticien/fil/route.ts`) : 2 requêtes ajoutées au
  `Promise.all` (check-ins J21, épisodes J21), scoping praticien inchangé, puis
  enrichissement momentum bornée aux patients-jalon.

## Vérification

- Vitest : `jalonsJ21.test.ts` (différence, ancre récente, illisible ignoré,
  hors patientèle), `cartes.test.ts` (`cartesJalons`, ordre, résumé, clé),
  `route.test.ts` (jalon avec/sans épisode J21, `select` id), `FilDuJour`
  (libellé « Jalon »). T1 + T2.
