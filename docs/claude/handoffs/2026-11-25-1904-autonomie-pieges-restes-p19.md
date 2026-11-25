# Handoff — autonomie-pieges-restes, partie 19 : statut « transféré » fermé (2026-11-25)

## 1. Branche et état Git

- Branche `chore/autonomie-pieges-partie19`, tirée d'`origin/main` à e77418b0, qui contient le squash de la
  partie 18 (#2362, fdbc7825), dans le worktree `.claude/worktrees/orch-ci`. La branche de la partie 18 n'a pas
  été avancée : elle porte un commit propre.
- Commit tardif, juste avant le push (D-518).
- `merge_fait` de #2362 lu dans la boîte D du registre et passé à `traite`.

## 2. Objectif

Arbitrage 2 du responsable (2026-11-25) : `isClosedStatus` de `scripts/wn-campaign-audit.mjs` reconnaît
« transféré » comme un statut fermé. Le contournement « abandonné dans cette campagne — TRANSFÉRÉ », vu à la
clôture de « Doctrine exécutable » (`D-109`), n'est plus nécessaire.

## 3. Décisions prises

- **Lecture** : le mot « transféré » en tête du statut normalisé, avec ses accords, et rien d'autre :
  `/^transferee?s?(?![a-z])/`. « transférer », « transfert prévu », « non transféré » et « à transférer » restent
  ouverts. Les quatre préfixes historiques ne changent pas.
- **Alignement du sélecteur de `scripts/wn-campaign.mjs`** (R1 de `wn-reviewer`) : son `isClosedStatus` homonyme
  lit le statut de la même façon. Sans cet alignement, `activate` sans `--lot` et `next` auraient proposé comme lot
  à faire un lot que l'audit tient pour fermé. On aurait recréé le même piège, en miroir, et le contournement
  n'aurait pas vraiment pris fin. Un lot transféré reste « ni fait ni abandonné » : le compteur `done` ne le
  compte pas.
- **Risque** : P2. L'outillage gouverne une porte de clôture, d'où la revue `wn-reviewer` plutôt que
  `/code-review medium`. Le rapport JSON de l'audit sur le dépôt réel est identique avant et après : aucun statut
  posé ne commence par « transfér ».
- **Verdicts de la revue `wn-reviewer`** (GO sous réserve, rien de bloquant) :
  - R1, divergence du prédicat de `wn-campaign.mjs` : **corrigé** (alignement et test d'`activate`) ;
  - R2, une réserve écrite après le mot en tête passe pour fermée (« transféré en partie… ») : **écarté avec
    motif**. Le comportement est déjà celui de « livré en partie ». Une phrase ajoutée au PLAN §9 dit d'écrire la
    réserve après la date ;
  - R3, usages voisins du prédicat (ordinal dupliqué, campagne active fermée) sans témoin : **corrigé** (deux
    tests) ;
  - R4, R5 et R6 (banc, câblage, renvois de ligne) : constats conformes, sans suite ;
  - R7, le fragment disait « identique » sans préciser le format, et `D-109` y était présentée comme la source du
    contournement : **corrigé** (« rapport JSON », « vu à la clôture »).

## 4. Fichiers modifiés

- `scripts/wn-campaign-audit.mjs` : `isTransferredStatus`, appelé par `isClosedStatus`.
- `scripts/wn-campaign.mjs` : même lecture dans `isClosedStatus`.
- `scripts/wn-campaign-audit.test.mjs` (nouveau) : six tests.
- `scripts/wn-campaign.test.mjs` : un test (`activate` sans `--lot` saute un lot transféré).
- `web/package.json` (`bancs-outillage-check`) et `.github/workflows/ci.yml` (étape du banc) : câblage.
- `docs/claude/PLAN_WELLNEURO.md` §9 (« Règles de l'audit ») : règle, renvois de ligne mis à jour.
- `changelog.d/2026-11-25-audit-campagnes-statut-transfere.md`.

## 5. Validations exécutées

- Bancs `wn-campaign-audit.test.mjs` et `wn-campaign.test.mjs` : 13 sur 13 verts.
- Mutations, toutes rouges :
  - M1 (retirer l'appel dans l'audit) rougit les tests 1, 3, 5 et 6 ;
  - M2 (`startsWith("transfer")`) rougit les tests 2 et 3 ;
  - M3 (sans `^`) et M4 (sans lookahead) rougissent le test 2 ;
  - M5 (retirer l'appel dans `wn-campaign.mjs`) rougit le test d'`activate`.
- Rapport JSON de l'audit sur le dépôt, version `origin/main` contre version de la branche : identique (`cmp`).
- `parite-check-ci.test.mjs` : vert.
- T1 complet (`npm run check`) : code 0 (bancs d'outillage : 1 307 tests, 0 échec), joué avant les corrections de
  revue. Il est rejoué avant le commit.

## 6. Problèmes ouverts

- Les statuts déjà posés en « abandonné… TRANSFÉRÉ » restent tels quels : un statut passé ne se réécrit pas.
- Hérités de la partie 18, inchangés : la question d'un `mergeable=false` périmé juste après un changement de
  tête (à constater sur un cas réel) ; `--sha` à passer depuis l'intégrateur (reste 13-14).

## 7. Prochaine action exacte

1. T1 complet, commit, push, PR (`--body-file`), puis `node scripts/wn-attendre-ci.mjs <N>` en fond depuis la
   branche.
2. `node scripts/wn-revue-pr-agent.mjs <N>` → 0, avec un verdict par focus area.
3. « prête @<sha> » sur la PR et au registre (boîte `integrateur`, ligne du lot mise à jour), puis plus aucune
   écriture sur la PR (D-546).
4. Partie 20 : relevé, en lecture seule, des objets d'erreur bruts journalisés dans `web/src` (Prisma, routes
   patient), rendu au responsable avant toute règle. Puis les restes 13-14 : `sources-check` hors `GARDES_NODE`,
   `wn-integrer` sans preuve PR-Agent (avec `--sha` passé à `wn-attendre-ci`), fixture E2E `WN-SRC-0998`, dossiers
   `wn-repro-imp-*`.

## 8. Interdits encore actifs

- Ni migration, ni schéma, ni clinique, ni donnée patient. Pas de `prisma format`.
- Rien d'édité dans `web/src/lib/clinical/`. Aucune écriture en production ; aucun `workflow_dispatch` de
  `release-db`.
- Ne jamais supprimer une ligne des registres. Pas de compaction du journal (gel `D-372` §2).
- `orchestrateur/arret` : seule la parole du responsable le change.
- Aucune adresse de page privée dans le dépôt. Horodater en lisant l'heure système.
- Ne tuer aucun processus.
