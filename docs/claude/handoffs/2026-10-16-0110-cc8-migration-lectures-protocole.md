# Handoff — CC-8, migration de l'espèce `protocole` (D-315)

## Branche et état Git

- Branche `feat/cc8-journal-lecture-protocole-migration`, worktree
  `.claude/worktrees/cc8-migration`, partie d'`origin/main` c6a7ce05 (#1489).
- Commit b496b810 (migration seule), plus ce handoff.
- La copie principale est utilisée par une autre session : ne pas y faire
  de `switch` (incident du 2026-10-16 réparé : sa branche lui a été rendue).

## Objectif

Migration seule de J2-cc8 : admettre `protocole` dans le CHECK de
`portail_lectures_patient`, demandée par le responsable le 2026-10-16.

## Décisions prises

- D-315 (#1486) fonde le lot : une ligne par diffusion approuvée en vigueur,
  sans date ; release-db dès qu'elle est prête, avant ai.
- Une seule instruction `ALTER TABLE … DROP CONSTRAINT, ADD CONSTRAINT` ;
  aucune colonne, aucune ligne. `schema.prisma` : commentaires seuls.
- Contrat négatif à quatre promesses ; la quatrième (contrainte validée,
  pas `NOT VALID`) ajoutée sur la remarque R2 de la revue.
- Écarté : `lock_timeout` (table petite, précédents sans), remarque R3.

## Fichiers modifiés

- `web/prisma/migrations/20261016080000_portail_lectures_protocole_v1/migration.sql`
- `web/prisma/checks/portail_lectures_protocole_v1_negatif.sql`, `.github/workflows/ci.yml`
- `web/prisma/schema.prisma` (commentaires de `PortailLecturePatient`)
- `changelog.d/2026-10-16-cc8-lectures-protocole-migration.md`, `docs/claude/PLAN_WELLNEURO.md` (H60)

## Validations exécutées

- T3 complet vert (7 min 50 s) : migration appliquée, « No difference
  detected », contrat joué, 742 fichiers vitest, 271 E2E.
- T1 complet vert ; anti-secrets propre.
- `wn-reviewer` P1 : GO, aucun bloquant.

## Problèmes ouverts

- PR #1488 (BP-12a, autre session) porte `20261015200000_fiches_usage_v1`,
  antérieure par l'horodatage, et touche `ci.yml` et `schema.prisma` :
  ordre de merge au responsable ; une release-db à la fois.
- Seconde PR (code) : détail replié à l'accueil, écrivain, `ESPECES` et
  `EspeceLecture`, vérification serveur de la diffusion servie,
  `protocolDiffusionApproval` dans `APPEND_ONLY` du banc
  `portailLecturesPatient.guard.test.ts` ; servie avec ACT-1.

## Prochaine action exacte

1. PR (migration seule), `wn-attendre-ci` en fond, revue CodeRabbit sur la tête.
2. Merge sur le créneau choisi par le responsable, une fois l'ordre avec
   #1488 tranché ; approbation release-db par le responsable dans la foulée.
3. Sentinelle `WN_RELEASE_DB_OK id=<run>`, constat par conteneur
   (CHECK à cinq espèces, `migrate status` à jour), déploiement en tête.
4. Puis la seconde PR (code).

## Interdits encore actifs

- Aucun code consommateur avant la release-db constatée (D-087).
- Une release-db à la fois ; aucune écriture sur `main` pendant l'attente
  d'approbation.
- Approbation release-db : geste humain. Pas d'auto-merge.
