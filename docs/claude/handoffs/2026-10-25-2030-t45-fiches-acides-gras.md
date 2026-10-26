# Handoff — t45 : fiches des acides gras au catalogue, migration (D-370)

## Branche et état du dépôt

- Branche `lot/t45-fiches-acides-gras`, worktree `d281-lot3-portail`, partie
  de `origin/main` (c703ec8f). **Migration de données** :
  `web/prisma/migrations/20261025140000_catalogue_biologie_acides_gras`
  (22 INSERT dans `biology_analytes`, aucun schéma, aucune unité au
  vocabulaire). Horodatée après `20261024220000` (t44).

## Objectif

Ligne « Fiches des acides gras absentes du catalogue » du plan (file A,
D-356 §6) : donner une fiche aux acides gras lus en production et restés
« inconnu ». Premier lot sur deux : les fiches ; le second (résolveur)
attend l'application constatée.

## Décisions prises

- Constat par conteneur du 2026-10-25 (lecture seule, agrégats) : un profil,
  un import, 20 acides en %, indice oméga 3 et trois rapports sans unité ;
  94 analytes ; aucun acte V105 sur les acides gras.
- Arbitrages du responsable (questions à options), consignés dans `D-370` :
  provenance `saisie_praticien` ; 20 acides + 2 rapports ; nom courant seul ;
  rapports en « ratio », « autre » comme AA/EPA ; aucun panel (lot et
  décision à part, source à désigner) ; NABM « aucun acte » / « valeur
  calculée » ; AA/EPA et LA/DGLA préparés par leurs opérandes — au second
  lot (remarque CodeRabbit, D-087, arbitrage) —, oméga 6 / oméga 3
  « opérandes absents » ; au résolveur, les libellés imprimés plus
  des noms usuels (liste à préparer et soumettre au second lot).
- Deux lots, sans alternative : `analyte_propose` a une clé étrangère
  `RESTRICT` vers `biology_analytes.code`.

## Fichiers modifiés

- Migration `20261025140000_catalogue_biologie_acides_gras/migration.sql`.
- Contrat `web/prisma/checks/cb_catalogue_niveau_1_donnees.sql` (116, 22
  fiches ligne par ligne, rien d'autre sur elles, aucun item de panel).
- `web/src/lib/biology-library/candidatsNabm.ts` (+ test : 116, comptes) ;
  `compositionsPreparees.ts` (LA/DGLA et oméga 6/oméga 3 en « opérandes
  absents », + test) ;
  `import/resolverLibellesV1.test.ts` (116 unités lues) — la table et la
  signature du résolveur **inchangées**.
- `docs/DECISIONS.md` (D-370), `docs/claude/PLAN_WELLNEURO.md`,
  `changelog.d/2026-10-25-t45-fiches-acides-gras.md`, SESSION_LOG.

## Validations exécutées

- Vitest ciblé (biology-library, composants biologie, clinical) : 2316
  verts. T1, T2, T3 : résultat dans la PR.

## Problèmes ouverts

- D-370 : libre sur main et dans le diff de #1693 (D-361 à D-363, à
  renuméroter par sa session) au commit ; revérifier juste avant le merge.
- Second lot : compositions AA/EPA et LA/DGLA ; libellés imprimés et noms
  usuels au résolveur, re-signature sur instruction — après la release-db
  constatée.
- Entrée d'acides dans des panels : lot et décision à part, source à
  désigner par le responsable.

## Prochaine action exacte

CI, CodeRabbit sur la tête, aucune release-db d'une autre session en
attente, merge, release-db approuvée par le responsable, sentinelle,
constat par conteneur (22 fiches, 116 analytes), puis le second lot.

## Interdits encore actifs

- Un merge à la fois, aucun auto-merge ; jamais d'image antérieure à
  257807e3 ; ne pas toucher `lot/file-a-suivant`,
  `j3-12d-badges-preuve-masques`, `lot/t23-restes-verificateur`, ni les PR
  des autres sessions (#1693) ; hors périmètre : m38, WN_CONSTAT_BESOIN,
  signature NABM de TP/INR.
