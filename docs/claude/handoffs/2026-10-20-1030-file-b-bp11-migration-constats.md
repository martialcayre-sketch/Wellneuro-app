# Handoff — 2026-10-20 — File B : BP-11, migration des constats (D-331)

## Branche et état Git

- Branche `migration/bp11-constats`, partie d'`origin/main` (9085ca13, merge
  de #1589), dans le worktree `bio-ingest-cloture` (session concurrente,
  cycle en git/gh direct).
- Mergée dans la journée par cette session : #1589 (D-331, décision,
  déclaration RGPD validée par le responsable le 2026-10-20).

## Objectif

BP-11 (fiche F06, LOT-11), PR 1 de deux ([[D-266]] §11) : la migration seule
des constats du praticien, avec son contrat négatif, son effacement nommé et
son banc. Le code (route, lecture, « à relire », écran sous
`WN_BIO_CONSTAT`) vient après la release-db constatée.

## Décisions prises

- Tables `constats_praticien` (actes `pose`/`retrait`, `hypothese_code`
  `HYP_…`, verdict, motif fermé par verdict, note, `a_revoir_le`,
  `id_constat_remplace` unique, `structure_sha256`, praticien, date) et
  `pieces_constats_praticien` (constat, dossier, résultat **ou** réponse).
- Un seul constat en vigueur par hypothèse et par dossier : verrou
  consultatif de l'hypothèse (espace 331) après `FOR KEY SHARE` du dossier ;
  pose qui désigne la tête, retrait de la tête seule ; REPEATABLE READ
  refusé.
- Pièces : écrites dans la transaction du constat (`xmin` du constat =
  transaction courante ; un constat écrit dans un point de sauvegarde refuse
  ses pièces) ; résultat tête de fil sans annulation active, sous les
  verrous de BP-09 ; passation VALID ou AMBIGUOUS (doctrine des cinq
  statuts), `FOR SHARE` contre l'invalidation concurrente.
- `confirmee` et `non_retenue` : au moins une pièce, contrôle différé en fin
  de transaction (trigger de contrainte).
- La base ne refuse pas une date « à revoir le » passée : la route le fera.
- Arbitrages du responsable du 2026-10-20 pour la suite : BP-13, BP-15 et
  F52 (mémoire de session ; fiches à écrire).

## Fichiers modifiés

Migration `20261020100000_constats_praticien_v1`, `schema.prisma`, contrat
`constats_praticien_v1_negatif.sql`, `ci.yml`, `effacement.ts` (+ test),
`DOSSIER_RGPD.md`, `PLAN_WELLNEURO.md` (F06), fiche LOT-11, `CAMPAGNE.md`,
fragment changelog, `SESSION_LOG.md`, ce handoff.

## Validations exécutées

- Base neuve : `migrate deploy`, `migrate diff` sans dérive ; contrat vert
  (seize promesses) ; les 77 contrats du CI verts.
- Dix-sept mutations rougissent toutes le contrat (tête, retrait, praticien,
  transaction, validité, annulation, tête de fil, retrait sans pièce, verrou
  de BP-09, verrou de passation, motifs, forme `OR` des motifs, pièces
  requises, note `btrim/1`, RLS, colonne de valeur, garde du constat effacé).
- Course à deux sessions sur la tête : avec le verrou, la seconde pose
  attend et est refusée (une tête) ; sans lui, elle passe (deux têtes).
- Deux transactions réelles : pièce ajoutée après coup refusée ;
  `confirmee` sans pièce refusé au COMMIT.
- T1 complet vert ; vitest `patient/` et `bio-parcours/` verts.

## Problèmes ouverts

- Aucun dans ce lot. Revue CodeRabbit et `wn-reviewer` à trier sur la PR.

## Prochaine action exacte

Merger sur CI vert et revue de tête, approuver la release-db sur la tête de
`main` (geste du responsable), sentinelle, constat par conteneur, puis PR 2
du code BP-11 ; ensuite fiches BP-13 et BP-15, brouillon de la lettre cm.

## Interdits encore actifs

Aucune écriture en base hors release-db approuvée ; une release-db à la
fois ; aucune identité réelle ni texte clinique au dépôt ;
`WN_DOCUMENT_MEDECIN_PATIENT` allumé, à ne pas éteindre.
