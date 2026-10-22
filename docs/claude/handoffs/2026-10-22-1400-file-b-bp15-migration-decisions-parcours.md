# Handoff — 2026-10-22 — File B : BP-15, migration des décisions de parcours (D-343)

## Branche et état Git

- Branche `lot/bp15-migration`, partie d'`origin/main` (c43e49b4, merge de
  #1642), dans le worktree `bio-ingest-cloture` (session concurrente, cycle
  en git/gh direct).
- Mergée dans la journée par cette session : #1642 (D-343, décision et
  déclaration RGPD validées).

## Objectif

PR 1 du lot BP-15 (LOT-15, fiche F08) : la migration seule de la table
`decisions_parcours`, avec son contrat négatif, son banc à deux sessions et
l'effacement nommé. Aucun code consommateur.

## Décisions prises

- D-343 acceptée le 2026-10-22 : arbitrages du 2026-10-20 (ancrage sur la
  version, action facultative ; praticien seul, source notée ; motifs en
  listes fermées, aucun motif d'efficacité ; correction par remplacement de
  la tête et retrait) et précisions de l'assistant retenues telles quelles
  (une révision en vigueur par version, un fil par événement, aucune règle
  de séquence, refus levé par retrait, note obligatoire pour une préférence,
  date au jour ou « inconnue », version suivante facultative sur `ajuster`,
  version diffusée pour la mise en œuvre et la révision, mineur refusé).
- Réutilisation des fonctions `donnees_parcours_figee` et
  `donnees_parcours_suppression_nommee` de BP-13 ; une fonction de famille
  et le trigger d'insertion neufs ; verrou consultatif 343.
- Gardés à la route (D-343) : date future, action de la version, version
  diffusée, mineur, version suivante plus ancienne admise.

## Fichiers modifiés

- `web/prisma/migrations/20261022100000_decisions_parcours_v1/migration.sql`
- `web/prisma/schema.prisma` (modèle `DecisionParcours`, relations)
- `web/prisma/checks/decisions_parcours_v1_negatif.sql`
- `web/scripts/banc-decisions-parcours-deux-sessions.test.mjs`
- `web/src/lib/patient/effacement.ts` et `.test.ts`
- `.github/workflows/ci.yml`, `scripts/wn-test-worktree.sh`
- `docs/DOSSIER_RGPD.md` (nom horodaté de la migration), fiche LOT-15,
  campagne, plan F08, fragment `changelog.d/`, `SESSION_LOG.md`

## Validations exécutées

- `prisma validate` vert ; migration appliquée sur la base locale du
  worktree (`wn-dev-db.sh --migrate`).
- Contrat négatif : quinze promesses tenues, deux fois (avant et après les
  corrections de la relecture) ; une mutation (CHECK des motifs retiré) le
  fait rougir au cas 8a.
- Banc à deux sessions : 7/7, deux fois.
- T3 (`npm run test:worktree`) vert en 8 min 19 s (dérive schéma ↔
  migrations : « No difference detected » ; contrats SQL, bancs, build,
  E2E), joué sur la version d'avant les corrections de la relecture
  (commentaires, un cas de contrat, une assertion de banc), que le contrat
  et le banc rejoués ensuite couvrent.
- Relecture `wn-reviewer` : go, aucun P0 ni P1 ; P2 corrigés : commentaire
  de la course 5, message de la course 7, clé « version suivante » isolée
  par une version citée seulement comme suivante, note du retour arrière
  de BP-13.

## Problèmes ouverts

- Isolation fermée en base (READ COMMITTED seul admis), sur la revue
  CodeRabbit de #1644 et l'arbitrage du responsable du 2026-10-22.
- Routés à la PR 2 (fiche LOT-15) : nettoyages
  E2E de `web/e2e/helpers/db.ts` qui suppriment des versions ; retour
  arrière de BP-13 après celui de BP-15.
- Entre le déploiement du code et la release-db, un effacement de dossier
  échoue (transaction annulée) : approbation dans la foulée du merge.

## Prochaine action exacte

CI de la PR, revue CodeRabbit sur la tête, merge (`--match-head-commit`,
runs release-db `waiting` listés avant) ; le responsable approuve et
déclenche la release-db ; constat par conteneur (`scalingo run -d`) :
migration appliquée, table vide, RLS sans politique, triggers présents ;
première ligne de `deployments` = tête de `main`. Puis PR 2, code sous
`WN_DECISIONS_PARCOURS` éteint ; puis le brouillon de la lettre cm (F52),
hors dépôt ou en forme opaque.

## Interdits encore actifs

- Ne pas éteindre `WN_DOCUMENT_MEDECIN_PATIENT`.
- Pas de pull, merge ni rebase sans arbitrage — sauf merge d'`origin/main`
  dans la branche du lot BP-15 sans conflit (autorisé ; au premier conflit,
  arrêt et présentation).
- Production en lecture seule, par conteneur `scalingo run -d`.
- Une seule release-db à la fois : lister les runs `waiting` avant chaque
  merge.
- Aucune identité réelle, aucun texte clinique ni libellé d'hypothèse dans
  le dépôt.
- `signature(err)` seulement dans les logs, jamais `err.message`.
- Pas de merge sans revue CodeRabbit sur le sha de tête.
