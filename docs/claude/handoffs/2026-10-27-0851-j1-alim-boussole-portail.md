# Handoff — 2026-10-27 — File D, lots de code : J1-alim, la Boussole quitte le portail (D-365, H16)

## Branche et état du dépôt

- Branche `lot/j1-alim-boussole-portail`, partie de `origin/main` (eca887d8,
  #1726), `origin/main` fusionné dedans (jusqu'à #1728) ; worktree `file-d1-suite`, session concurrente, cycle en
  `git`/`gh` direct.
- Ni migration, ni drapeau, ni chemin clinique : pas de release-db.
- PR précédente de la séance : #1728 (bg), mergée.

## Objectif

Démonter la Boussole alimentaire côté portail (D-365 §1) : son résumé dans
le protocole, la page de l'aliment et la route patient. Le code praticien
reste en place, et `WN_C5_ENABLED` reste allumé.

## Décisions prises

- Constat préalable (D-365 §3), le 2026-10-27, par conteneur en lecture
  seule et en agrégats (D-298 §3) : 5 versions de protocole diffusées,
  0 portant une Boussole, 0 dossier concerné. Le lot se livre.
- Démontage à la manière de D-250 :
  - retirés : les surfaces (route API, page, composants), le montage dans
    l'accueil du protocole et dans la page alimentation, et les données
    Boussole de la route du protocole servi (`vue.boussoles`,
    `boussolesEnPause`) ;
  - conservés : les modules `lib/food-compass` (dont `patientReference.ts`
    et `patientSafe.ts`, désormais sans consommateur patient), les contrats
    V2 et V4 et le code praticien. Leur sort relève de « Ce qu'elle ne décide
    pas » de D-365.
- Gardes et listes : `components/patient-food-compass` est retiré des
  gardes gamification, météo et frontière du portail. Les deux gabarits de
  `masquageChemin.ts` qui visaient les routes retirées sont retirés aussi.
- `docs/FEATURE_FLAGS.md` : `WN_C5_ENABLED` ne gouverne plus que le côté
  praticien.

## Fichiers modifiés

- Supprimés : `web/src/app/api/portail/boussole/**`,
  `web/src/app/portail/[token]/alimentation/boussole/**`,
  `web/src/components/patient-food-compass/**`.
- Modifiés :
  - `web/src/app/api/portail/protocole/route.ts` et `.test.ts` ;
  - `web/src/lib/protocol/vuePatientSurLeFil.ts` et `.test.ts` ;
  - `web/src/app/api/praticien/ja/cycle/route.ts` ;
  - `web/src/components/patient-companion/PatientCompanionHome.tsx` et
    `.test.tsx` ;
  - `web/src/app/portail/[token]/alimentation/page.tsx` ;
  - `web/src/lib/observability/masquageChemin.ts` ;
  - trois gardes ;
  - `scripts/wn-matrice-consommation.mjs` (description de la Boussole : servie
    au praticien seul) et `docs/claude/MATRICE_CONSOMMATION.md`, régénéré ;
  - `docs/FEATURE_FLAGS.md`, `docs/claude/PLAN_WELLNEURO.md` (H16), le
    fragment `changelog.d/`, `SESSION_LOG.md` et ce handoff.

## Validations exécutées

- `tsc` vert ; suites du portail, du protocole, de l'observabilité, de
  food-compass et des gardes : 1 888 tests verts.
- T1 vert. T2 (`test:worktree -- --fast`) vert en 7 min 27 s, après une
  première passe rouge sur la matrice de consommation générée, régénérée
  depuis le code.

## Problèmes ouverts

- Constat du retrait en production après le déploiement : la page de
  l'aliment rend 404, la route patient n'existe plus, et l'accueil n'affiche
  aucune Boussole. Ensuite seulement, D-C5-01 à 04 soldées sans objet dans
  `DETTE_C5.md` (D-365 §4), par une PR de doc ; D-C5-05 reste ouverte.
- Modules `lib/food-compass` sans consommateur patient : à trancher avec la
  suppression du code C5 (hors D-365).

## Prochaine action exacte

CI, CodeRabbit sur la tête, verdict par commentaire, aucune release-db en
attente, merge `--match-head-commit`. Puis déploiement constaté, constat du
retrait, PR de doc des dettes et ligne de la page D.

## Interdits encore actifs

- Aucune migration sans accord ; aucun protocole servi touché.
- Production en lecture seule, depuis un conteneur ; aucun identifiant de
  dossier dans le dépôt.
- (e) et bb hors de cette séance.
- Aucun merge tant qu'un run `release-db` attend ; un merge à la fois.
