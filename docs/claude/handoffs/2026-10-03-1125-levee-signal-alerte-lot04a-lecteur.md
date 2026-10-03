# Handoff — 2026-10-03 — Levée du blocage par signal d'alerte : la chaîne C1 lit la couverture (LOT-04a)

## Branche et état Git

- Branche `ccr-233e115a-00c8c1`, PR **#1291**, base `main` (`81dd1aa`, #1290
  incluse). Tête `7e9f4e0` + cette clôture. Arbre propre.
- CI verte sur `7e9f4e0` (`controles`, `e2e`, `verify`).

## Objectif

Faire lire par la chaîne C1 les couvertures écrites depuis le LOT-03, derrière
un drapeau neuf `WN_LEVEE_ADRESSAGE`, **éteint** — aucun dossier ne change
d'état à la livraison.

## Décisions prises

- LOT-04 scindé : 04a (moteur, lecteur, réponse cockpit), 04b (écran).
- Partition ouverts / adressés : un constat d'anamnèse couvert sort de
  `safetyFindings` / `safetyFindingIds`, reste porté par
  `review.safetyFindingsAdresses` et `decisionCard.safetyFindingAdresseIds`
  (champs ABSENTS quand vides : empreintes des cartes existantes inchangées).
  La carte ne porte que des identifiants, jamais lettres ni dates.
- Effet indésirable jamais levé par une lettre.
- Lecteur unique `lireCouverturesAdressage` : porteuse passée par l'appelant
  depuis la même requête que l'anamnèse, non révoqué, lettre relue, ids
  validés ; tout écart écarte (fail-closed). Partagé par les quatre
  constructions (cockpit ×2, vérificateur, rejeu), compté par une garde.
- Drapeau éteint jusqu'au LOT-05.

## Fichiers modifiés (PR #1291)

- `web/src/lib/clinical-engine/` : `adressagesSignalAlertePrisma.ts` (neuf),
  `safetyFindings.ts`, `safetyFindingSource.ts`, `chaineC1.ts`,
  `clinicalReview.ts`, `decisionCard.ts`, `types.ts`, `verifierChaineC1.ts`,
  `rejeuCarteDecision.ts` + bancs ; garde `couverturesAdressageAppelants`.
- `web/src/app/api/praticien/cockpit/route.ts` + banc ;
  `web/src/lib/clinical/adressageFeatureFlag.ts` ; garde « qui lit ».
- `docs/FEATURE_FLAGS.md`, `docs/DOSSIER_RGPD.md`, cadrage §6,
  `changelog.d/2026-10-03-adressages-signal-alerte-lecteur.md`.

## Validations exécutées

- `npm run check` vert ; `next build` vert (avec `DATABASE_URL` locale).
- Vitest complet : 663 fichiers, seul échec = drapeau non documenté, corrigé
  et rejoué vert.
- Mutation : 11/11 tués (dont le vérificateur, par la garde des appelants).
- Sonde Prisma réelle sur Postgres local migré, transaction annulée :
  adressage révoqué exclu, autre porteuse vide.
- T3 E2E non jouable en conteneur cloud ; job `e2e` du CI vert.
- Revue `wn-reviewer` : lancée, verdict non encore intégré à cette clôture.

## Problèmes ouverts

- Mesure de production (dossiers bloqués, lettres consignées depuis le
  LOT-03) à faire par conteneur détaché, en agrégats, avant d'allumer.
- Drapeau allumé, une révocation fait dériver une carte déjà diffusée
  (`carte_derivee`, l'écran patient s'éteint) : voulu, à expliquer à l'écran
  au 04b.

## Prochaine action exacte

1. Intégrer le verdict `wn-reviewer` (commit de suivi si besoin).
2. LOT-04b : écran (ouverts seuls dans « Ce qui suspend », bloc « Signaux
   adressés » avec toutes les couvertures et un bouton de révocation par
   couverture, texte réel de `AdressagePanel`), T2 exigé.

## Interdits encore actifs

- `WN_LEVEE_ADRESSAGE` ne s'allume pas avant le LOT-05.
- Aucun autre lecteur ni écrivain de `adressages_signal_alerte`.
- Pas de modification de la cotation signée (`D-099`), pas de migration.
