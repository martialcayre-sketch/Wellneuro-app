# Handoff — 2026-11-12 — Besoin 2 : la preuve déclarée achevée, avec réserves (H15)

## Branche et état Git

`docs/besoin2-preuve-achevee` est une session concurrente, dans le worktree `.claude/worktrees/b-fiche-usage-iode-selenium`. Elle part de `origin/main` `22812108`, sans merge ni rebase. Documentation seule : aucun code, aucune migration, pas de release-db.

## Objectif

Dernière étape de l'ordre arbitré des restes du besoin 2 : la déclaration « besoin 2 achevé », préalable des dossiers des autres besoins.

## Décisions prises

- Arbitrage du responsable (question à options, option recommandée) : déclarer achevés les **dossiers de preuve** du besoin 2, avec réserves. Les textes des fiches d'usage restent à F05.
- Étiquetage de `WN-CL-0653-001` (besoin 2, rubrique des limites) délégué par le responsable (`D-325` §5) et fait depuis sa session.
- Pas de D-xxx : déclaration de plan, sans changement clinique.

## Fichiers modifiés

- `docs/claude/PLAN_WELLNEURO.md` : état de la ligne « dossiers des autres besoins » (préalable levé).
- `docs/claude/plan-journal/H15/2026-11-12-03-preuve-besoin-2-achevee.md`.
- `changelog.d/2026-11-12-besoin2-preuve-achevee.md`.
- ce handoff.

## Validations exécutées

- Production, conteneurs détachés, lecture seule :
  - aucune version ni aucun libellé de fiche d'usage ;
  - 891 claims VALIDE étiquetés au besoin 2 ;
  - 32 claims en attente, par source ;
  - 2 claims VALIDE du lot sans clé de lien.
- Après l'étiquetage : `0653-001` VALIDE, clés posées, hash inchangé, acte au journal ; base 8 599 / 32 / 93 ; contrat de fraîcheur et `biology_liens_axe_v1.sql` en `exit=0`.
- `bash scripts/check_no_secrets.sh --staged` ; `cd web && npm run check`.

## Problèmes ouverts

Les réserves de la déclaration, au journal H15 `2026-11-12-03` :
- les textes des fiches d'usage (F05) ;
- les 32 claims en attente, dont `0044-020` ;
- `0512-019` et `0512-020`, sans clé de lien ;
- l'unité de `0189-136` à `0189-140` ;
- la licence de `0652` ;
- le `requiredAction` de `0652` et `0653` ;
- le candidat NABM `7302` ;
- la dette H15 02 ;
- l'écran de revue de l'atelier ;
- `D-498` §4.

## Prochaine action exacte

1. CI et revue sur la tête : CodeRabbit, sinon Copilot (`D-468`), sinon PR-Agent prouvé. Un verdict par remarque, puis « prête @<sha> » pour l'intégrateur.
2. Ensuite, au geste du responsable : les dossiers des autres besoins (1, 4, 5, 9 d'abord), ou les textes des fiches d'usage (F05).

## Interdits encore actifs

- Production en lecture seule, par conteneur `scalingo run -d`.
- Aucun texte clinique, libellé de claim ou valeur dans le dépôt public (`D-251` §4).
- Aucune ingestion sans accord du responsable.
- Validation et signature des claims : gestes du responsable, ou exécutés à sa demande.
- Pas de pull, merge ni rebase sans arbitrage.
- Après tout changement de statut d'un claim : rejouer le contrat de fraîcheur et `biology_liens_axe_v1.sql`.
