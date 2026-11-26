# Handoff — J3-12f, clôture : réapprobation des 2 protocoles constatée (documentation seule) (2026-11-26)

## 1. Branche et état Git

- Branche `docs/j312f-cloture-reapprobation`, tirée d'`origin/main` après le merge de l'amendement de `D-565` (#2376), dans le worktree
  `.claude/worktrees/agent-a81c34a8d1130b0ce`. Commit tardif avant le push (`D-518`).

## 2. Objectif

Constater en lecture seule la réapprobation des 2 protocoles diffusés que le changement de version v20/v21 (`D-565`, #2367) éteignait, et clore J3-12f par un fragment de la fiche H15.

## 3. Décisions prises

- Aucune décision nouvelle. Fragment de journal H15 (`2026-11-26-02`) et fragment de changelog ; restes ouverts nommés.
- Le constat ne conclut pas sur l'étiquette v21 : elle n'est lisible dans aucune ligne stockée (aucun épisode créé depuis le déploiement ; les charges des brouillons ne la portent pas). La preuve retenue est la dérive des empreintes de la carte et du brouillon, 2 sur 2.

## 4. Fichiers modifiés

- `docs/claude/plan-journal/H15/2026-11-26-02-j312f-cloture-reapprobation.md` ; `changelog.d/2026-11-26-j312f-cloture-reapprobation.md` ; ce handoff.

## 5. Validations exécutées

- Constat en lecture seule par conteneur détaché (transaction en lecture seule, agrégats, aucun dossier nommé) : 2 têtes ancrées sur la version active, créées et approuvées après le déploiement ; 0 ancienne version diffusable ; 7 têtes dont 5 sur des brouillons remplacés ; 11 approbations dont 2 depuis le déploiement ; 15 brouillons dont 2 depuis le déploiement ; 16 épisodes, tous en v15, aucun créé depuis ; empreintes de carte et de brouillon différentes de celles des versions remplacées, 2 sur 2 ; 2 brouillons revus et approuvés après relecture, par le praticien.
- Documentation seule : `npm run check` ; CI, preuve PR-Agent et sonde consignées à la déclaration « prête » sur la PR.

## 6. Problèmes ouverts

- Étiquette v21 : à lire sur le premier épisode confirmé après le déploiement.
- P25 du besoin 8 (amendement de `D-567` à sa signature) ; `PRIO-PON-01` et `D-040` (besoin 3) ; code des sous-scores du besoin 10 ; issue du besoin 11.

## 7. Prochaine action exacte

Intégrateur : merge de la PR déclarée « prête @sha ». Ensuite, le geste suivant de la séquence des 12 besoins, au choix du responsable parmi les restes ouverts ci-dessus.

## 8. Interdits encore actifs

Aucune signature ni rejet ; aucune écriture en production ; aucune identité ni texte de claim au dépôt ; un merge à la fois et la session ne merge pas.
