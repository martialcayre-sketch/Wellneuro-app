# Handoff — 2026-11-12 — dossier de preuve du besoin 1 ouvert (D-312, H15), lot 4 de la file B

## Branche et état Git

- Branche `docs/besoin1-dossier-ouverture`, créée sur `origin/main` bff47e88 (merge de #2046 ; #2043 est mergée en 6aeab38d), dans le
  worktree `.claude/worktrees/b-bp17-cadre`.
- Session concurrente (file B) : `git` et `gh` en direct, pas de `/wn-*`.

## Objectif

Lot 4 des suites des sept questions du 2026-11-12 : Q4 à Q6, l'ouverture du dossier du besoin 1 (`D-312`), sans
code. État initial lu dans le code, dossier ouvert hors dépôt, questions à la liste commune, puis arrêt pour
arbitrage.

## Décisions prises

- Boîte B du registre des messages (`D-503`) : une ligne, `20261112-2139-integrateur` (`merge_fait` de #2038), sans
  suite pour la file B ; passée à `lu`.
- Support : Claude Doc privé « Équilibre de l'assiette (besoin 1) » (lien hors dépôt, comme pour le besoin 2), au
  gabarit des dossiers du besoin 2, relu sur le dossier iode et sélénium. Étape 1 seulement : statut, « À trancher
  en premier » (T1 à T3), cadre (état initial, Q4 à Q7, limite `D-455`, interdits) ; les sections des étapes
  suivantes restent en attente.
- État initial : la forme longue de l'enquête est servie (`WN_ALI_01_SIIN57`, depuis le 2026-07-28), donc le double
  compte est réel en production. Les biomarqueurs du guide existent au catalogue, sans lien au besoin 1 ; deux d'entre eux portent
  des liens analyte–axe signés (F79, `D-351`), à relire à l'étape 2.
- Questions à la liste commune (page de la file D, collection `questions`) : `20261112-2330-b` (support et
  structure, ordinaire), `20261112-2331-b` (sources à réunir, clinique), `20261112-2332-b` (mesure dérivée,
  clinique). Option A recommandée pour les trois.
- Pas de retouche de la ligne « dossiers des autres besoins » du plan : le fragment du journal suffit.

## Fichiers modifiés

- `docs/claude/plan-journal/H15/2026-11-12-08-dossier-besoin-1-ouvert.md` (nouveau).
- `changelog.d/2026-11-12-dossier-besoin-1-ouvert.md` (nouveau) ; ce handoff.

## Validations exécutées

- `node scripts/wn-plan-journal-rubriques.mjs` : `exit=0` (aucun identifiant associé à une rubrique).
- `bash scripts/check_no_secrets.sh` : `exit=0`.
- T1 complet (`npm run check`) : `exit=0`. Pas de T2 : lot de documentation, sans code.
- CI de c2280ccb (`wn-attendre-ci.mjs`) : `0`. PR-Agent ne tourne pas : `pr_agent.yml` ignore les chemins de clôture,
  seuls touchés ici. Recours `wn-reviewer` (`D-448`) : GO, quatre P2, tous corrigés (niveau B signé par `D-424` §3 ;
  provenance des arbitrages Q4 à Q6 et décision clinique à venir pour la mesure ; liens analyte–axe de deux
  biomarqueurs ; commit de base). L'URL du dossier privé est retirée du handoff, sur le précédent du besoin 2.

## Problèmes ouverts

- T1 à T3 attendent l'arbitrage du responsable ; T2 et T3 sont cliniques (réponse dans la session qui agit).
- La règle de décision du guide pour le besoin 1 reste sans source, quelle que soit l'option retenue pour T3.

## Prochaine action exacte

1. CI de la tête ; revue PR-Agent prouvée (`wn-revue-pr-agent.mjs` = 0), sinon `wn-reviewer` ; un verdict par
   remarque.
2. Relire la boîte B, puis déclarer « prête @<sha> » ; l'intégrateur merge.
3. Après l'arbitrage de T1 à T3 : l'étape 2 du dossier (lecture du corpus par conteneur), sur accord.

## Interdits encore actifs

- Aucun texte de claim, aucune dose, aucun seuil, aucun nom de rubrique au dépôt, ni dans les tests, ni dans les
  messages de commit (`D-325` §5, banc de #2043).
- Aucune règle, aucun seuil, aucune borne inventés ; aucun code clinique : la mesure dérivée part avec J3-12f.
- Aucune migration, aucune écriture en base ; pas de `prisma format`. La production se lit par conteneur
  `scalingo run -d`, par identifiant.
