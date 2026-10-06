# Handoff — 2026-10-06 — BP-10, acte de lecture d'un import validé (code)

## Branche et état Git

`feat/bp10-lecture-import-biologique-code`, depuis `main` 0b49401e. Deux
commits : eb98c2c1 (code) et 8ddd9bb5 (P2 de revue). PR à ouvrir.

## Objectif

Code consommateur de `lectures_imports_biologiques` (`D-268`), derrière
`WN_BIO_LECTURE_ENABLED`, éteint. La migration a été appliquée le
2026-10-06 à 18:37:49 UTC et constatée par conteneur (`one-off-951`).

## Décisions prises

- Carte `import_biologique_a_lire` :
  - non écartable (clé refusée par `cleCarteValide`, bouton masqué) ;
  - non acquittable par lecture, sans plafond ;
  - placée après les consultations du jour ;
  - échec de calcul affiché, même sur un Fil vide ;
  - rail sans compteur dans ce cas.
- Acte au cockpit biologie, sous la restitution. Révocation par code fermé.
- Écrivain unique `import/acteLecture.ts` : une instruction hors transaction
  (READ COMMITTED). Une course perdue est nommée par relecture, sinon 500.
- Le drapeau exige l'import. Éteint : aucune requête, route en 503.
- GET compte rendu : actes rendus sous drapeau, échec isolé.

## Fichiers modifiés

- Route `api/praticien/biologie/import/lecture`.
- `acteLecture.ts`, `lectureImport.ts`.
- `fil/cartes.ts`, `fil/route.ts`, `FilDuJour.tsx`, `SidebarRail.tsx`.
- `LectureImportBiologique.tsx`, `ImportCompteRenduPanel.tsx`.
- Provider et page.
- Gardes : écrivain et lecteurs, BP-01.
- Banc `web/scripts/banc-lectures-imports-deux-sessions.test.mjs` et ses pas
  CI et T3.
- RGPD (« appliquée »), `FEATURE_FLAGS.md`, fiche LOT-10, fragment changelog.

## Validations exécutées

- T1 vert sur les deux commits.
- T3 complet vert sur eb98c2c1 :
  - 689 fichiers Vitest, 11 808 cas ;
  - 245 E2E ;
  - banc à deux sessions joué.
- T2 sur 8ddd9bb5 : voir le corps de la PR.
- Banc à deux sessions local : 4 sur 4.
- Revue `wn-reviewer` : GO, 6 P2 corrigés.
- Isolation de production `read committed`, sans réglage par base ni par
  rôle (`one-off-5510`).

## Problèmes ouverts (au responsable)

- Un dossier `actif=false` n'a pas de carte : c'est le régime commun du Fil.
- La carte mène à l'onglet Trajectoire sans désigner le compte rendu.
- `poserActeLecture` n'est pas éprouvé de bout en bout contre PostgreSQL : le
  banc joue du SQL brut, la route est éprouvée sur des mocks.

## Prochaine action exacte

1. PR, `wn-attendre-ci`, passe Codex, merge.
2. Allumage de `WN_BIO_LECTURE_ENABLED` : geste du responsable. Tous les
   imports déjà validés produiront leur carte (§8).
3. Constat d'usage en agrégats (`D-266` §12).

## Interdits encore actifs

- Aucune lecture de valeur.
- BP-10 précède BIO-INGEST LOT-04 (§11) : LOT-04 attend l'étage 1 en
  production et constaté.
- Pas de donnée patient réelle.
- Aucun code de révocation neuf sans décision et migration.
