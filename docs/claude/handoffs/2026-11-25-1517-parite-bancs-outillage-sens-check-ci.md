# Handoff — 2026-11-25 — Parité check → CI pour `bancs-outillage-check`

Lot `parite-bancs-outillage-sens-check-ci` (file D, P1, lieu cloud), mené par
la passe de l'orchestrateur cloud `20261125-1509-orch` (`D-540`).

## Branche et état Git

- Branche `claude/clever-mayer-3k7yqj`, tirée d'`origin/main` à `8325f908`.
- Un commit de lot (banc, fragment, ce handoff), poussé ; PR en brouillon
  ouverte sur `main`.

## Objectif

Étendre `scripts/parite-check-ci.test.mjs` pour exiger le sens check → CI,
borné à `bancs-outillage-check` (`web/package.json`) : chaque banc de cette
liste doit être joué par un `node --test` de `.github/workflows/ci.yml`. Un
banc ajouté à la liste sans câblage CI rougit en local (l'écart corrigé par
#2337).

## Décisions prises

- Lecture côté CI par la même dérivation que le sens existant
  (`commandesCiAvantNpm`) : un banc câblé après `setup-node` ou dans un autre
  job compte comme absent. L'écart est vide sur `origin/main` (56 bancs).
- Côté npm, seules les formes `cd ..` et `node --test …` sont admises dans
  `bancs-outillage-check` ; toute autre forme est refusée, pas ignorée
  (constat moyen de `wn-reviewer`, corrigé dans le lot).
- Le reste de `check` (lint, type-check, Vitest…) reste hors du sens inverse.

## Fichiers modifiés

- `scripts/parite-check-ci.test.mjs` (en-tête, `bancsOutillageHorsCi`,
  quatre tests)
- `changelog.d/2026-11-25-parite-bancs-outillage-sens-check-ci.md`
- `docs/claude/handoffs/2026-11-25-1517-parite-bancs-outillage-sens-check-ci.md`

## Validations exécutées

- `node --test scripts/parite-check-ci.test.mjs` → 80/80, dont la
  contre-épreuve par mutation (premier banc retiré de `ci.yml` en mémoire →
  signalé seul) et le refus des formes inconnues.
- `npm run check:rapide` → 0 ; `npm run check` (T1 complet) → 0, rejoué après le
  correctif de revue.
- `wn-reviewer` (P1) : GO ; constat moyen (forme de commande inconnue
  ignorée en silence) corrigé ; faux rouges mineurs (séparateurs `;`/`||`,
  option à valeur séparée, glob) acceptés : tous bruyants, désormais refusés
  explicitement.
- T2/T3 non joués : interdits à la passe cloud, non exigés (banc d'outillage).

## Problèmes ouverts

- Hors périmètre (dette antérieure, relevée par `wn-reviewer`) : l'en-tête
  du banc et la JSDoc de `commandesCiAvantNpm` parlent encore du job `verify`, la lecture
  porte sur `controles` depuis le 2026-10-27 ; le commentaire de l'étape
  « Parité » de `ci.yml` dit « L'inverse n'est pas contrôlé », désormais vrai
  sauf pour `bancs-outillage-check`. À inscrire comme lot de doc si voulu.
- Faiblesse sœur, hors périmètre : `commandesNodeBash` (sens CI → check) ne
  lit que `run: node`/`bash` en tête de ligne.

## Prochaine action exacte

CI (`node scripts/wn-attendre-ci.mjs <N>`), revue PR-Agent
(`node scripts/wn-revue-pr-agent.mjs <N>` → 0), un verdict par remarque,
« prête @<sha> » sur la PR, ligne `prete` à la boîte `integrateur`, `pr` sur
la ligne du lot. Merge : l'intégrateur.

## Interdits encore actifs

- Passe cloud : ni merge, ni release-db, ni T2/T3, ni lot suivant.
- `ci.yml` et la liste des bancs hors périmètre de ce lot.
