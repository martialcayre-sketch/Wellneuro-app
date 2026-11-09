### Revue des PR : Copilot en second recours, entre CodeRabbit et PR-Agent, selon son quota (D-468, 2026-11-09)

Demande du responsable du 2026-11-09 ; amende D-393 §1. Gouvernance des PR seulement : aucun code applicatif,
aucune règle clinique, aucune migration.

- Ordre des revues exigées sur la tête : CodeRabbit ; s'il saute la PR ou bute sur son quota, Copilot, demandé
  par la session si son quota est présumé disponible ; sinon PR-Agent (D-393 §2) ; à défaut, `wn-reviewer`
  (D-448).
- Quota présumé disponible tant qu'aucune revue de Copilot ne dit « insufficient remaining quota » depuis le
  1er du mois (UTC). Un refus vaut « épuisé » jusqu'au mois suivant.
- Lecteur neuf `scripts/wn-revue-copilot.mjs` : `--quota` (quota présumé) et `<N>` (revue de Copilot sur la
  tête, refus exclus), codes `0` oui, `1` non, `2` lecture impossible ; banc `scripts/wn-revue-copilot.test.mjs`,
  ajouté à `bancs-outillage-check`.
- Après un push : redemande sur la nouvelle tête si le quota est encore présumé, sinon PR-Agent. Revue absente
  dix minutes après la demande : PR-Agent.
- Pas de revue systématique : la revue automatique de Copilot à l'ouverture est coupée par le responsable,
  dans les réglages de son compte GitHub.
- Textes mis à jour : `CLAUDE.md`, `REGLES_PR_MERGE.md`, `POLITIQUE_REVUE.md`, règle 1.6 de
  `pr-revue-et-release-db.md`, skill `wn-merge` (étape 6), ligne datée sous D-393 §1, journal de H93.
