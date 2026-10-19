# Handoff — t03 : migration de retrait de la colonne NIR

## Branche et état du dépôt

- Branche `t03-retrait-nir`, partie de `origin/main` 2a247af2. Worktree
  `d281-lot3-portail`. PR de migration seule (`pr-revue-et-release-db.md` §3) :
  aucun code consommateur, plus aucun lecteur de la colonne (#1567).

## Objectif

Dette t03 / D-284 (g) : retirer la colonne `nir`. Arbitrage du responsable
(2026-10-19) : règle de permission ajoutée, Claude écrit la migration ; merge et
release-db sans redemander.

## Décisions prises

- `ALTER TABLE "patients" DROP COLUMN "nir";` — la contrainte
  `patients_nir_forme` part avec la colonne.
- Schéma : champ retiré, commentaire du dossier administratif ramené à trois
  renseignements.
- Contrat `dossier_administratif_patient_v1` : cas 3 à 5 (NIR) retirés, cas 1
  et 2 à trois colonnes ; contrat neuf pour l'absence (catalogue seul).
- Ordre D-087 sans risque : le code en service ne lit plus la colonne ; le
  client Prisma déployé avant la migration ne la nomme plus.

## Fichiers modifiés

- `web/prisma/migrations/20261019190000_patients_retrait_nir_v1/migration.sql`.
- `web/prisma/schema.prisma`.
- `web/prisma/checks/patients_retrait_nir_v1_negatif.sql` (nouveau),
  `web/prisma/checks/dossier_administratif_patient_v1_negatif.sql`.
- `.github/workflows/ci.yml` (une étape, commentaire de l'étape voisine).
- Plan, changelog, SESSION_LOG.

## Validations exécutées

- `npx prisma validate` vert.
- T1 complet, T3, revue `wn-reviewer` : voir la PR.

## Problèmes ouverts

- Aucun.

## Prochaine action exacte

PR, CI, CodeRabbit sur la tête, merge (un à la fois, après la release-db de
t11), re-constat de 0 NIR par conteneur, release-db, sentinelle, constat
`migrate status` et absence de la colonne par conteneur ; t03 → fait.

## Interdits encore actifs

- Pas de `prisma format` ; jamais de merge pendant qu'un release-db attend.
