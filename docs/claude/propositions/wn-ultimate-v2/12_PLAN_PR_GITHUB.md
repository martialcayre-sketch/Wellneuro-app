---
id: "wellneuro-plan-pr-v2"
version: "2.0"
date_source_declaree: "2026-07-14"
integre_le: "2026-07-13"
statut_integration: "proposition_non_executable_a_valider"
---

# Plan de PR GitHub

Une tâche, une branche courte, une PR.

> L'ordre ci-dessous s'applique à la promotion canonique. La branche
> `docs/wn-ultimate-v2-reconciliation` ne fait qu'intégrer les propositions
> en quarantaine avant la série 0 technique.

## Série 0 — orchestration

### PR 0.1

`fix/wn-campaign-explicit-activation`

- lecture ACTIVE_CAMPAIGN ;
- `_prepared` ;
- activate/deactivate ;
- statuts ;
- tests.

### PR 0.2

`feat/wn-context-clinical-gates`

- context pack ;
- gates ;
- campagnes préparées.

## Série 1 — documentation

### PR 1.1

`docs/clinical-engine-canonical-v2`

- source maître ;
- cartographie ;
- contrats ;
- intégration outils.

### PR 1.2

`docs/food-diary-compass-v2`

- journal ;
- Boussole ;
- corrections du prototype.

### PR 1.3

`docs/clinical-corpus-c1b-v2`

- corpus ;
- manifeste ;
- C1B sous `_prepared`.

### PR 1.4

`docs/roadmap-campaigns-v3-2`

- programme ;
- frontières ;
- campagnes ;
- plan PR.

## Série 2 — terminer HC-F

- LOT-05.

LOT-04 est déjà terminé dans la base d'intégration du 2026-07-13.

## Série 3 — C1 noyau

1. `feat/clinical-contracts`;
2. `feat/equilibrium-snapshot-adapter`;
3. `feat/questionnaire-finding-adapter`;
4. `feat/clinical-snapshot-builder`;
5. `feat/clinical-signals-missing-discordance`;
6. `feat/clinical-safety-blockers`;
7. `feat/decision-card`;
8. `feat/protocol-draft`;
9. `feat/clinical-cockpit`;
10. `feat/patient-decision-preview`;
11. `test/clinical-engine-replay`.

## Série 4 — parallèles

- `feat/food-diary-domain-v2` sans DB ;
- `feat/corpus-registry-readonly` ;
- `feat/supplement-catalog-core` ;
- `feat/food-profile-core` ;
- QX pilotes.

## Série 5 — C3

- contrats documents ;
- composition ;
- booklet ;
- audiences.

## Série 6 — migrations explicites

Après approbation :

- AssessmentEpisode ;
- protocole actif ;
- check-ins ;
- journal ;
- corpus runtime éventuel.

Aucune PR de migration ne mélange UI ou règles cliniques.
