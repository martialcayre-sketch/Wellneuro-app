# Audit 64/64 — clôture de montée en certification

Date d'audit : 2026-08-03.

## But

Établir la source de vérité opérationnelle du palier `62/64` avant toute suite
de campagne. Cet audit ne modifie aucun scoring, aucun seuil, aucune logique
clinique et n'ouvre aucun questionnaire. Il réconcilie seulement :

- le registre maître `instrument_registry.json` ;
- la matrice historique `docs/questionnaires-drive-mapping.md` ;
- l'état machine `.wn/state.json` ;
- les contrats runtime déjà en place (`questionnaires-catalog.ts`,
  `bibliotheque.ts`).

## Verdict

- **Source de vérité retenue pour le `64/64` :**
  `docs/claude/corpus/instrument_registry.json`.
- **Comptage réel du registre :** 64 questionnaires.
- **Répartition actuelle :**
  - `60` en `scoring_verifie`
  - `2` en `suspendu` : `Q_FIB_03`, `Q_PED_03`
  - `1` en `contenu_verrouille` : `Q_GEO_04`
  - `1` en `droits_verifies` : `Q_SOM_09`
- **Cible documentaire validée pour la campagne :** `64/64 clôturés`, et non
  `64/64 certifiés`.

## Écarts structurants constatés

### 1. La matrice Drive ne porte plus l'état de clôture

La colonne `Tests` de `docs/questionnaires-drive-mapping.md` reste un état
historique de comparaison Drive. Elle ne décrit plus le cycle de vie courant du
registre v2. Plusieurs questionnaires désormais `scoring_verifie` au registre y
restent `à faire` ou `n/a` sans que cela invalide leur clôture de montée.

Conséquence : le pilotage `64/64` ne doit plus être lu dans cette matrice seule.

### 2. `Q_PED_03` est suspendu malgré une ligne Drive « certifiée »

- Matrice : `tests = certifié`
- Registre : `statutCertification = suspendu`
- Runtime : entrée catalogue `actif: false`

Ce n'est pas une contradiction de données mais une décision de campagne : la
grille parent Conners reste fermée tant que sa reconstruction dimensionnelle
complète n'est pas décidée. Le lot suivant concerné est `LOT-02`.

### 3. `Q_GEO_04` est verrouillé en contenu tout en restant administrable en consultation

- Matrice : `tests = à faire`
- Registre : `statutCertification = contenu_verrouille`
- Runtime : `PASSATION_PRATICIEN` + entrée catalogue `actif: false`

Le contrat runtime est volontairement dissocié : la passation praticien est
permise, l'assignation reste fermée, et les bandes 27-30 / 21-26 / 10-20 / 0-9
restent non promues tant que leur source n'est pas prouvée. Le lot suivant
concerné est `LOT-01`.

### 4. `Q_FIB_03` et `Q_SOM_09` ne rouvrent pas le débat des « deux restants »

- `Q_FIB_03` est déjà `suspendu` et fermé ; il ne relève pas d'un arbitrage
  ouvert de cette campagne.
- `Q_SOM_09` est `droits_verifies` ; il reste explicitement hors lot tant que le
  recueil et la décision praticien n'autorisent pas une montée de scoring.

Conséquence : la campagne peut rester centrée sur `Q_GEO_04` et `Q_PED_03`
comme objets actifs de clôture.

## Contrat runtime vérifié

- `web/src/lib/bibliotheque.ts` fait foi pour la consommation produit :
  `estCertifie()` lit `def.scoring.certification.status === 'certifie'` et
  `IDS_ASSIGNABLES` ne comprend que les questionnaires `actif: true` porteurs
  d'une définition.
- `web/src/lib/questionnaires-catalog.ts` garde `Q_PED_03` et `Q_GEO_04` en
  `actif: false` : la route d'assignation reste donc fermée.
- `Q_GEO_04` est bien remis en `PASSATION_PRATICIEN` dans
  `web/src/lib/bibliotheque.ts`, ce qui confirme l'usage praticien borné sans
  réouverture patient.
- `scripts/check_questionnaire_certification.js` et
  `scripts/lib/verifier_registre_instruments.js` couvrent deux contrôles
  distincts : la matrice Drive contre les fixtures certifiées, puis le registre
  contre le catalogue et la bibliothèque. Ils ne prouvent pas, à eux seuls, une
  égalité de statut entre la matrice historique et le registre v2.

## Table de pilotage 64/64

> `Runtime` exprime la surface produit actuelle, pas un verdict clinique.

