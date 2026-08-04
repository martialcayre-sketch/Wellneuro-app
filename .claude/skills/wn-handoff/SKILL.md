---
description: Produit un handoff compact et réutilisable pour reprendre le travail dans une nouvelle session ou un autre agent. Seul skill à poser un fragment dans docs/claude/handoffs/.
argument-hint: "[write]"
disable-model-invocation: true
effort: low
---

# WellNeuro — handoff

!`cd "$(git rev-parse --show-toplevel)" && node scripts/wn-cycle.mjs`
!`cd "$(git rev-parse --show-toplevel)" && node scripts/wn-context-pack.mjs --format markdown`

Argument : `$ARGUMENTS`

## La fenêtre de clôture — lire le bloc de phase avant d'écrire

Le merge d'un lot est un squash : ce qui s'écrit sur la branche après lui n'est
plus dans l'ascendance de `main`. Le bloc de phase tranche donc où ce handoff
doit atterrir :

- `travail`, `pret-pr`, `pr-ouverte` — branche vivante, **fenêtre ouverte** : le
  handoff part dans la PR du lot, en même temps que l'entrée `SESSION_LOG` que
  produit `/wn-finish` <!-- mention-seule: wn-finish --> (skill à invoquer à la main).
  Aucune PR à créer ici.
- `apres-merge` avec « fenêtre de clôture ratée » — trop tard. Écrire depuis
  `main`, en PR de doc séparée. Ne jamais rebrancher sur la branche squashée :
  la PR suivante ré-embarquerait le lot précédent et GitHub ne créerait aucun
  run.

Ce skill n'ouvre ni branche ni PR de lui-même dans le cas nominal.

Le bloc ci-dessus rend l'état factuel ; il ne suffit pas. Ce que ce skill ajoute
— et qu'aucun script ne sait produire — est le reste : les décisions prises et
leur raison, les interdits encore actifs, la prochaine action exacte.
`/wn-context` <!-- mention-seule: wn-context --> affiche les faits et n'écrit rien ; **ce
skill est le seul à poser un fragment dans `docs/claude/handoffs/`**.

## Où le handoff atterrit — un fragment, jamais un fichier partagé

Il n'existe plus de `HANDOFF_CURRENT.md`. Le handoff est **un fichier par lot**,
nommé `docs/claude/handoffs/AAAA-MM-JJ-HHMM-slug-court.md`, sur le modèle de
`changelog.d/`. Motif : un fichier à créneau unique que deux branches réécrivent
entre en conflit à tous les coups — le 2026-08-04, il a coûté une PR de
réparation (#563) et deux handoffs perdus. Aucun fichier « courant » n'est
généré : **le handoff courant est le fichier le plus récent du dossier**.
Convention complète : `docs/claude/handoffs/README.md`.

Créer un handoff de moins de 120 lignes comprenant :

- branche et état Git ;
- objectif actuel ;
- décisions prises ;
- fichiers modifiés ;
- validations exécutées ;
- problèmes ouverts ;
- prochaine action exacte ;
- interdits encore actifs.

Sans `write`, afficher seulement. Avec `write`, **créer un nouveau fragment**
`docs/claude/handoffs/AAAA-MM-JJ-HHMM-slug-court.md` — ne jamais écraser un
fragment existant, chacun est la mémoire d'un lot. Ne pas modifier
`SESSION_LOG.md`.
