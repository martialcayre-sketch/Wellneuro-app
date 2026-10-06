# Handoff — 2026-10-06 — BP-10, migration de la table des actes de lecture

## Branche et état Git

`feat/bp10-lectures-imports-biologiques-migration`, depuis `main` ebcb0117.
Quatre commits (7aa59414, ffac0894, 66d1d6c8, 326cd039). PR à ouvrir.

## Objectif

Créer la table seule (`D-087`, `D-266` §11). Elle trace l'acte de lecture
clinique d'un import biologique validé (`D-268`). Migration confirmée par le
responsable le 2026-10-06 (« Go migration »).

## Décisions prises

- Table `lectures_imports_biologiques` (`LectureImportBiologique`), en ajout
  seul, deux actes : `lecture` et `revocation`.
- Codes de révocation, liste fermée : `acte_pose_par_erreur`,
  `mauvais_import`, `lecture_a_refaire`.
- La base refuse :
  - un import d'un autre dossier ;
  - un autre praticien que celui du dossier (casse ignorée) ;
  - un import sans ligne validée, ou qui **garde une ligne à décider** ;
  - une seconde lecture active ;
  - une révocation hors des lectures de cet import.
- Verrou `FOR NO KEY UPDATE` sur l'import.
- Arbitrages du responsable, gravés en précision de `D-268` §5 :
  - lecture seulement sur un import entièrement décidé ;
  - les trois codes ;
  - une lecture de l'ancien praticien reste valable ;
  - le praticien actuel peut la révoquer ;
  - l'acte se pose au cockpit biologie ;
  - le praticien lit la restitution, pas le PDF (déjà purgé, `D-258`
    intacte) ;
  - sur un dossier clos, la carte n'existe que si elle est actionnable.

## Fichiers modifiés

- Migration `20261006150000_lectures_imports_biologiques_v1`.
- `schema.prisma`.
- Contrat `lectures_imports_biologiques_v1_negatif.sql` et son étape CI.
- `patient/effacement.ts` et son test.
- Garde `lecturesImportsBiologiques.guard.test.ts`.
- `DOSSIER_RGPD.md` (migration nommée, codes, « pas encore appliquée »).
- `DECISIONS.md` (précision `D-268` §5).
- Fiche LOT-10, `state.json`, fragment changelog.

## Validations exécutées

- Contrat vert en local ; 40 mutants tués sur 40.
- T1 vert.
- T3 complet vert sur 7aa59414, puis sur la tête finale (voir le corps de la
  PR).
- Revue `wn-reviewer` : GO.
  - P2 corrigés : verrou et `search_path` relus, commentaires, motif SQL de
    la garde.
  - P1 « dossier clos » tranché par le responsable.

## Problèmes ouverts

- La concurrence n'est pas éprouvée par le contrat (une seule session).
  Bancs à deux sessions avec la route.
- Le banc des adressages a probablement le même trou de motif
  `"public".` : non corrigé ici (hors lot).

## Prochaine action exacte

1. PR et CI (`wn-attendre-ci`), puis passe Codex lancée par le responsable.
2. Merge, puis `release-db` approuvée par le responsable.
3. Constat par conteneur.
4. PR de code sous drapeau, avec RGPD « appliquée » et LOT-10 coché.
   Consignes de l'écrivain : fiche LOT-10.

## Interdits encore actifs

- Aucun code consommateur avant l'application constatée.
- Aucune lecture de valeur.
- Pas de donnée patient réelle.
- `release-db` reste un geste humain.