| Questionnaire | Registre | Matrice tests | Runtime | Lot cible |
|---|---|---|---|---|
| Q_ALI_01 | scoring_verifie | à faire | assignable | — |
| Q_ALI_02 | scoring_verifie | à faire | assignable | — |
| Q_ALI_03 | scoring_verifie | à faire | assignable | — |
| Q_CAN_01 | scoring_verifie | certifié | assignable | — |
| Q_CAN_02 | scoring_verifie | certifié | assignable | — |
| Q_CAR_01 | scoring_verifie | à faire | assignable | — |
| Q_FIB_01 | scoring_verifie | certifié | assignable | — |
| Q_FIB_02 | scoring_verifie | certifié | assignable | — |
| Q_FIB_03 | suspendu | certifié | catalogue_inactif | hors LOT-00 |
| Q_GAS_01 | scoring_verifie | certifié | assignable | — |
| Q_GAS_02 | scoring_verifie | certifié | assignable | — |
| Q_GAS_03 | scoring_verifie | à faire | assignable | — |
| Q_GEO_01 | scoring_verifie | certifié | assignable | — |
| Q_GEO_02 | scoring_verifie | certifié | assignable | — |
| Q_GEO_03 | scoring_verifie | à faire | passation_praticien + assignation_fermee | — |
| Q_GEO_04 | contenu_verrouille | à faire | passation_praticien + assignation_fermee | LOT-01 |
| Q_GEO_05 | scoring_verifie | à faire | passation_praticien + assignation_fermee | — |
| Q_GEO_06 | scoring_verifie | à faire | passation_praticien + assignation_fermee | — |
| Q_INF_01 | scoring_verifie | certifié | assignable | — |
| Q_INF_02 | scoring_verifie | certifié | assignable | — |
| Q_INF_03 | scoring_verifie | certifié | assignable | — |
| Q_INF_04 | scoring_verifie | certifié | assignable | — |
| Q_INF_05 | scoring_verifie | certifié | assignable | — |
| Q_MOD_01 | scoring_verifie | à faire | assignable | — |
| Q_MOD_02 | scoring_verifie | à faire | assignable | — |
| Q_MOD_03 | scoring_verifie | certifié | assignable | — |
| Q_NEU_01 | scoring_verifie | certifié | assignable | — |
| Q_NEU_02 | scoring_verifie | certifié | assignable | — |
| Q_NEU_03 | scoring_verifie | certifié | assignable | — |
| Q_NEU_04 | scoring_verifie | certifié | assignable | — |
| Q_NEU_05 | scoring_verifie | certifié | assignable | — |
| Q_NEU_06 | scoring_verifie | n/a | passation_praticien + assignation_fermee | — |
| Q_NEU_07 | scoring_verifie | certifié | assignable | — |
| Q_NEU_08 | scoring_verifie | certifié | assignable | — |
| Q_NEU_09 | scoring_verifie | certifié | assignable | — |
| Q_NEU_10 | scoring_verifie | certifié | assignable | — |
| Q_NEU_11 | scoring_verifie | certifié | assignable | — |
| Q_NEU_12 | scoring_verifie | certifié | exposé_via_alias_historique_Q_SOM_08 | — |
| Q_PED_01 | scoring_verifie | certifié | assignable | — |
| Q_PED_02 | scoring_verifie | certifié | passation_praticien + assignation_fermee | — |
| Q_PED_03 | suspendu | certifié | catalogue_inactif | LOT-02 |
| Q_PNE_01 | scoring_verifie | certifié | assignable | — |
| Q_SOM_01 | scoring_verifie | à faire | assignable | — |
| Q_SOM_02 | scoring_verifie | certifié | assignable | — |
| Q_SOM_03 | scoring_verifie | à faire | assignable | — |
| Q_SOM_04 | scoring_verifie | à faire | assignable | — |
| Q_SOM_05 | scoring_verifie | certifié | assignable | — |
| Q_SOM_06 | scoring_verifie | certifié | assignable | — |
| Q_SOM_07 | scoring_verifie | à faire | assignable | — |
| Q_SOM_09 | droits_verifies | n/a | assignable | hors LOT-00 |
| Q_STR_01 | scoring_verifie | certifié | assignable | — |
| Q_STR_02 | scoring_verifie | certifié | assignable | — |
| Q_STR_03 | scoring_verifie | certifié | assignable | — |
| Q_STR_04 | scoring_verifie | certifié | assignable | — |
| Q_STR_05 | scoring_verifie | certifié | assignable | — |
| Q_STR_06 | scoring_verifie | certifié | assignable | — |
| Q_STR_08 | scoring_verifie | certifié | assignable | — |
| Q_TAB_01 | scoring_verifie | certifié | assignable | — |
| Q_TAB_02 | scoring_verifie | certifié | assignable | — |
| Q_TAB_03 | scoring_verifie | à faire | assignable | — |
| Q_TAB_04 | scoring_verifie | à faire | assignable | — |
| Q_TAB_05 | scoring_verifie | certifié | assignable | — |
| Q_URO_01 | scoring_verifie | certifié | assignable | — |
| Q_URO_02 | scoring_verifie | certifié | passation_praticien + assignation_fermee | — |

## Décision de sortie du lot

- `LOT-00` est **livré** quand la lecture du produit et celle du registre ne se
  contredisent plus sur ce qu'elles prétendent mesurer.
- La suite ne doit pas « certifier davantage » dans ce lot :
  - `LOT-01` porte `Q_GEO_04` ;
  - `LOT-02` porte `Q_PED_03`.
- Le lot ne rouvre ni `Q_FIB_03` ni `Q_SOM_09`.

## Validations exécutées

- `node scripts/wn-campaign-audit.mjs --no-fail`
- `git diff --check -- docs/claude/campagnes/2026-08-03-cloture-certification-questionnaires-integration`

## Validation à rejouer si un prochain lot touche le runtime clinique

- `cd web && npm run scoring-check`
- `cd web && npm run check`
- `cd web && npm run test:worktree` si `questions.ts`, `questionnaires-catalog.ts`,
  `bibliotheque.ts` ou un garde registre est modifié.