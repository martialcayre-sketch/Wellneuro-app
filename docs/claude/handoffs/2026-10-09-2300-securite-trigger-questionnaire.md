# Handoff — 2026-10-09 — D-275 §2 : le trigger accepte les constats de questionnaire (LOT-2 sur 3, migration seule)

## Branche et état Git

- Copie principale, branche `feat/securite-trigger-levee` partie d'`origin/main`
  (1e329684, #1373 mergée). Commit du lot : 7b8015cb. PR ouverte avec ce handoff.

## Objectif

Migration seule ([[D-087]]) préalable au producteur de constats de questionnaire
(LOT-3) : sans elle, un constat de questionnaire n'aurait aucune levée possible
(levée allumée en production, A7 de [[D-257]]).

## Décisions prises

- Regex du trigger : `^safety:(anamnese|questionnaire):[0-9a-f]{16}$`, message de
  refus prolongé sans changer son début (contrat v1 inchangé).
- Arbitrage du responsable : le tri de la porteuse du trigger gagne `k.id DESC`,
  aligné sur `ORDRE_CONSULTATION_PORTEUSE` (#1373).
- Retour arrière : retirer d'abord le producteur LOT-3, ne restaurer que la regex.
- Acceptés par le responsable (consignés dans D-275) : un constat de questionnaire
  sans porteuse n'a pas de levée tant qu'elle n'existe pas ; une nouvelle anamnèse
  validée rebloque aussi les couvertures de questionnaire (A6).

## Fichiers modifiés

- `web/prisma/migrations/20261009220000_adressages_signal_alerte_constats_questionnaire_v1/migration.sql`
- `web/prisma/checks/adressages_signal_alerte_questionnaire_v1_negatif.sql` (nouveau,
  branché dans `.github/workflows/ci.yml`)
- `docs/DECISIONS.md` (D-275, une puce), `changelog.d/2026-10-09-migration-adressage-constats-questionnaire.md`

## Validations exécutées

- Contrats v1 et questionnaire verts en local ; quatre mutations rougissent le
  nouveau (fonction v1, alternative sans parenthèses, tri sans id — vu seulement par
  l'assertion `prosrc`, le comportement passant par hasard —, tri id ASC).
- T1 complet vert ; T3 vert (4 min 35 s, contrat neuf joué).
- `wn-reviewer` : GO, aucun P0/P1 ; P2 retour arrière corrigé.
- Production (conteneur, lecture seule, agrégats) : 0 dossier à égalité de dates de
  porteuse ; 4 adressages, tous anamnèse.

## Problèmes ouverts

- Commentaire périmé `schema.prisma:1599` (« safety:anamnese: » seul) : routé au
  LOT-3 (modification du schéma soumise à demande explicite).
- LOT-3 : `couverturesRetenues` (`.every`) écarte une ligne mixte entière — à élargir
  avec le producteur ; tests vitest à ids `questionnaire`.

## Prochaine action exacte

CI (`wn-attendre-ci`), Codex par le responsable, merge, déploiement constaté ;
`release-db` approuvée par l'humain ; constat par conteneur (`pg_proc.prosrc` contient
`questionnaire` et `k.id DESC`, migration agrégée appliquée). Puis LOT-3 en session neuve.

## Interdits encore actifs

- Pas de producteur questionnaire avant application constatée de cette migration.
- Table `SAF-QUEST-01` signée seulement sur surface relue ([[D-195]]) ; aucun seuil inventé.
- Pas de donnée patient réelle ni d'identifiant de dossier dans le dépôt.
- Pas d'auto-merge ; un merge à la fois, déploiement constaté.
