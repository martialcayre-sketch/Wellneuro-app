# Handoff — F58, le statut posé près d'une valeur : le code (2026-10-18 16:00)

## Branche et état Git

- Branche `f58-code-statuts-poses`, tirée de `main` à 585a5105 (merge de la
  migration #1537). Worktree `bio-ingest-cloture`.
- Migration `20261018120000_statuts_poses_resultats_biologiques_v1` : release-db
  39132665192 approuvée sur la tête de main (CI vert), sentinelle présente ;
  conteneur : base à jour (119 migrations), trigger sous les verrous de clé
  de BP-09, RLS active, table vide ; déploiement en tête 585a5105.

## Objectif

Le code consommateur de la table des statuts posés ([[D-322]] §5, second
temps) : route, lecture, écran de la série ; banc à deux sessions et
nettoyage E2E demandés par la relecture `wn-reviewer` de la migration.

## Décisions prises

- Route `POST /api/praticien/biologie/resultats/statuts` sur le patron des
  annulations : garde, dossier clos refusé, un acte par transaction, verrous
  de clé de BP-09 (`verrouillerCleDuResultat`), puis refus nommés avant
  l'écriture — ligne corrigée, pose sur résultat annulé (refus de la route
  seule), statut déjà actif, retrait sans statut. Les raisons sont dans
  `MESSAGES_REFUS_STATUT`.
- Le GET des résultats joint `statutPose` à chaque ligne exacte : `actif`
  (dernier acte s'il est une pose) et `historique`. Rien n'est hérité par une
  correction.
- Écran : « sans statut posé » ou le statut avec date et auteur ; « Poser un
  statut », « Changer le statut » (sans l'actif), « Retirer le statut »
  (confirmation) ; historique repliable sur toute ligne. Une ligne corrigée
  ou annulée n'a ni statut courant ni geste. Le composant
  `components/biologie/ActeStatutResultat.tsx` est dans le domaine biologie
  (aucune dérogation BioFlow).
- Modules neufs nommés `statutPoseListe` (pur, liste fermée) et
  `statutPoseLecture` : `statutsPoses` faisait compter à
  `wn-matrice-consommation` un faux consommateur de `biology-library/statuts`
  (préfixe d'import).
- Les deux marques datées de [[D-308]] §3 restent pour la PR suivante, sans
  migration.

## Fichiers modifiés

`api/praticien/biologie/resultats/statuts/route.ts` (+ test, 19 cas),
`api/praticien/biologie/resultats/route.ts` (+ test), `saisieMessages.ts`,
`biology-library/statutPoseListe.ts` (+ test : recopie du CHECK, feuille),
`biology-library/statutPoseLecture.ts`, `components/biologie/ActeStatutResultat.tsx`,
`EstimeMesurePanel.tsx` (+ test, 8 cas), gardes `importeursBiologyLibrary` et
`lecteursResultatBiologique`, `e2e/helpers/db.ts`,
`scripts/banc-statuts-poses-deux-sessions.test.mjs`, `ci.yml`,
`scripts/wn-test-worktree.sh`, `PLAN_WELLNEURO.md` (F58), fragment changelog,
`SESSION_LOG.md`, ce handoff.

## Validations exécutées

- Banc à deux sessions sur base neuve : six courses vertes ; sous l'ancien
  verrou par ligne, trois rougissent (correction puis pose, pose puis
  correction, REPEATABLE READ).
- Vitest ciblé : 60 fichiers, 1 057 tests verts ; T1 vert.
- T2 (`--fast`) vert : 13 663 unitaires, 278 E2E, banc des statuts compris.

## Problèmes ouverts

- `scripts/wn-matrice-consommation.mjs`, `mentionne` : un spécificateur
  d'import se reconnaît par `includes`, si bien que `@/lib/x/statuts`
  reconnaît `@/lib/x/statutsPoses`. Contourné ici par le nom des modules ;
  défaut latent pour tout module dont le nom en préfixe un autre.
- F58 : les deux marques datées de la carte du compte rendu.

## Prochaine action exacte

Merge de la PR du code après CI et CodeRabbit ; déploiement constaté ; puis
la PR des deux marques datées ; puis F38 (migration de la remise patient).

## Interdits encore actifs

Aucun statut lu par le portail, le courrier au médecin, le scoring,
l'orientation ou l'IA ([[D-322]]) ; aucune valeur qualifiée ; pas de
migration sans demande explicite ; production en lecture par conteneur
seulement.
