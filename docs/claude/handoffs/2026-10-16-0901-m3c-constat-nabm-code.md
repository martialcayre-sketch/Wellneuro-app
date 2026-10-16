# Handoff — M-3c PR 2 : chaque geste NABM journalisé, constat « aucun acte » signé à l'écran (F54, file A rang 2)

## Branche et état Git

- Branche `feat/m3c-constat-nabm`, worktree `.claude/worktrees/file-d1-suite`, créée depuis `origin/main` après le merge de la PR 1 (#1493, fcb66bb0), avancée en avance rapide sur db76bd9f (#1488, BP-12a, autre session) ; un commit de lot.
- Session concurrente : cycle en `git`/`gh` direct ; ni écriture ni checkout dans la copie principale.

## Objectif

Le code consommateur de la migration `20261016100000_nabm_journal_constats_v1` : journal écrit à chaque signature et retrait, constat signé « aucun acte dans la nomenclature » posé et retiré depuis la fiche d'analyte, dérivé en `hors_nomenclature` par `remboursable.ts`. Ferme la fenêtre où signer et retirer rendaient « Erreur technique. ».

## Décisions prises

- Arbitrages du 2026-10-16 appliqués, sans les reposer : constat valable pour le seul millésime constaté (périmé ⇒ `non_evalue`, affiché « à renouveler ») ; exclusion signature ↔ constat (refus en raisons `constat_present` et `signature_presente`, retrait d'abord) ; aucun geste sans journal.
- Contraintes N-3 de la contre-revue de la PR 1 : état vu jugé avant la ligne de journal, transaction annulée si l'écriture ne touche aucune ligne (a) ; un geste par transaction (b) ; date de signature et de constat relue en base avant d'être rendue (c).
- R2 (course avec un import NABM) : verrou de partage sur `biology_catalog_versions_courantes` en tête de chaque geste, que l'import (`SHARE ROW EXCLUSIVE`) attend et fait attendre ; puis le verrou consultatif de l'analyte (fonction de la migration).
- Le constat ne se pose que sur un analyte que la liste préparée range « aucun acte » (`constat_non_permis` sinon) ; le retrait vaut même pour un constat périmé.
- Arbitrage du responsable (2026-10-16, sur une remarque CodeRabbit P1) : constat refusé hors du millésime de la liste (`liste_a_relire`), bouton retiré avec sa raison ; écartés : l'attestation du praticien seule, le report avant la V106.
- Remise à niveau sur #1494 (PLAN commun) : rebase, sur arbitrage du responsable ; sans conflit.

## Fichiers modifiés

- `web/src/lib/biology-library/remboursable.ts` (+ test), `catalogue.ts` (+ test), `correspondancesNabm.ts` (+ test).
- `web/src/app/api/praticien/biologie/nabm/correspondances/route.ts` (+ test) ; neuf : `web/src/app/api/praticien/biologie/nabm/constats/route.ts` (+ test).
- `web/src/components/biologie/CorrespondancesNabmSection.tsx` (+ test).
- `web/src/lib/bio-parcours/importeursBiologyLibrary.guard.test.ts` : la route des constats inscrite à la liste blanche des importeurs de `biology-library`, avec son motif.
- Neuf : `web/scripts/banc-nabm-gestes-prisma.test.ts` ; `.github/workflows/ci.yml` et `scripts/wn-test-worktree.sh` (le banc).
- Clôture : `changelog.d/2026-10-16-m3c-constat-nabm-code.md`, `docs/claude/PLAN_WELLNEURO.md` (F54, ligne M-3c) ; `docs/claude/MATRICE_CONSOMMATION.md` régénérée (une ligne : la bibliothèque de biologie passe de 1 à 4 surfaces indirectes).
- Intouché : `propositionService.ts` (lettre f), `schema.prisma`, migrations.

## Validations exécutées

- Constat de production de la PR 1, par conteneur en lecture seule : migration appliquée, `migrate status` à jour (113), RLS sans politique, douze triggers armés (trois différés), 0 journal, 0 constat, 5 signatures intactes ; dernier déploiement = fcb66bb0.
- Vitest des fichiers touchés : verts (699) ; onze mutations (dérivation, catalogue, écrivain, écran, route) les font rougir.
- Banc de l’écrivain contre PostgreSQL (base locale de la migration courante) : vert, 10 cas (0 à 9) ; six mutations de l'écrivain le font rougir, dont l'attente non bornée (le banc relâche le verrou au bout de 10 s et échoue) ; une septième (date du constat non relue) survit au banc quand les deux horloges tombent sur la même milliseconde, et rougit le Vitest.
- Revue CodeRabbit (1744fb91) : un commentaire, fondé et corrigé — l'attente épuisée du verrou de l'analyte se disait « import en cours » ; chaque verrou nomme désormais son refus (table des versions ⇒ `import_en_cours`, analyte ⇒ `etat_divergent`), cas 9 du banc.
- Revue `wn-reviewer` : GO avec réserves, aucun P0/P1 ; quatre P2 corrigés dans le lot — attente du verrou bornée à 3 s (`lock_timeout`, refus `import_en_cours`), READ COMMITTED explicite, prédicat `constatValable` écrit une fois dans `remboursable.ts`, portée de R2 précisée (« par l'application »).
- `tsc`, T1 complet (`npm run check`, matrice de consommation régénérée) verts ; T2 (`test:worktree -- --fast`) vert avant les corrections de revue (Vitest 12 898, E2E 271), rejoué après : voir la PR.

## Problèmes ouverts

- Merge seulement après la release-db de #1488 (`20261016090000_fiches_usage_v1`, autre session), approuvée et constatée : une écriture sur `main` pendant son attente d'approbation tuerait son run.
- Critère de fin de M-3c : le premier constat signé par le responsable depuis la fiche d'analyte, relu par conteneur (journal + constat).
- G-3 redevient jouable au déploiement de cette PR.
- À la lettre f : un analyte constaté passera, dans le document patient, de « non évalué » au texte « non pris en charge » de `documentPatient.ts` — texte patient, à signaler au cadrage de f (F54).
- À l'import d'une V106 : relire `candidatsNabm.ts` et porter `MILLESIME_LISTE_NABM` au nouveau millésime, par PR — d'ici là, aucun constat (arbitrage du 2026-10-16, F54).
- Non éprouvé par banc : le sens inverse de la course (geste en cours, import qui attend, contrôle des orphelines qui voit la signature) ; `LOCK TABLE … IN SHARE MODE` suppose que le rôle applicatif est propriétaire de la table (vrai sur Scalingo, rôle unique).

## Prochaine action exacte

CI (`wn-attendre-ci` en fond), revue (CodeRabbit sur la tête, verdicts), merge `--match-head-commit` après la release-db de #1488 ; déploiement constaté ; le responsable pose un constat (par exemple sur un des trois analytes de S-7 sans acte) ; relecture par conteneur ; puis artefacts r2_11 (file A) et n08 (BioFlow).

## Interdits encore actifs

- Aucun branchement des remboursements dans `propositionService.ts` (lettre f).
- Aucune signature ni aucun constat écrit par migration ou script.
- UI en français ; aucune identité réelle ni adresse de signataire au dépôt.
