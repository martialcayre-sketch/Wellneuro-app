# Handoff — t07b : « Mon équilibre » dans l'aperçu praticien

## Branche et état du dépôt

- Branche `t07b-apercu-equilibre`, partie de `origin/main` 892f0948.
  Worktree `d281-lot3-portail`. #1574 (t05c) ouverte en parallèle : conflit
  attendu sur `SESSION_LOG.md`, garder les deux entrées.

## Objectif

Reste de la dette t07 (`DETTE_UX_RESIDUELLE.md`) : accueil et détail de
« Mon équilibre » absents de l'aperçu praticien. Arbitrage du responsable
(2026-10-19) : les ajouter, lecture seule, sans migration.

## Décisions prises

- Composition extraite telle quelle de `api/patient/equilibre` vers
  `lib/equilibre/lecturePatient.ts` (`lireEquilibrePatient`), partagée par la
  route patient et la route miroir `api/praticien/apercu-patient/equilibre`
  (NextAuth, scope praticien, 404 unique, journal au gabarit littéral). Pas
  `api/praticien/equilibre` : niveaux de preuve et identité.
- `fetchUrl?` sur `MonEquilibreAccueil` et `MonEquilibreDetail` (patron de
  `ConsultationScreen`) ; `ConsultationScreen` en aperçu offre « Voir Mon
  équilibre », la demande de modification reste masquée.
- `PatientPreview` : état local consultation → accueil → détail, remis à
  « consultation » à chaque ouverture.
- Pas de D-xxx : restitution inchangée, aucun chiffre ajouté.

## Fichiers modifiés

- `web/src/lib/equilibre/lecturePatient.ts` (nouveau),
  `web/src/app/api/patient/equilibre/route.ts`.
- `web/src/app/api/praticien/apercu-patient/equilibre/route.ts` + test (nouveaux).
- `web/src/components/PatientPreview.tsx` + test (nouveau),
  `web/src/components/patient/ConsultationScreen.tsx`,
  `MonEquilibreAccueil.tsx`, `MonEquilibreDetail.tsx`.
- `web/e2e/portail-parcours.spec.ts` : l'étape d'aperçu attendait le bouton
  masqué ; elle parcourt désormais accueil et détail par la route miroir.
- `docs/claude/MATRICE_CONSOMMATION.md` régénéré : le catalogue de scoring passe
  de 49 à 48 surfaces indirectes — la route patient n'importe plus le scoring
  elle-même, elle passe par `lecturePatient`.
- Plan, changelog, SESSION_LOG. Les registres de la campagne HC-F ne sont
  pas touchés : le plan fait foi depuis le 2026-10-14 (revue CodeRabbit).

## Validations exécutées

- Vitest ciblé (aperçu, routes patient et aperçu, composants patient,
  `lib/equilibre`, portail) : 2878 verts ; garde du bundle client verte.
- T1 complet vert ; T2 vert (282 E2E, 7 min) après mise à jour de l'E2E
  d'aperçu — le premier T2 rougissait sur l'ancienne attente, comme prévu.

## Problèmes ouverts

- `MonEquilibreDetail` garde un prop `email` qu'aucun appelant ne passe plus
  (reste mineur de t07, non touché).

## Prochaine action exacte

PR, CI, CodeRabbit sur la tête, merge après #1574, déploiement constaté ;
t07 → fait sur la page de suivi de la file A.

## Interdits encore actifs

- Aucun chiffre au portail hors restitution existante (D-106) ; aucune
  décision clinique sans D-xxx.
