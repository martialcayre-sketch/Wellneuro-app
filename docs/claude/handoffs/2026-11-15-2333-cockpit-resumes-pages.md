# Handoff — 2026-11-15 — Cockpit : un résumé par page de suivi (lot `cockpit-resumes-pages`)

## Branche et état du dépôt

- Branche `docs/cockpit-resumes-pages`, créée depuis `origin/main` après le merge de #2159 (`007e18a0`), dans le worktree `.claude/worktrees/orch-ci` (session Orchestration, file D).
- Un commit, posé juste avant le push. PR de documentation seule ; « prête @<sha> » pour l'intégrateur.
- Lot `cockpit-resumes-pages` inscrit et `pris` au carnet (ordre 82, après `cockpit-v2`, passé `fait` par l'intégrateur ; son `merge_fait` est accusé).
- La page vit hors dépôt : version 15 de l'artefact de la page de suivi. Son adresse n'est jamais au dépôt.

## Objectif

Le responsable demandait si le cockpit pouvait être une page indépendante, alimentée par les pages de suivi A à D, et si ses données étaient à jour, refonte Lien comprise. Réponse : une page ne lit pas la base d'un autre artefact ; le cockpit ne voyait que les registres communs et l'instantané GitHub. Option A retenue (« option A pour l'instant ») : un résumé par page, déposé dans la base du cockpit.

## Décisions prises

- Option A plutôt que B (tout réunir dans un seul artefact : migration lourde, adresses changées) ; B reste ouverte pour plus tard.
- Collection `resumes`, un document par page : `file-a`, `file-c`, `bioflow`, `lien-praticien`, `lien-patient`. La file D est lue en direct (`items` de sa propre base).
- Pages à lots (refonte Lien) : un lot `merge` compte comme `fait` ; la dernière entrée vient du journal de la page ou de celui des lots, la plus récente.
- « Résumé à rafraîchir » au-delà de quarante-huit heures : seuil d'affichage choisi par le lot, pas une règle de cycle.
- Pas de page indépendante, pas de deuxième base à tenir d'accord.

## Fichiers modifiés

- `docs/ROLES_MACHINES.md` : paragraphe « Les résumés des pages de suivi », après « L'instantané au cockpit ».
- `changelog.d/2026-11-15-cockpit-resumes-pages.md`.
- Ce handoff.
- Hors dépôt : `cockpit.html` (version 15) et cinq documents `resumes/*` (version 1), calculés par un script du bloc-notes de la session à partir des exports des cinq bases.

## Validations exécutées

- Script du cockpit : `node --check` vert.
- Constat à l'écran (Chrome), version 15 : six cartes « Pages de suivi » remplies (D en direct, A, C, BioFlow, Lien praticien, Lien patient), compteurs et heure du résumé affichés, liens présents.
- Compteurs relus contre les exports : A 124 faits, 1 en cours, 2 à faire, 35 en attente ; C 30, 3, 1, 14 ; BioFlow 95, 9, 50, 7 ; Lien praticien 3 faits, 1 en cours (PRA-4, #2139), 2 à faire ; Lien patient 6 faits, 2 à faire.

## Problèmes ouverts

- Les résumés dépendent des sessions qui tiennent chaque page : sans dépôt, la carte se dit à rafraîchir. Les sessions A, C, BioFlow et refonte Lien doivent apprendre la consigne : messages au registre après le merge.
- La page de l'audit des douze besoins n'a pas de base : elle n'a pas de carte. La file B n'a pas de page de suivi propre.
- Le journal de la page Lien praticien s'arrête au 2026-11-13 ; l'état récent de PRA-4 vit dans le journal du lot. Le résumé lit les deux.
- `wn-registres.mjs` ne lit toujours pas `reponses`.

## Prochaine action exacte

1. Pousser, ouvrir la PR (`--body-file`), `node scripts/wn-attendre-ci.mjs <N>` en fond, PR-Agent sur la tête, « prête » à l'intégrateur.
2. Au merge : lot à `fait`, puis un message au registre à chaque file (A, C, et aux sessions BioFlow et refonte Lien par leur file) avec la consigne.
3. Lot suivant de la file D : `licences-tierces-bundle` (ordre 83).

## Interdits encore actifs

- Ne jamais supprimer une ligne des registres (`questions`, `messages`, `lots`, `reponses`). Les documents `instantanes/github` et `resumes/*` se remplacent, ils ne s'effacent pas.
- Pas de ligne de test dans `reponses`.
- Le cockpit ne répond jamais à une question `clinique` ou `migration`.
- Aucune adresse d'artefact dans le dépôt.
- Horodater en lisant l'heure système, jamais à l'estime.
