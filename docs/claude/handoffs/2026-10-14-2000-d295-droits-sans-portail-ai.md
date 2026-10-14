# Handoff — 2026-10-14 — D-295 : droits sans portail, courriels, garde « traité », lecture datée de ai

## Branche et état Git

`docs/droits-sans-portail-ai`, dans le worktree
`.claude/worktrees/droits-sans-portail`, partie d'`origin/main` 85b95dcc
(#1446). Un commit de doc, aucun code. Rebasée sur `origin/main` après le merge
de #1448 (D-294).

## Objectif

Trancher les dettes §8 « Information des patients et droits » ouvertes par la
revue CodeRabbit de #1446, et le geste clé de la lettre ai.

## Décisions prises

- D-295 §1 : sans accès au portail, un courriel venu de l'adresse du dossier
  est instruit directement ; sinon, réponse à l'adresse du dossier pour
  confirmation. Amende D-283 §6.
- §2 : courriels de demande et de réponse à la durée du dossier.
- §3 : garde de code sans migration, `traite` refusé si la réponse est vide.
- §4 : ai date la seule première lecture.

## Fichiers modifiés

- `docs/DECISIONS.md` (D-295), `docs/DOSSIER_RGPD.md` (rubrique 9),
  `docs/claude/PLAN_WELLNEURO.md` (dette §8, fiche H51).
- Fragment `changelog.d/2026-10-14-d295-droits-sans-portail-ai.md`,
  SESSION_LOG, ce handoff.

## Validations exécutées

- Après rebase sur #1448 (D-294) : T1 complet (`npm run check`) vert, code 0.
  Lot de doc : pas de T2.

## Problèmes ouverts

- La lettre cj (non poussée, copie principale) porte D-291 : elle prend D-296.
- La lettre ai reste à écrire (D-xxx avant la place 3), migration probable.

## Prochaine action exacte

1. Après le merge de #1448 : rebase (accord du responsable), T1 complet vert,
   push, PR (`--body-file`), CI en fond, revue CodeRabbit lue, merge.
2. Lot de garde « traité » (file A, sans migration) ; lettre ai.

## Interdits encore actifs

- Aucune migration avant l'essai de restauration (porte 8, D-289).
- Rien n'est servi au patient hors de sa place dans la file C (D-288).
- Aucune identité réelle au dépôt.
