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

## Arbitrages du responsable (2026-10-06, sur la PR #1347)

- Dossiers inactifs : sans carte, régime du Fil (précision de `D-268` §8).
- Lien direct vers le compte rendu : lot suivant (`FILE_ATTENTE.md`).
- Avant le merge : passe Codex par le responsable. Le banc du vrai écrivain
  contre PostgreSQL est ajouté (`scripts/banc-ecrivain-lecture-deux-requetes.test.ts`,
  CI et T3).
- Allumage après constat : compter les imports validés sans lecture par
  conteneur, puis poser la variable, puis vérifier son effet.

## Problèmes ouverts

- Une fixture du banc de l'écrivain (`PAT_BANC_ECR_…`) reste dans la base
  locale de dev de la copie principale, laissée par un essai raté : la garde
  refuse le nettoyage par `psql`. Elle est inerte, et son identifiant est
  propre à ce run.

## Prochaine action exacte

1. Passe Codex (le responsable), verdicts, puis merge.
2. Allumage de `WN_BIO_LECTURE_ENABLED` : geste du responsable. Tous les
   imports déjà validés produiront leur carte (§8).
3. Constat d'usage en agrégats (`D-266` §12).

## Interdits encore actifs

- Aucune lecture de valeur.
- BP-10 précède BIO-INGEST LOT-04 (§11) : LOT-04 attend l'étage 1 en
  production et constaté.
- Pas de donnée patient réelle.
- Aucun code de révocation neuf sans décision et migration.
