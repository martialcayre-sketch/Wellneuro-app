# Handoff — 2026-10-23 — M-2 : signature de la doctrine du cockpit (porte 6)

## Branche et état Git

- Branche `m2-signature-doctrine-cockpit`, partie d'`origin/main` (9b5f825a),
  worktree `j3-12e-ingestion` (session concurrente, cycle en git/gh direct).
- Documentation seule, une PR.

## Objectif

Consigner la signature M-2 de D-333 et D-334 (file D, b01, rang 2) et lever
la porte 6.

## Décisions prises

- D-333 et D-334 signées telles quelles le 2026-10-23, sur question à
  options, niveau médian ordinal de D-334 §4 compris.
- Correctif de la stabilité métabolique (D-333 §3) : lot J1-cockpit-a,
  premier lot de code après le merge, rien avant lui ; mention « Non motivé,
  décision due », source présente et source manquante, natures des trois
  objets ; couverture par source lue dans la route, rien sous `lib/equilibre`.
- Ordre : J1-cockpit-a, J1-cockpit-b (provenance, garde de frontière, Q10,
  Q9), lots Q (Q2-Q4 d'abord, puis chacun après son préalable), y en
  parallèle.

## Fichiers modifiés

- `docs/DECISIONS.md` (statuts de D-333 et D-334)
- `docs/claude/PLAN_WELLNEURO.md` (porte 6 au §1, F59, H32)
- `changelog.d/2026-10-23-m2-signature-doctrine-cockpit.md`
- `docs/claude/SESSION_LOG.md`

## Validations exécutées

- T1 complet (`npm run check`) et anti-secrets : voir la PR.
- Constat dans le code : `FichePatientPanel.tsx` (jauge « Stabilité
  métabolique », sans mention) et `api/praticien/equilibre/route.ts`
  (valeur servie, aucune source).

## Problèmes ouverts

- Porte 4 (source du poids égal) : la mention « Non motivé, décision due »
  reste jusqu'au texte motivé du responsable.
- Lettre o (J2-jourN), porte 16 (ce, au), porte 25 (BF-5) tiennent encore
  leurs lots.

## Prochaine action exacte

Après le merge : pages de suivi (file D b01 fait, b19 sans porte 6 ; file A
r3_07 à faire, porte 6 retirée de r3_01, r3_04, r3_05, r4_09, lignes des
lots Q), mémoire audit-instruments ; puis ouvrir J1-cockpit-a en session
neuve.

## Interdits encore actifs

- Rien sous `lib/equilibre`, aucune table, aucune version, aucun seuil,
  aucun écran avant le merge de la signature.
- La mention de la stabilité ne se retire qu'avec la porte 4 levée.
