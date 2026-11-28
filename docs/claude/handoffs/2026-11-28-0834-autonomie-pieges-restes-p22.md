# Handoff — autonomie-pieges-restes, partie 22 : la preuve de revue rejouée par l'intégrateur, clôture du lot (2026-11-28)

## 1. Branche et état Git

- Branche `chore/autonomie-pieges-partie22`, tirée d'`origin/main` à dc626fe3 après le merge de la partie 21
  (#2402, squash 9e4b672d), dans le worktree `.claude/worktrees/orch-ci`. La branche de la partie 21 n'a pas été
  avancée.
- Commit tardif, juste avant le push (D-518).
- `merge_fait` de #2402 (`20261127-2240-integrateur-d-2402`) trouvé à `lu` (passe cloud) : passé à `traite` le
  2026-11-28 à 07:30Z. Une seule autre ligne `emis` dans la boîte D : `20261128-0811-orchestrateur` (lot
  `besoins-recherche-g10` bloqué par le réseau cloud). Elle demande un geste du responsable, je l'ai laissée à
  `emis` et je l'ai signalée en session.

## 2. Objectif

Dernier reste des parties 13-14 (arbitrage 7 du 2026-11-25) : `wn-integrer` mergeait sur la parole de la
déclaration, sans rejouer la preuve PR-Agent ni le CI sur le sha. Ensuite, clôture du lot.

## 3. Décisions prises

- Forme arbitrée le 2026-11-27 (mémoire `autonomie-pieges-restes-arbitrages-2026-11-25`), appliquée sans la
  reposer. Les points laissés au code par le §6 de la partie 21 :
  - **code 27**, nommé `revue` (24 évité) ; un seul code pour le CI et PR-Agent, les motifs les distinguent
    (`ci rend <c>`, `wn-revue-pr-agent rend <c> et la déclaration servie ne cite pas…`) ;
  - **place** : après les gardes de D-546 (déclaration, origine, focus, parole, délai, bail), avant le
    déploiement. Le délai non échu refuse donc toujours sans lancer de script ;
  - **tous les modes**, `--sans-merge` et `--filet` compris, comme la garde 26 ;
  - **repli lu dans la déclaration servie seulement** (`repliD448`). « D-448 » avec des bornes (D-4480 ne vaut
    pas), plus « wn-reviewer GO @<x> » où `<x>` fait 7 à 40 caractères hexadécimaux, n'est pas prolongé par un
    autre caractère hexadécimal et est un préfixe du sha. Un GO cité dans un autre commentaire ne compte pas.
  - `wn-attendre-ci` est lancé sans `--delai` : à la déclaration, le CI est déjà vert, donc il rend la main
    tout de suite.
- **Clôture du lot** : c'était le dernier reste. Le `mergeable=false` périmé après un changement de tête (hérité
  de la partie 18) n'est qu'un point **à observer sur un cas réel**, pas du code. Il est routé au §6. La ligne
  du carnet passe à `fait` au merge.

## 4. Fichiers modifiés

- `scripts/wn-integrer.mjs` : code 27, `repliD448`, étape « preuve de revue » avant le déploiement, en-tête.
- `scripts/wn-integrer.test.mjs` : 16 cas neufs.
- `docs/ROLES_MACHINES.md` (liste des gardes de l'intégrateur) et `docs/claude/REGLES_PR_MERGE.md` (codes de
  refus).
- `changelog.d/2026-11-28-autonomie-pieges-partie22.md`, ce handoff.

## 5. Validations exécutées

- `node --test scripts/wn-integrer.test.mjs` : 90 sur 90.
- Quatre mutations, toutes rouges : PR-Agent ignoré (5 rouges), repli toujours refusé (1), étape CI retirée (1),
  sha du GO non comparé (1). Fichier restauré à l'identique (`cmp`).
- T1 complet (`npm run check`) : joué avant le commit, résultat dans la déclaration de la PR.

## 6. Problèmes ouverts

- Ce qui reste du lot, à observer seulement : un `mergeable=false` périmé juste après un changement de tête
  ferait sortir `wn-attendre-ci` en 5. Avec la garde 27, l'intégrateur refuserait alors à tort, puis
  réussirait au passage suivant. Rien à coder tant que ce n'est pas observé.
- Hérités, hors de ce lot : le banc `wn-codex-avis.test.mjs` et ce qui reste de `gate-codex-p0.test.mjs`
  (rang 131), la conversion des 25 sites patient (rang 132), les `wn-codex-p0-test-*` du tmpdir (rang 131).
- Une file qui retient le repli de D-448 doit maintenant l'écrire **dans sa déclaration** : un commentaire de
  verdict séparé ne suffit plus pour l'intégrateur.

## 7. Prochaine action exacte

1. T1 complet à 0, commit, push, PR (`--body-file`), `node scripts/wn-attendre-ci.mjs <N>` en fond.
2. `node scripts/wn-revue-pr-agent.mjs <N>` → 0, verdict pour chaque focus area, puis « prête @<sha> » sur la PR
   et au registre (boîte `integrateur`), avec la mention « lot clos ». Plus aucune écriture sur la PR ensuite
   (D-546).
3. Au `merge_fait` : l'accuser. Le lot est fait, la file D prend au carnet le lot `pret` suivant (D-510).

## 8. Interdits encore actifs

- Ni migration, ni schéma, ni clinique, ni donnée patient. Pas de `prisma format`.
- Rien d'édité dans `web/src/lib/clinical/`. Aucune écriture en production ; aucun `workflow_dispatch` de
  `release-db`.
- Ne jamais supprimer une ligne des registres. Pas de compaction du journal (gel `D-372` §2).
- `orchestrateur/arret` : seule la parole du responsable le change.
- Aucune adresse de page privée dans le dépôt. Horodater en lisant l'heure système.
- Ne tuer aucun processus. Ne supprimer aucun reste de tmpdir sans accord (les `wn-codex-p0-test-*` n'en ont pas).
