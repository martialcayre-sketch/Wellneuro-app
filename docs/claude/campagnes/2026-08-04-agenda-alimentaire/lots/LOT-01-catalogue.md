---
id: "LOT-01"
titre: "Catalogue : Q_ALI_09 assignable, sans score"
statut: "livré"
dépend_de: "LOT-00"
---

# LOT-01 — Catalogue : Q_ALI_09 assignable, sans score

Anciennement « L1-bis » dans la série agenda alimentaire (PR #554).

Statut : livré. Rend `Q_ALI_09` assignable, et rien d'autre — pas de table,
pas de route, pas de saisie.

## Livré

- `Q_ALI_09` entre au catalogue avec `sections: []` et un scoring `journal`
  (`scored: false`), derrière le drapeau `WN_AGENDA_ALI`, **éteint par
  défaut**.
- Aucun barème posé : aucune journée n'a jamais été recueillie, un barème
  avant la première passation serait une donnée clinique inventée. Ordre
  retenu : collecte puis calibrage.
- N'alimente pas le besoin 3 (« Rythme alimentaire »), déjà sourcé par
  `RYTHME_CHRONO` de `Q_ALI_01` — éviter une double mesure du même thème.
  `BESOIN_SOURCES` et `VERSION_SCORE_EQUILIBRE` inchangés.
- `IDS_SUSPENDUS` dérive du champ `actif` du catalogue : éteindre le drapeau
  ferme d'un seul geste la route d'assignation et la bibliothèque praticien.
- `api/patient/submit` refuse `Q_ALI_09` en 409 (comme `Q_SOM_09`) : avec
  `sections: []`, une soumission par l'écran générique verrouillerait un
  agenda à zéro journée, irrécupérable.

## Constats majeurs

- Revue adversariale sur le commit initial : trois défauts corrigés, dont un
  bloquant — `droits.statut` valait `libre` (« construction WellNeuro sans
  source tierce ») quatre lignes au-dessus de « aucun rapprochement n'a été
  instruit », deux affirmations contradictoires ; passé à `a_verifier`. Le
  garde de drapeau ne testait pas l'état de production (variable absente
  simulée par une chaîne vide plutôt que `undefined`) ; corrigé. Les textes
  patient décrivaient une surface inexistante (frise, transmission au
  praticien) ; ramenés à ce qui existe.
- Conséquence tenue : allumer `WN_AGENDA_ALI` exige la livraison préalable de
  la surface de saisie (LOT-04) — drapeau allumé aujourd'hui, un patient
  recevrait une assignation dont l'écran générique n'affiche aucune question.
- Point mineur laissé ouvert : `normaliserQids` (`api/praticien/packs/route.ts`)
  filtre sur le catalogue de scoring, pas sur `IDS_SUSPENDUS` — défaut
  antérieur au lot, non corrigé ici (hors périmètre).

## Tests et validations

- `npm run check` vert dans les deux positions de `WN_AGENDA_ALI` (3 457
  tests, 70 contrôles anti-secrets).
- `WN_AGENDA_ALI=true npm run test:siin57` vert.
- `scoring-check` vert dans les deux positions du drapeau SIIN.
- `agendaAlimentaireDrapeau.guard.test.ts` vérifié par mutation (remplacer
  l'appel par `actif: true` fait tomber 2 tests).
