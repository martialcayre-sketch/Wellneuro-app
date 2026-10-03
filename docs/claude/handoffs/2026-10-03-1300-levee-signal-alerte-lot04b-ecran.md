# Handoff — 2026-10-03 — Levée du blocage par signal d'alerte : l'écran des signaux adressés (LOT-04b)

## Branche et état Git

- Branche `ccr-233e115a-00c8c1`, base `main` (`d6b73fa`, #1291 incluse). Un
  commit de lot + cette clôture. Arbre propre.

## Objectif

Rendre visible au praticien ce que le LOT-04a calcule : signaux adressés, leurs
lettres, la révocation par lettre ; mention réelle de la lettre d'adressage.
Tout derrière `WN_LEVEE_ADRESSAGE`, toujours éteint.

## Décisions prises

- La levée ouverte se lit sur la réponse du cockpit (`couverturesAdressage`
  présent), jamais devinée côté client.
- Bloc « Signaux adressés au médecin » distinct de « Ce qui suspend la
  décision » (qui ne porte plus que les ouverts, sans changement de code : la
  revue ne les y met plus).
- Révocation : motif obligatoire, une lettre visée, puis rechargement de la
  chaîne par le serveur — l'écran ne retire rien de lui-même.

## Fichiers modifiés

- `web/src/components/patient-cockpit/SignauxAdressesPanel.tsx` (+ banc, neuf)
- `web/src/components/patient-cockpit/ClinicalRuntimeSection.tsx` (+ banc)
- `web/src/components/patient-cockpit/AdressagePanel.tsx` (+ banc)
- `docs/FEATURE_FLAGS.md`, `changelog.d/2026-10-03-adressages-signal-alerte-ecran.md`

## Validations exécutées

- `npm run check` vert ; Vitest complet 664 fichiers verts.
- Bancs : panneau (toutes les lettres, motif exigé, lettre visée, erreur),
  mention levée ouverte/fermée, intégration cockpit (bloc présent/absent,
  POST de révocation exact puis rechargement).
- T2 E2E non jouable en conteneur cloud : job `e2e` du CI.

## Problèmes ouverts

- Verdict `wn-reviewer` du LOT-04a non encore reçu à l'écriture.
- Mesure de production avant allumage (agrégats, conteneur détaché).

## Prochaine action exacte

LOT-05 : action d'orientation `medical_referral` en tête du protocole, hors
borne des trois, non retirable, texte signé (`D-257` §9) ; puis mesure de
production et décision d'allumage.

## Interdits encore actifs

- `WN_LEVEE_ADRESSAGE` éteint jusqu'au LOT-05 inclus.
- Aucun autre lecteur ni écrivain de `adressages_signal_alerte`.
- Ni migration, ni cotation (`D-099`).
