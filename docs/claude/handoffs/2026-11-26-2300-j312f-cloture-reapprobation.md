# Handoff — J3-12f, clôture : réapprobation des 2 protocoles constatée (documentation seule) (2026-11-26)

## 1. Branche et état Git

- Branche `docs/j312f-cloture-reapprobation`, tirée d'`origin/main` après le merge de l'amendement de `D-565` (#2376), dans le worktree
  `.claude/worktrees/agent-a81c34a8d1130b0ce`. Commit tardif avant le push (`D-518`).

## 2. Objectif

Constater en lecture seule la réapprobation des 2 protocoles diffusés que le changement de version v20/v21 (`D-565`, #2367) éteignait, et clore J3-12f par un fragment de la fiche H15.

## 3. Décisions prises

- Aucune décision nouvelle. Fragment de journal H15 (`2026-11-26-02`) et fragment de changelog ; restes ouverts nommés.
- Le constat ne conclut pas sur l'étiquette v21 : elle n'est lue dans aucune ligne stockée (aucun épisode ni aucune synthèse créés depuis le déploiement ; les charges des brouillons ne la portent pas). La dérive de l'empreinte de la carte (2 sur 2) est compatible avec le changement de version et de source, sans isoler l'étiquette ; celle du brouillon est attendue de tout brouillon neuf.
- Les lignes « J3-12f » et « réapprobation » de `PLAN_WELLNEURO.md` passent à « fait » (colonne d'état, pas la fiche) ; les restes ouverts sont nommés au journal H15.

## 4. Fichiers modifiés

- `docs/claude/plan-journal/H15/2026-11-26-02-j312f-cloture-reapprobation.md` ; `changelog.d/2026-11-26-j312f-cloture-reapprobation.md` ; ce handoff ; `docs/claude/PLAN_WELLNEURO.md` (deux cellules d'état).

## 5. Validations exécutées

- Constat en lecture seule par conteneur détaché (transaction en lecture seule, agrégats, aucun dossier nommé) : 2 têtes ancrées sur la version active, créées et approuvées après le déploiement ; 0 ancienne version diffusable ; 7 têtes dont 5 sur des brouillons remplacés ; 11 approbations dont 2 depuis le déploiement ; 15 brouillons dont 2 depuis le déploiement ; 16 épisodes, tous en v15, aucun créé depuis ; empreinte de carte différente de celle de la version remplacée, 2 sur 2 (celle du brouillon aussi, attendue de tout brouillon neuf) ; 85 synthèses, aucune générée depuis le déploiement ; 2 brouillons revus et approuvés après relecture, par le praticien.
- Documentation seule : `npm run check` ; CI, preuve PR-Agent et sonde consignées à la déclaration « prête » sur la PR.

## 6. Problèmes ouverts

- Étiquette v21 attendue : à lire sur le premier épisode confirmé ou la première synthèse générée après le déploiement.
- Liste du `D-548` §5.4 (fiches, lettre au médecin, annonce) : non vérifiée par ce constat, à la main du responsable.
- P25 du besoin 8 (amendement de `D-567` à sa signature) ; `PRIO-PON-01` et `D-040` (besoin 3) ; code des sous-scores du besoin 10 ; issue du besoin 11.

## 7. Prochaine action exacte

Intégrateur : merge de la PR déclarée « prête @sha ». Ensuite, le geste suivant de la séquence des 12 besoins, au choix du responsable parmi les restes ouverts ci-dessus.

## 8. Interdits encore actifs

Aucune signature ni rejet ; aucune écriture en production ; aucune identité ni texte de claim au dépôt ; un merge à la fois et la session ne merge pas.
