# Handoff — 2026-10-04 — Lettre d'adressage remise au patient : LOT-03a, l'écran du portail

## Branche et état Git

- Branche `ccr-233e115a-00c8c1`, repartie de `origin/main` (`ff44872`, merge
  de #1306). PR à ouvrir.

## Objectif

Servir au patient le courrier remis ([[D-262]], cadrage §3-§4) : route portail,
écran, espèce de lecture, retrait après révocation, lien de l'accueil — sous
`WN_LETTRE_ADRESSAGE_PATIENT`, éteint.

## Décisions prises

- LOT-03 découpé : 03a (portail patient, ce lot), 03b (aperçu praticien de la
  lettre au GET de diffusion et dans le jeton — condition de la pose).
- Servi : la remise la plus récente (`ordre`) ; « retirée » quand la lettre ne
  porte plus de couverture `adressage` non révoquée (calcul à la lecture) ;
  « indisponible » si l'empreinte rejouée diffère. Texte seulement si servie.
- Phrase signée recopiée au caractère près (banc relisant le cadrage) ; texte
  de lettre exempté de la garde anxiogène, inscrit à la carte de
  `vocabulaire.ts`.
- Impression : en-tête et liens masqués, seule la lettre s'imprime.

## Fichiers modifiés

- `lib/correspondance/lettreServicePatient.ts`, `api/portail/lettre-adressage/route.ts`,
  `portail/[token]/courrier-medecin/page.tsx`, `components/patient/lettre-adressage/*`,
  `components/patient-companion/LienCourrierMedecin.tsx`, `questionnaires/page.tsx`
- `lib/portail/lecturesAttendues.ts`, `api/portail/lectures/route.ts`
- Gardes : `portailLecturesPatient.guard.test.ts`, `adressagesSignalAlerte.guard.test.ts` ;
  `observability/masquageChemin.ts` (chemin de l'écran)
- `lib/documents/vocabulaire.ts` (carte), docs, changelog.

## Validations exécutées

- `npm run check` vert ; `tsc` vert ; suite Vitest complète (`test:siin57`)
  verte après ajout du chemin à `masquageChemin.ts` (rouge avant : la garde a
  vu le nouvel écran).
- E2E : job `e2e` du CI (pas de Playwright ici).
- Revue `wn-reviewer` (périmètre auth portail) : verdicts dans la PR.

## Problèmes ouverts

- LOT-03b (aperçu praticien), condition de la pose.
- E-mail pour une lettre révoquée pendant sa remise ; export d'accès sans les
  remises — à trancher.

## Prochaine action exacte

1. CI vert, merge sur accord. 2. LOT-03b. 3. Pose sur ordre, constat sur un
dossier de test par identifiant.

## Interdits encore actifs

- Ne pas allumer `WN_LETTRE_ADRESSAGE_PATIENT` avant le LOT-03b.
- Aucune identité réelle dans le dépôt.
