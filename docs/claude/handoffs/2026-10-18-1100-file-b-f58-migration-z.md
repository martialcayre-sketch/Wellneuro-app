# Handoff — 2026-10-18 — File B : F58 migration (D-322), lettre z (D-302)

## Branche et état Git

- Branche `f58-migration-statuts-poses`, PR #1537, dans le worktree
  `bio-ingest-cloture` (session concurrente, cycle en git/gh direct) ;
  `origin/main` fusionnée dans la branche (délégation du 2026-10-16).
- Mergée dans la journée par cette session : #1539 (lettre z, D-302).

## Objectif

Poursuivre la file B en autonomie (demande du responsable du 2026-10-18) :
migration de F58, puis lots sans geste humain.

## Décisions prises

- F58 : table `statuts_poses_resultats_biologiques`, actes `pose`/`retrait`,
  six codes en CHECK, tête de fil, praticien du dossier, pose qui change le
  statut, retrait d'un statut actif ; verrous de clé de BP-09 (ceux de la
  correction : course à deux sessions fermée, relecture CodeRabbit) ;
  REPEATABLE READ refusé. Déclarée à BioFlow (D-306).
- Paragraphe RGPD validé par le responsable le 2026-10-18.
- z : date valide au sens de la garde d'âge (règle du portail) ; mineur créé.
- F38 : un seul lot avec migration (trace d'impression + remise patient
  journalisée) ; impression bloquée si refus de partage médecin.

## Fichiers modifiés

Migration `20261018120000_statuts_poses_resultats_biologiques_v1`,
`schema.prisma`, contrat `statuts_poses_resultats_biologiques_v1_negatif.sql`,
`ci.yml`, `effacement.ts` (+ test), `biology-library/publie.ts`,
`DOSSIER_RGPD.md`, `PLAN_WELLNEURO.md` (F58, F45), fragments changelog,
`SESSION_LOG.md`, ce handoff. z : `api/praticien/patients/route.ts` (+ test),
`RayonPatientsPanel.tsx` (+ test).

## Validations exécutées

- F58 : contrat vert sur base neuve, `migrate diff` sans dérive, cinq
  mutations du trigger rougissent le contrat ; T1 ; revue `wn-reviewer` (go,
  P2 corrigés ou routés) ; CI vert sur bd66ec18 ; CodeRabbit sans remarque
  hors la validation RGPD.
- z : banc de route (8 cas), T1, T2 vert (13 452 unitaires, 276 E2E) ; CI
  vert ; remarque CodeRabbit (libellé visible) corrigée.

## Problèmes ouverts

- Sortie du T3 local de F58 non relue (lecture refusée) ; le CI fait foi.
- F38 : forme de l'objet « document remis » à cadrer avant la migration.

## Prochaine action exacte

Merger #1537 sur CI vert et revue de tête, approuver la release-db sur la
tête de main, sentinelle, constat par conteneur, puis PR du code F58.

## Interdits encore actifs

Aucune écriture en base hors release-db approuvée ; aucun identifiant de
dossier réel dans le dépôt ; porte 23 (signature clinique) humaine.
