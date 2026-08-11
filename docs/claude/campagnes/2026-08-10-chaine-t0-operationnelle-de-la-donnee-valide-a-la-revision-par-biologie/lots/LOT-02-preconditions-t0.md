---
id: "LOT-02"
titre: "Préconditions de confirmation T0 — checklist dure/souple"
statut: "à_faire"
dépend_de: "LOT-00"
---

# LOT-02 — Préconditions de confirmation T0

## But

T0 devient un point de décision outillé : fini le T0 confirmable sur dossier
vide, sans bloquer le geste clinique (contournement justifié et tracé).

## Résultat observable

L'API refuse un T0 sans premier rideau valide, anamnèse consignée et synthèse
validée ; le panneau de confirmation affiche la checklist (conditions dures
bloquées, souples contournables avec motif obligatoire) ; la justification d'un
contournement est relisible dans le payload d'épisode persisté.

## Périmètre

- Conditions **dures** côté API (cockpit POST + les deux points de persistance) :
  premier rideau complet et `VALID` dans la fenêtre ±8 j (Q_MOD_03, Q_MOD_01,
  Q_INF_03, Q_ALI_01) ; anamnèse consignée ; synthèse `Validee_Praticien` ou
  `Corrigee_Praticien` postérieure à la dernière passation du rideau de base.
- Conditions **souples** (avertissement + motif obligatoire, tracé dans le
  payload) : suggestions d'orientation ni renseignées ni écartées ;
  contradictions ouvertes (LOT-01) ; passations `AMBIGUOUS` dans la fenêtre.
- `EpisodeConfirmationPanel` : checklist affichée, biologie/agendas/journal
  explicitement présentés « phase 1 — non requis pour T0 ».

## Hors périmètre

- Correction ou ré-ouverture d'un T0 confirmé (backlog multi-cycle).
- UI des jalons J21/J42/J90 (LOT-07).
- Toute migration (le payload d'épisode est un JSON existant).

## Fichiers probables

`web/src/app/api/praticien/cockpit/route.ts:147-215`,
`web/src/app/api/praticien/protocoles/route.ts:79-171`,
`web/src/app/api/praticien/protocoles/versions/route.ts:101-310`,
`web/src/components/patient-cockpit/EpisodeConfirmationPanel.tsx`,
`web/src/lib/clinical-engine/assessmentEpisode.ts`,
`web/src/lib/protocol/versioning.ts:116-132`.

## Interdits

- Aucun contrôle purement client : chaque condition dure est vérifiée par l'API.
- Ne pas exiger biologie, agendas ou journal pour T0.
- Ne pas modifier la fenêtre ±8 j ni les jalons.

## Dépendances

LOT-00 (notion de passation `VALID`). LOT-01 souhaitable pour la condition
souple « contradictions ouvertes » (dégradable si LOT-01 non livré : condition
absente, pas de stub).

## Étapes

1. Module de préconditions pur (entrées : réponses + statuts + synthèses) +
   tests unitaires.
2. Branchement API (409/422 explicites en français).
3. Checklist UI + saisie du motif de contournement.
4. Trace du contournement dans le payload (contrat d'épisode étendu, version de
   contrat bumpée si nécessaire).

## Tests

- T0 refusé sans rideau valide (test API, pas seulement UI).
- Contournement souple sans motif ⇒ refus ; avec motif ⇒ payload le porte.
- Le parcours de la fixture (rideau complet + synthèse validée) passe sans
  friction.
- T2 avant commit.

## Done

- Critères 1-3 du Lot C de `sources/02-spec-lots-parcours-t0.md`.
- Fragment `changelog.d/`.
