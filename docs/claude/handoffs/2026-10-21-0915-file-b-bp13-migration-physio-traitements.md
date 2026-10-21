# Handoff — 2026-10-21 — File B : BP-13, migration des données physiologiques et des traitements (D-335)

## Branche et état Git

- Branche `lot/bp13-migration`, partie d'`origin/main` (3cb4fad5, merge de
  #1614) puis remise à niveau sans conflit (fusions de #1619 et #1620,
  autorisées pour tout le lot), dans le worktree `bio-ingest-cloture`
  (session concurrente, cycle en git/gh direct).
- Mergée dans la journée par cette session : #1614 (D-335, décision,
  déclaration RGPD et texte patient v20 validés).

## Objectif

BP-13 (fiche F07, LOT-13), PR 1 de deux ([[D-266]] §11) : la migration seule
des données physiologiques déclarées et des traitements en cours, la clé de
traitement des pièces de constat, avec contrat négatif, effacement nommé et
banc. Le code (routes, formulaire du portail, panneau du cockpit, ligne de
vigilance, « à relire ») vient après la release-db constatée, sous
`WN_PHYSIO_TRAITEMENTS` éteint.

## Décisions prises

- Tables `donnees_physiologiques` (critère, réponse fermée ou mesure datée,
  source, ligne remplacée) et `traitements_en_cours` (nature, nom, dose,
  moment, motif, début et fin avec précision, prescrit par un autre
  soignant, source, ligne remplacée). Ajout seul ; une tête par critère et
  par fil : `FOR KEY SHARE` du dossier puis verrou consultatif 335 ;
  REPEATABLE READ refusé ; le patient ne retire que ses lignes et ne pose
  que sexe déclaré et statut menstruel ; suppression réservée à
  l'effacement du dossier (trigger de contrainte différé).
- `pieces_constats_praticien.id_traitement` (RESTRICT), CHECK `une_piece`
  sur trois clés (même nom), fonction des pièces réécrite : corps de BP-11
  repris à l'identique, branche traitement sous le même verrou que les
  actes de traitement.
- **Arbitrage du responsable (2026-10-21)**, sur la revue `wn-reviewer`
  (P1) : « fin après le début » compare la FIN de la période de la fin au
  début, pour qu'une fin moins précise que le début dans la même période
  passe ; deux cas admis et deux refusés au contrat.
- Routés à la PR 2 (fiche LOT-13) : troisième clé dans la lecture des
  pièces, normalisation des blancs Unicode, ordre canonique des écritures,
  READ COMMITTED seul.

## Fichiers modifiés

Migration `20261021100000_donnees_physiologiques_traitements_v1`,
`schema.prisma`, contrat `donnees_physiologiques_traitements_v1_negatif.sql`,
liste blanche du contrat `constats_praticien_v1_negatif.sql`, banc
`scripts/banc-physio-traitements-deux-sessions.test.mjs`, `ci.yml`,
`scripts/wn-test-worktree.sh`, `effacement.ts` (+ test), `DOSSIER_RGPD.md`
(nom de la migration), `PLAN_WELLNEURO.md` (F07), fiche LOT-13,
`CAMPAGNE.md`, fragment changelog, `SESSION_LOG.md`, ce handoff.

## Validations exécutées

- T3 vert avant la revue (7 min 35 s) : `migrate deploy`, `migrate diff`
  « No difference detected », les 57 contrats SQL dont le nouveau (quatorze
  promesses), tous les bancs à deux sessions dont le nouveau, build, E2E.
- T3 rejoué après le correctif de la revue et la course 8 : voir la PR.
- Vitest `patient/` vert (103 tests, dont l'ordre d'effacement).
- Revue `wn-reviewer` : go sous condition ; P1 corrigé sur arbitrage ;
  P2-6 (effacement commis contre une pose) levé par la course 8 du banc ;
  P2-2 à P2-5 routés à la PR 2.
- Non fait : aucune mutation jouée contre le contrat ou le banc (la base
  locale jetable a été refusée ; seul T3 monte une base).

## Problèmes ouverts

- Aucun dans ce lot. Revue CodeRabbit à trier sur la PR.

## Prochaine action exacte

CI vert et revue CodeRabbit sur la tête, liste des runs `waiting`, merge
avec `--match-head-commit`, puis release-db approuvée et déclenchée par le
responsable dans la foulée, sentinelle liée au run, constat par conteneur
(deux tables vides, RLS active, `id_traitement` présente). Ensuite la PR 2
du code BP-13, puis BP-15, puis le brouillon de la lettre cm (F52).

## Interdits encore actifs

`WN_DOCUMENT_MEDECIN_PATIENT` allumé, à ne pas éteindre ; ni pull, ni
rebase sans arbitrage (fusion de `origin/main` autorisée sans conflit pour
le lot) ; prod en lecture seule par conteneur `scalingo run -d` ; une
release-db à la fois ; aucune identité réelle, aucun texte clinique ni
libellé d'hypothèse au dépôt ; `signature(err)` seulement ; pas de merge sans
revue CodeRabbit sur la tête ; approbation et déclenchement de la release-db
sont des gestes du responsable.
