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
- Garde dans la migration (revue `wn-reviewer`, P2-1) : un NIR non nul fait
  échouer la migration avant le `DROP`, rien n'est supprimé.

## Fichiers modifiés

- `web/prisma/migrations/20261019190000_patients_retrait_nir_v1/migration.sql`.
- `web/prisma/schema.prisma`.
- `web/prisma/checks/patients_retrait_nir_v1_negatif.sql` (nouveau),
  `web/prisma/checks/dossier_administratif_patient_v1_negatif.sql`.
- `.github/workflows/ci.yml` (une étape, commentaire de l'étape voisine).
- Plan, changelog, SESSION_LOG.

## Validations exécutées

- `npx prisma validate` vert ; T1 complet vert.
- T3 vert (migration appliquée, « No difference detected », contrat neuf
  joué, 282 E2E), rejoué après l'ajout du garde : voir la PR.
- Revue `wn-reviewer` : go, aucun P0/P1 ; P2-1 traité ici, P2-2 à P2-5
  ci-dessous.

## Problèmes ouverts

À reprendre APRÈS la release-db constatée (vrais seulement à ce moment) :

- `docs/DOSSIER_RGPD.md:652` : « la colonne vide attend une migration de
  retrait » (et « seul le masquage la lit encore », faux depuis #1567).
- Commentaires `web/src/app/api/praticien/patients/route.ts:76-80` et
  `route.test.ts:1066-1068` (« la colonne reste en base… »).
- `docs/claude/campagnes/2026-09-16-rayon-patients/CONSTAT_LIGNE_DE_BASE.sql:27`
  lit `nir` : échouera après la release (dette déjà nommée au plan, D/27 ;
  aucun CI ne la joue).

Précaution : une fois la colonne retirée, **ne jamais réinstaller une image
antérieure à ce commit** — l'ancien client Prisma sélectionne `nir`, toute
lecture `Patient` échouerait.

## Prochaine action exacte

PR, CI, CodeRabbit sur la tête, merge (un à la fois, après la release-db de
t11), constat du déploiement de ce sha, re-constat de 0 NIR par conteneur
juste avant l'approbation, release-db, sentinelle, constat `migrate status` et
absence de la colonne par conteneur ; puis le lot de suivi des trois textes
ci-dessus ; t03 → fait.

## Interdits encore actifs

- Pas de `prisma format` ; jamais de merge pendant qu'un release-db attend.
