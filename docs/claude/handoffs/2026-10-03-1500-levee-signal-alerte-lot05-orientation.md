# Handoff — 2026-10-03 — Levée du blocage par signal d'alerte : l'orientation en tête du protocole (LOT-05)

## Branche et état Git

- Branche `ccr-233e115a-00c8c1`, base `main` (`e4adf46`, #1293 incluse). Un
  commit de lot + cette clôture.

## Objectif

Dernier lot de code de la campagne : quand un constat est adressé, le
protocole s'ouvre sur l'action « Consulter votre médecin » (`D-257` §8-9).

## Décisions prises

- Texte signé dans un module feuille (`orientationAdressage.ts`), lisible par
  le navigateur ; un banc relit `D-257` §9 au caractère près.
- **Exigée, pas injectée** par le moteur : `buildProtocolDraft` refuse un
  protocole qui ne s'ouvre pas sur elle, un texte modifié, ou l'identifiant
  réservé hors levée (qui logerait une quatrième action hors borne).
- Hors borne des trois (moteur et contrat patient) ; une orientation
  « ordinaire » choisie par le praticien reste possible et compte.
- Constructeur : bloc en lecture seule, hors de l'état éditable, posé en tête
  à la soumission (`active` en contrat V4).
- Côté patient : titre + plan minimal, comme toute action (contrat inchangé).

## Fichiers modifiés

- `web/src/lib/clinical-engine/orientationAdressage.ts` (+ banc, neuf)
- `web/src/lib/clinical-engine/protocolDraft.ts` (+ banc),
  `contenuPatientProtocole.ts`
- `web/src/components/patient-cockpit/ProtocolMiniBuilder.tsx` (+ banc)
- Cadrage §6, `docs/FEATURE_FLAGS.md`, `changelog.d/2026-10-03-orientation-medecin-protocole.md`

## Validations exécutées

- Bancs neufs verts ; mutation 6/6 tués ; `npm run check` et Vitest complet
  (voir PR). E2E : job `e2e` du CI.

## Problèmes ouverts

- `PatientCompanionHome` prend la première action ferme comme « action du
  jour » : levée ouverte, ce sera l'orientation — cohérent avec A2, à
  confirmer à l'usage.
- Le patient ne lit pas le plan idéal (« remettre le courrier ») : contrat
  patient inchangé, toutes actions confondues.
- Verdict `wn-reviewer` du LOT-04a toujours attendu.

## Prochaine action exacte

1. Mesure de production par conteneur détaché (agrégats) : dossiers porteurs
   d'un signal de rang `adressage`, couvertures écrites depuis le LOT-03.
2. Décision d'allumage de `WN_LEVEE_ADRESSAGE` par le responsable.

## Interdits encore actifs

- Drapeau éteint jusqu'à la mesure et l'ordre du responsable.
- Aucun autre lecteur ni écrivain de `adressages_signal_alerte` ; ni
  migration, ni cotation (`D-099`).
