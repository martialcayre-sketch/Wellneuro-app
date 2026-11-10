# Handoff — 2026-11-10 — « Comptes du cabinet » dans la feuille « Plus » (Q26)

## Branche et état Git

`fix/plus-comptes-cabinet`, worktree `.claude/worktrees/plus-comptes-cabinet`, partie d'`origin/main@2d4a3172`. Le `main` local n'est pas touché.

## Objectif

Solder l'oubli arbitré à Q26 de l'audit des rails et menus (2026-11-02) : la feuille « Plus » du cockpit mobile ne menait pas aux comptes du cabinet, que le rail porte depuis #1780. Demande du responsable : « Comptes du cabinet ».

## Décisions prises

- L'entrée prend dans `plusItems` la place qu'elle a dans le rail, après « Patients », même libellé, même icône (`Tally5`). Aucun drapeau : c'est une parité de navigation, sans écran neuf.
- Le banc compare la barre et la feuille au rail **rendu**, au lieu d'une liste recopiée : toute entrée future du rail absente du téléphone fait échouer le test. Seule « Synthèses » est propre au téléphone (D-324 §5).
- PR déclarée « prête @<sha> » à l'intégrateur ([[D-454]], amendement du 2026-11-08). Filet à vingt minutes.

## Fichiers modifiés

- `web/src/components/ui/MobileBottomNav.tsx` et `MobileBottomNav.test.tsx`.
- `docs/claude/PLAN_WELLNEURO.md` : ligne de dette du §8 soldée, compteur des soldées.
- `docs/claude/propositions/2026-11-01-portail-rails-et-menus/README.md` : réponse à Q26.
- `changelog.d/2026-11-10-plus-comptes-cabinet.md` et ce handoff.

## Validations exécutées

- Bancs `MobileBottomNav` et `SidebarRail` verts ; le nouveau test échoue sur la feuille d'`origin/main`, sans l'entrée.
- T1 vert. T2 rapide local : 16 609 tests unitaires et 357 E2E passés, aucun échec.

## Problèmes ouverts

- Le design system (artefact) note encore l'écart dans le guide de `MobileBottomNav` : à resynchroniser après le merge, sur demande.

## Prochaine action exacte

Merge par l'intégrateur sur la déclaration « prête ».

## Interdits encore actifs

- Aucun drapeau posé ou retiré sans demande explicite du responsable.
- Jamais le `main` local.
