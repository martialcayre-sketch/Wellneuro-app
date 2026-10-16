# Handoff — 2026-10-16 — D-281 §5 : formulaire d'avant, lecture du programme protégée

## Branche et état Git

- Branche `fix/d281-formulaire-avant-lecture-protegee`, depuis `origin/main`
  8d994f1e (#1494), worktree `d281-lot3-portail` (session concurrente, cycle
  en git/gh direct).
- Un commit de lot ; PR, CI par `wn-attendre-ci`, revue CodeRabbit sur la
  tête, merge, déploiement constaté.

## Objectif

Plan §8, ligne « D-281, formulaire d'avant : la lecture du programme diffusé
au dépôt n'est pas protégée » ; file A, fiche t26 (revue `wn-reviewer` de
#1494, P2-2). Accord du responsable du 2026-10-16 pour corriger.

## Décisions prises

- La branche du formulaire d'avant (« oui » au programme) lit le programme
  diffusé par le repli de #1494 (`repli()`), protégé : en échec, capture sans
  programme, notification du praticien. « non » : aucune lecture.
- Aucun changement de règle : seule la perte du signalement (500) disparaît.

## Fichiers modifiés

- `web/src/app/api/portail/trust/signalement/route.ts` et
  `route.designation.test.ts` (trois cas : « oui », « oui » en échec, « non »)
- `docs/claude/PLAN_WELLNEURO.md` (§8 soldée),
  `changelog.d/2026-10-16-d281-formulaire-avant-lecture-protegee.md`

## Validations exécutées

- Suites de la route : 31 tests verts ; le cas « oui » en échec rougit sans
  le correctif (500 attendu 200), pour les deux entrées du chemin (sans
  désignation ; désignation fermée).
- T1 complet vert ; T2 (`--fast`) vert en 5 min 27 s, avant les retouches de
  revue (tests et changelog), T1 rapide rejoué ensuite.
- Revue `wn-reviewer` : Go, aucun P0/P1 ; trois P2 corrigés (deux formulations
  du changelog, un mock sans effet remplacé par un cas qui exerce la
  désignation fermée).

## Problèmes ouverts

- t25 (§8), arbitrages du responsable du 2026-10-16 : ouvrir l'avis
  « impliqué, élément non identifiable » sur le seul programme visé illisible,
  aménagement obligatoire ; pause des compléments maintenue si l'avis
  s'ouvrait un jour sur programme lisible. Migration accordée : PR 1 migration
  seule (contrainte `trust_aev_coherence_check`, trigger
  `trust_aev_avant_insertion`), release-db, PR 2 code. Lot suivant.
- Hors périmètre, inchangé : l'écart de bornes TRUST 100 / Fil et prévol.

## Prochaine action exacte

Merger cette PR une fois le CI et la revue lus, déploiement constaté, t26 →
fait sur la page de la file A ; puis cadrer t25 (migration).

## Interdits encore actifs

- Aucune migration ni `schema.prisma` dans ce lot.
- Garde de diffusion inerte jusqu'à la signature (M-1, D-281 §6).
- Un merge à la fois ; jamais pendant l'attente d'un `release-db`.
