# Handoff — 2026-11-16 — F05 (BP-12a) : correction de la famille des quantités, deux questions cliniques avant la v10

## Branche et état Git

- Worktree `.claude/worktrees/b-fiche-usage-iode-selenium`, session concurrente, cycle en git/gh direct.
- Branche `f05-correction-quantites`, partie d'`origin/main` (`73d47077`, merge de #2183). #2185 (outil, budget de la contre-lecture, rang 05) est ouverte à part : ce lot prend le rang 06.

## Objectif

Corriger, par un fragment neuf, la description de la famille des quantités au rang 04, mergée par #2183 avant la correction. Préparer les deux arbitrages cliniques qui précèdent le texte de la v10.

## Décisions prises

- Aucune décision neuve. Le périmètre de la v10 (`20261116-1517-b`, trois familles) est inchangé ; la note de la question est corrigée.

## Fichiers modifiés

- `docs/claude/plan-journal/F05/2026-11-16-06-correction-famille-des-quantites.md`, ce handoff.

## Validations exécutées

- Lecture, en session et hors dépôt, des textes refusés des rangs 01 et 04 (POLY P3, P7, P8, MG P7). Aucun texte n'entre dans le dépôt.
- Incident de cycle : une correction poussée sur la branche de #2183 après son merge (`73d47077`) a recréé la branche distante. Elle a été supprimée (un seul commit, le mien, au-dessus de la tête mergée), et un rectificatif est posté sur #2183.

## Problèmes ouverts

- Deux questions cliniques au responsable, avec un avis Codex à l'aveugle (D-505) : `20261116-2115-b` (frontière des quantités : limite de sécurité exprimée en apport, mention sans valeur) et `20261116-2116-b` (recommandation portée par un claim sous « preuves limitées »).
- La v10 (D-501 §13, Codex P0, puis le texte soumis au responsable) attend ces deux arbitrages. La famille « phrase d'absence malgré un claim » n'en demande pas.
- #2185 (budget de la contre-lecture) : CI, revue, puis déclaration « prête ».
- La validation de `FU_MG_P6` n° 1 attend le responsable. D-501 §11 reste à amender : l'arbitrage du volume d'eau est rendu, et l'avis Codex est à joindre ou à justifier.

## Prochaine action exacte

Déclarer cette PR « prête @sha ». Poser les deux questions cliniques. Après leurs réponses, rédiger la v10.

## Interdits encore actifs

- Production en lecture seule, par conteneur. Un dépôt passe par la route interne, jamais par SQL.
- Aucun texte de fiche, de libellé ou de claim dans le dépôt public (D-251 §4).
- Validation et signature sont des gestes du responsable, sauf délégation D-509 explicite ; aucune n'est en cours.
- Aucune modification de la consigne v9 ni de la structure signée sans D-xxx et approbation, et rien sous `web/src/lib/clinical/`.
- Aucun rejeu sans arbitrage. Les arbitrages rendus ne se reposent pas.
- Ne jamais pousser sur la branche d'une PR sans avoir revérifié qu'elle n'est pas mergée.
