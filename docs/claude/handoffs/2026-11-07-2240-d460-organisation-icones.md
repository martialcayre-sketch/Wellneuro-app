# Handoff — 2026-11-07 — D-460 : organisation du praticien au portail

## Branche et état Git

`feat/portail-organisation-icones`, worktree `.claude/worktrees/portail-organisation-icones`, partie de `fix/portail-defauts-rails-et-menus` (PR des défauts, à merger d'abord). Le `main` local n'est pas touché.

## Objectif

Appliquer au portail patient l'organisation du praticien, menus et icônes, à la demande du responsable.

## Décisions prises

- `D-460` (réservé), statut proposé : groupes, icônes, onglets d'en-tête, sous `WN_PORTAIL_MENU_ICONES` livré éteint.
- Gardés hors de ce lot, sans réponse du responsable : case « Plus » (Q48), tiroir à gauche, rail repliable (Q56), rail sur le questionnaire (Q59), menu « Profil ».
- Thème patient conservé : pas de rail sombre (A5-R2), pas de compteur (`D-333`).

## Fichiers modifiés

- `web/src/app/portail/layout.tsx`, `web/src/components/patient/menu/MenuMonEspace.tsx`, `menuDrapeau.ts`, `iconesMonEspace.tsx`, `organisationIcones.test.tsx`, `web/src/components/patient/barre-basse/BarreBasse.tsx`, `VuesRapidesPortail.tsx`.
- `docs/decisions/D-460.md`, `docs/FEATURE_FLAGS.md`, `changelog.d/2026-11-07-d460-organisation-icones.md` et ce handoff.

## Validations exécutées

Voir le corps de la PR : Vitest, T2 rapide local avec le drapeau armé, captures sur patient fictif.

## Problèmes ouverts

- Aucun constat en production : drapeau fermé.
- Drapeau non armé dans `playwright.config.ts`, pour ne pas changer les bases d'images.

## Prochaine action exacte

Merger la PR des défauts, rebaser celle-ci sur `main`, CI et revue, puis acceptation de `D-460` par le responsable.

## Interdits encore actifs

- Aucun drapeau posé ou retiré sans demande explicite du responsable.
- Aucun chiffre sur une surface patient (`D-333`). Pas de nom réel dans un fichier durable. Jamais le `main` local.
