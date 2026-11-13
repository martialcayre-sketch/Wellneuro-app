# Handoff — 2026-11-13 — Autonomie des sessions : sondes de suivi et messages (guetteur borné)

## Branche et état Git

- Branche `chore/autonomie-sondes` dans le worktree `.claude/worktrees/file-d-artefacts`, créée sur `origin/main`
  (62418456).
- Lot du carnet `autonomie-sondes-et-messages` (D-510), ordre 25, pris par File D le 2026-11-13.

## Objectif

Que les sessions soient prévenues plutôt que de sonder à la main, et que les messages entre sessions arrivent sans
approbation au terminal. La conception du cadrage « autonomie des sessions » nommait la pièce « guetteur versionné
et relais ».

## Décisions prises

- Aucune D-xxx : un outil de lecture seule, qui n'autorise ni ne merge rien.
- Le guetteur de l'intégrateur (hors dépôt, `guetter.mjs`) est versé, pas remplacé : son motif et sa clé sont repris
  à l'identique, et sa bascule revient à l'intégrateur.
- Ajout du code 2 (« aucune lecture aboutie ») : un guetteur hors ligne ne doit pas dire « rien vu ».
- Hors du lot :
  - `integrer.sh` (outil de l'intégrateur, hors dépôt), qui n'appelle pas `wn-revue-pr-agent.mjs` : piège n° 9, porté
    par la ligne `autonomie-pieges-restes`.
  - Le relais automatique (lancer le lot suivant du carnet) : la conception le rangeait avec le guetteur, mais il
    demande `claude --bg` et des bornes de dépense, donc un arbitrage.

## Fichiers modifiés

- `scripts/wn-guetteur.mjs`, `scripts/wn-guetteur.test.mjs` (neufs)
- `web/package.json` (`bancs-outillage-check`), `.github/workflows/ci.yml` (une étape)
- `docs/ROLES_MACHINES.md` (registre des messages : le guetteur, le constat `crossSessionInbound`)
- `changelog.d/2026-11-13-autonomie-sondes-guetteur.md` ; ce handoff.

## Validations exécutées

- `node --test scripts/wn-guetteur.test.mjs` : 30/30.
- `wn-reviewer` avant le push, sur le diff non commité : NO-GO pour un P1. Lancé par un lien symbolique, le script
  sortait en 0 sans rien lire, parce que le garde « exécuté directement » comparait des chemins non résolus.
  - P1 corrigé par `realpathSync`, le motif de `wn-sonde-release-db.mjs`, avec deux tests (lien, chemin relatif).
  - P2 corrigés :
    - la sonde `prete` garde les lignes `NOUVELLE` et `AUCUNE` de l'original ;
    - `--amorcer` en échec rend 2 ;
    - une réponse release-db sans liste est une erreur ;
    - la documentation cite l'écriture de `--amorcer` et les échecs comptés.
  - P2 écartés :
    - pagination release-db : plus de 100 runs en attente n'arrivent pas ;
    - options ignorées en silence : sans effet.
- T1 complet (`npm run check`) vert avant le correctif ; banc rejoué après.
- Sondes jouées pour de vrai, une lecture, sans attente :
  - `merge 2070` → 0, `MERGEE … commit=3092ddda` ;
  - `merge 2074` → 3 (PR ouverte) ;
  - `release-db` → 0, un run en attente d'approbation (geste du responsable) ;
  - `prete` sur une copie de la liste de l'intégrateur → 3 (déclarations déjà vues).
- Constat : `crossSessionInbound` vaut `"accept"` dans `~/.claude/settings.json`.

## Problèmes ouverts

- Bascule de l'intégrateur vers `scripts/wn-guetteur.mjs prete` : à son initiative.
- Relais automatique vers le lot suivant : à cadrer.

## Prochaine action exacte

1. CI, PR-Agent, « prête @<sha> », ligne `prete` au registre, carnet tenu.
2. Lot `autonomie-sondes-et-messages` à `fait` au merge.

## Interdits encore actifs

- Le guetteur reste en lecture seule ; il n'approuve aucune release-db et ne merge rien.
- Pas de bascule du guetteur en service sans l'intégrateur.
