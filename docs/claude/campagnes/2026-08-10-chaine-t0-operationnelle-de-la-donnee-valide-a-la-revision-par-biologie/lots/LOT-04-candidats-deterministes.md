---
id: "LOT-04"
titre: "Candidats d'intervention déterministes — chaîne C1 rebranchée"
statut: "en_cours"
dépend_de: "LOT-02"
---

# LOT-04 — Candidats d'intervention déterministes

## But

Rebrancher la chaîne C1 : après confirmation T0, le cockpit propose des
priorités candidates justifiées par claims au lieu d'une décision éternellement
« suspendue » ; la plainte patient devient visible et pesée.

## Résultat observable

Sur la fixture : ≥ 2 candidats produits (chacun avec claims), la plainte
dominante affichée en tête du cockpit ; l'abstention est évaluée explicitement
(`required` motivé ou `not_required`) ; une decision card fabriquée côté client
est rejetée (recalcul serveur). La sélection reste un geste praticien.

## Périmètre

- Producteur de `ClinicalRuleRef` **validées** : table de règles de priorité
  (patron orientation — claims, signature, SHA) reliant besoins dégradés +
  plainte patient + contradictions ouvertes (LOT-01) + drapeaux d'anamnèse →
  `DecisionPriorityCandidate` (`origin: 'engine'`).
- Évaluation de l'abstention : signaux d'alerte actifs ⇒ `required` motivé ;
  sinon `not_required` motivé — plus jamais `not_evaluated` après T0.
- Canal plainte/priorité patient : `Q_PLAINTES` + `patientContext.priorityGoal`
  entrent dans le classement et l'affichage (jamais écrasés par l'agrégat).
- Intégrité : recalcul serveur de snapshot → review → decisionCard dans
  `POST /api/praticien/protocoles/versions` (rejet 409 si les hashes soumis ne
  correspondent pas au recalcul).

## Hors périmètre

- Le contenu du protocole (LOT-05).
- Toute sélection automatique : `selectedBy: 'practitioner'` reste obligatoire.
- Hypothèses persistées (backlog).

## Fichiers probables

`web/src/app/api/praticien/cockpit/route.ts:188-215`,
`web/src/lib/clinical-engine/clinicalReview.ts`, `decisionCard.ts`,
`clinicalSnapshot.ts`, `runtimeFromPrisma.ts:83-92`,
nouveau `web/src/lib/clinical/priorityRulesV1.ts`,
`web/src/app/api/praticien/protocoles/versions/route.ts:54-150`,
`web/src/components/patient-cockpit/ClinicalRuntimeSection.tsx`,
`web/src/lib/plaintes.ts`.

## Interdits

- Aucun candidat produit par le LLM ; aucun candidat sans claim.
- Une règle candidate (`lifecycle: 'candidate'`) ne produit ni constat ni
  priorité (garde existante à préserver).
- Ne pas toucher aux cinq points de blocage praticien existants.

## Dépendances

LOT-02 (T0 gaté) ; LOT-01 (contradictions comme entrée) ; LOT-03 souhaitable
(un axe éteint ne produit pas de candidat).

## Étapes

1. Table de règles de priorité + producteur + tests unitaires.
2. Évaluation d'abstention explicite + motifs.
3. Canal plainte (lecture de `patientContext` et `Q_PLAINTES`, affichage tête
   de cockpit).
4. Recalcul serveur + rejet des cartes non conformes.

## Tests

- Fixture : candidats digestif + pondéral/métabolique produits, stress au mieux
  mineur si C-STR ouvert ; plainte en tête.
- Test d'intrusion : decision card fabriquée (abstention `not_required` forgée)
  ⇒ 409.
- Plus aucun `not_evaluated` après confirmation T0 (test d'intégration cockpit).
- T2 avant commit.

## Done

- Critères 1-3 du Lot D de `sources/02-spec-lots-parcours-t0.md`.
- Fragment `changelog.d/`.
