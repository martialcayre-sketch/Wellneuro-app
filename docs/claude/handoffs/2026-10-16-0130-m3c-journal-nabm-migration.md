# Handoff — M-3c PR 1 : journal des signatures NABM et constat « aucun acte », migration seule (F54, file A rang 2)

## Branche et état Git

- Branche `feat/m3c-journal-nabm`, worktree `.claude/worktrees/file-d1-suite`, rebasée sur `origin/main` à 2086fa7b (#1490) ; un commit de lot, PR 1 de M-3c.
- Session concurrente : cycle en `git`/`gh` direct ; ni écriture ni checkout dans la copie principale. Remises à niveau : avance rapide ou rebase sur arbitrage du responsable.

## Objectif

Fermer la réserve R1 de M-3 (aucun journal des signatures NABM) et poser le constat signé « aucun acte dans la nomenclature », en migration seule : schéma, migration, contrat SQL, sans code consommateur. La PR 2 (code) attend l'application constatée.

## Décisions prises

- Trois arbitrages du responsable (2026-10-16, à ne pas reposer) : constat valable pour le seul millésime constaté ; signature et constat exclusifs (retrait d'abord) ; la base refuse tout changement sans ligne de journal de la même transaction (signer et retirer échouent entre la release-db et la PR 2 — ne pas jouer G-3 dans cette fenêtre).
- Sans question : aucune reprise des signatures antérieures au journal (un retrait recopie ce qu'il efface) ; constat en table neuve, pas en colonnes de l'analyte.
- Revue `wn-reviewer` (GO avec réserves) puis contre-revue (GO) : troncature gardée, concordance de la dernière ligne de journal avec l'état final, READ COMMITTED seul, date de signature posée par la base, affirmations resserrées (garantie à sens unique, limites écrites), contrat à motifs, banc à deux sessions. N-1 de la contre-revue traité par la formulation (pas de condition SQL ajoutée) ; course avec un import concurrent (R2) et trois contraintes de code routées à la PR 2 (F54).

## Fichiers modifiés

- Neufs : `web/prisma/migrations/20261016100000_nabm_journal_constats_v1/migration.sql`, `web/prisma/checks/nabm_journal_constats_v1_negatif.sql`, `web/scripts/banc-nabm-exclusion-deux-sessions.test.mjs`, `changelog.d/2026-10-16-m3c-journal-nabm-migration.md`.
- Modifiés : `web/prisma/schema.prisma` (deux modèles, deux relations, commentaire de `BiologyAnalyteNabm`), `.github/workflows/ci.yml` (contrat et banc), `scripts/wn-test-worktree.sh` (banc), `web/scripts/test-cb-nabm-import.sh` (journalise ses signatures et suppressions), `docs/claude/PLAN_WELLNEURO.md` (F54, ligne M-3c).

## Validations exécutées

- `npx prisma validate` ; parité schéma ↔ migration « No difference detected » (base locale neuve et T3).
- Contrat joué en local, par psql et par `prisma db execute` : vert ; 23 mutations des gardes le font échouer.
- Banc à deux sessions : vert ; rouge sur les deux courses si le verrou est neutralisé. Rejoué vert après le passage des analytes de banc en provenance `labo`.
- Banc d'import NABM (`test-cb-nabm-import.sh`, CI seulement) : vert en local, 18 cas.
- T1 (`check:rapide`) vert ; T3 complet (`npm run test:worktree`) vert, code 0, 5 min 43 s, E2E 271 — joué avant les dernières retouches (commentaires de la migration, provenance des analytes du banc), rejouées à part.

## Problèmes ouverts

- Merge à faire seulement après la release-db de #1490 (CC-8, autre session), approuvée et constatée : une migration à la fois.
- Release-db de cette PR : geste du responsable ; puis sentinelle `WN_RELEASE_DB_OK id=<run>`, constat par conteneur (tables, triggers, 0 ligne de journal), première ligne de `scalingo deployments` = tête de `main`.
- PR 2 : course avec un import NABM concurrent (R2), trois contraintes de code (F54, N-3).

## Prochaine action exacte

CI de la PR (`wn-attendre-ci` en fond), revue CodeRabbit sur la tête et verdicts, merge `--match-head-commit` après la release-db de #1490 ; puis release-db par le responsable et constat par conteneur ; puis PR 2 sur une branche neuve depuis `origin/main`.

## Interdits encore actifs

- Aucun branchement des remboursements dans `propositionService.ts` (lettre f).
- Aucune signature ni aucun constat écrit par migration ou script.
- Pas de code consommateur avant le constat par conteneur ; pas de G-3 entre la release-db et la PR 2.
- UI en français ; aucune identité réelle ni adresse de signataire au dépôt.
