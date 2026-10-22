# Handoff — 2026-10-22 — File B : BP-15, code des décisions de parcours (D-343)

## Branche et état Git

- Branche `lot/bp15-code`, partie d'`origin/main` 5e39a737, dans le
  worktree `bio-ingest-cloture` (session concurrente, cycle en git/gh
  direct).
- Mergées par cette session : #1642 (D-343), #1644 (migration seule).

## Objectif

PR 2 du lot BP-15 (LOT-15, fiche F08) : le code consommateur de
`decisions_parcours`, sous `WN_DECISIONS_PARCOURS` créé éteint, après le
constat par conteneur de la migration.

## Décisions prises

- Libellés du cockpit retenus tels quels par le responsable le 2026-10-22
  (consignés en mise à jour de D-343).
- D-343 §9 tenu à l'écran : la date de première diffusion recevable de la
  version s'affiche dans son en-tête, à côté des débuts réels, sans être
  remplacée (`lireVersionsDiffusees` rend une `Map` version → date).
- Journal des erreurs par `classeEtCode` (précédent BP-13) : `signature`
  vit dans la bibliothèque biologique, hors frontière D-306 ; jamais
  `err.message`.
- Le routé E2E de la relecture de la PR 1 reste sans objet : aucun E2E ne
  pose de décision.

## Fichiers modifiés

- `web/src/lib/decisions-parcours/` : `liste.ts`, `drapeau.ts`,
  `messages.ts`, `demande.ts`, `fils.ts`, `lecture.ts`, `ecriture.ts`,
  `garde.ts` ; tests `demande`, `fils`, `jourZeroEtEmpreintes`,
  `lecteursDecisionsParcours.guard`
- `web/src/app/api/praticien/decisions-parcours/route.ts` et `.test.ts`
- `web/src/components/decisions-parcours/DecisionsParcoursPanel.tsx`
- `web/src/components/FichePatientPanel.tsx`,
  `web/src/app/dashboard/patients/[idPatient]/page.tsx` (montage sous
  drapeau)
- `web/src/lib/protocol/calendriersPersistes.ts` (`lireVersionsDiffusees`)
- `docs/FEATURE_FLAGS.md`, `docs/DECISIONS.md` (mise à jour de D-343),
  fiche LOT-15, campagne, plan F08, fragment `changelog.d/`,
  `SESSION_LOG.md`

## Validations exécutées

- Constat par conteneur de la migration (#1644) : appliquée en une
  tentative, aucune migration en échec, table vide, RLS sans politique,
  quatre triggers, treize CHECK, garde d'isolement présente.
- `tsc --noEmit` vert ; vitest ciblé 38/38 ; T1 `check:rapide` vert. Le
  reste (`npm run check`, T2, relecture) est noté dans la PR.

## Problèmes ouverts

- Conditions de l'allumage : test d'intégration de la route sur une vraie
  base (pose, correction, retrait, deux poses concurrentes sur un fil de
  révision, formes réelles des refus reconnus à leur code) ; information
  du patient relue avant l'ouverture du suivi (BP-21a).

## Prochaine action exacte

PR du code, CI en tâche de fond, verdicts CodeRabbit sur le sha de tête,
runs `release-db` en attente listés, merge ; puis le brouillon de la lettre
cm (F52), hors dépôt ou sous forme opaque, que le responsable corrige et
signe.

## Interdits encore actifs

- Ne pas éteindre `WN_DOCUMENT_MEDECIN_PATIENT`.
- Pas de pull, merge ni rebase sans arbitrage, sauf la fusion
  d'`origin/main` dans la branche du lot sans conflit (autorisée pour
  BP-15).
- Production en lecture seule, par conteneur `scalingo run -d`.
- Une seule release-db à la fois : lister les runs `waiting` avant chaque
  merge.
- Aucune identité réelle, aucun texte clinique ni libellé d'hypothèse dans
  le dépôt ; jamais `err.message` dans les journaux.
- Pas de merge sans revue CodeRabbit sur le sha de tête
  (`--match-head-commit`).
