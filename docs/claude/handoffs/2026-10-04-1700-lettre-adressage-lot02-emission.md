# Handoff — 2026-10-04 — Lettre d'adressage remise au patient : LOT-02, l'émission

## Branche et état Git

- Branche `ccr-233e115a-00c8c1`, repartie de `origin/main` (`59ef6fb`, merge
  de #1300). Un commit, PR à ouvrir.

## Objectif

Au clic « Valider pour diffusion », remettre au patient la lettre d'adressage
active la plus récente, dans la transaction de l'approbation, derrière un
drapeau éteint ([[D-262]], cadrage §3, B1-B3).

## Décisions prises

- Module unique `lib/correspondance/lettreAdressageRemise.ts` : même règle que
  le trigger (porteuse partagée, couverture non révoquée de plus haut `ordre`),
  `createMany` (idempotence de la base), insertion isolée par `SAVEPOINT` pour
  qu'un refus du trigger n'annule pas la diffusion.
- Même sort que les fiches quand le dossier les bloque ; rien sans orientation
  en tête du protocole.
- Annonce `document_remis` mutualisée : une par clic, fiches ou lettre.
- Drapeau `WN_LETTRE_ADRESSAGE_PATIENT`, actif seulement sur le chemin
  transactionnel ouvert par `WN_FICHES_ASSIETTE` (posé en production).

## Fichiers modifiés

- `web/src/lib/correspondance/lettreAdressageRemise.ts` (+ banc)
- `web/src/app/api/praticien/protocoles/diffusion/route.ts` (+ `route.lettre.test.ts`)
- Gardes : `lettresAdressageRemises.guard.test.ts` (émetteur nommé),
  `adressagesSignalAlerte.guard.test.ts` (troisième lecteur nommé)
- Docs : `FEATURE_FLAGS.md`, `DOSSIER_RGPD.md`, cadrage §5, changelog.

## Validations exécutées

- `npm run check` vert ; `tsc` vert ; Vitest ciblé (correspondance, diffusion,
  patient) vert.
- Sonde Postgres 16 locale, client Prisma réel : remise 1, rejeu 0, refus de la
  base isolé par le point de sauvegarde puis transaction committée, empreinte
  d'un texte accentué acceptée par le CHECK.
- E2E : job `e2e` du CI (pas de Playwright dans cette session).
- Revue `wn-reviewer` (verdicts dans la PR).

## Problèmes ouverts

- LOT-03 : espèce `lettre_adressage`, route portail, écran, retrait après
  révocation ; export d'accès sans les remises (comme les fiches) à trancher.
- Q1, Q2, Q3 de la campagne levée toujours ouvertes.

## Prochaine action exacte

1. CI vert, merge sur accord (code seul : aucune migration).
2. LOT-03, puis pose du drapeau constatée sur un dossier de test par identifiant.

## Interdits encore actifs

- Ne pas allumer `WN_LETTRE_ADRESSAGE_PATIENT` avant le LOT-03.
- Aucune identité réelle dans le dépôt ; production en lecture par conteneur.
