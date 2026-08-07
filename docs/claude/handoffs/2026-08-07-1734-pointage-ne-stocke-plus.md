# Handoff — 2026-08-07 — Le pointage ne stocke plus ce qui se recalcule

## Branche et état Git

- `claude/wellneuro-workflow-tokens-5x6jyy`, repartie d'`origin/main` (`4d8e6de`).
- Diff : scripts d'outillage + `.wn/state.json`. Aucun fichier `web/src/`.

## Objectif

`.wn/state.json` a conflicté sur deux des trois PR du 2026-08-07 et contenait
des champs faux par construction. Le rendre fusionnable et véridique.

## Décisions prises

- **Découper `next_action` en tableau de lignes** plutôt que de le sortir du
  fichier. Le sortir vers les fichiers de campagne serait plus propre mais
  toucherait tous les consommateurs ; la forme en tableau suffit à supprimer les
  conflits, et reste rétrocompatible.
- **Supprimer le bloc `git` au lieu de le corriger.** Un champ qui se recalcule
  en une commande ne se stocke pas : il ne peut alors plus dériver. Corollaire
  assumé — `analyserPointage`, écrit le matin même (LOT-D), disparaît : il
  détectait une dérive qui ne doit pas exister.
- **Réduire `wn-etat-reel.mjs` plutôt que le supprimer**, malgré son absence
  totale d'appelants (aucun workflow, skill ni hook ne l'invoque). Sa
  suppression est une décision distincte, hors périmètre.
- Découpage de `next_action` **mécanique**, aux frontières de phrase. Le LOT-01
  (#575) voulait un découpage *éditorial* (« ce qui est clos part dans
  l'historique ») : c'est un autre geste, qui demande de juger ce qui est clos.
  Il reste dû.

## Fichiers modifiés

`scripts/wn-cycle.mjs` (retrait `analyserPointage` + bloc `git`, `reparer()`
exporté et paramétré) · `scripts/wn-cycle.test.mjs` (−4 cas, +5 cas) ·
`scripts/wn-campaign.mjs` (import de `wn-state.mjs`) · `scripts/wn-etat-reel.mjs`
et son banc (comparaisons `git.*` retirées) ·
`scripts/wn-github-orchestrator.mjs` (lecture des deux formes) ·
`.wn/state.json` (forme).

## Validations exécutées

- `node --test` sur les trois bancs : **54/54**.
- **Preuve du gain** : deux branches modifiant des passages différents de
  `next_action` → `CONFLIT` en forme ancienne, `fusion PROPRE` en forme
  nouvelle (banc jetable, `git merge-tree --write-tree`).
- Réversibilité du découpage : `' '.join(next_action)` rend les 6 023 caractères
  d'origine, au caractère près.
- `node scripts/wn-cycle.mjs --appliquer` : aucun bloc `git` réécrit.
- `wn-github-orchestrator` affiche `next_action` inchangé depuis le tableau.
- `wn-check-automation.sh` et `wn-kit-doctor` verts ; T1 vert.

## Problèmes ouverts

- **Découpage éditorial de `next_action`** (clos vs en vol) : toujours dû,
  hérité du LOT-01 #575.
- **`wn-etat-reel.mjs` n'est appelé par personne.** Le garder, le brancher ou le
  supprimer est une décision non prise.
- **`main` local ahead 50 / behind 51** — inchangé, arbitrage humain.
- `wn-attendre-ci.mjs` ne propose pas de remède pour « aucun run créé ».

## Prochaine action exacte

Ouvrir la PR, lire `verify`, merger selon le régime courant.

## Interdits encore actifs

- Pas de `pull`/`merge`/`rebase` automatique sur le `main` divergent.
- Ne pas réintroduire de champ recalculable dans `.wn/state.json`.
