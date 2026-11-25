# Handoff — 2026-11-25 — CI : les bancs d'outillage que seul `check` jouait

Lot `ci-bancs-gardes-merge-manquants` (file D, P1, lieu cloud), mené par la
passe de l'orchestrateur cloud `20261125-1108-orch` (`D-540`).

## Branche et état Git

- Branche `claude/clever-mayer-2ir1g9`, tirée d'`origin/main` à `30d2a0d1`.
- Deux commits de lot (étape CI + fragment, puis précision du commentaire et
  ce handoff), poussés ; PR en brouillon ouverte sur `main`.

## Objectif

Câbler dans `.github/workflows/ci.yml` les bancs hermétiques de
`bancs-outillage-check` (`web/package.json`) qui n'y tournaient pas, pour
qu'un garde d'outillage redevenu muet rougisse en CI et pas seulement à
`npm run check` (suite du motif d'`orchestration-3`).

## Décisions prises

- Écart recalculé (`bancs-outillage-check` \ fichiers cités par `ci.yml`) :
  13 bancs, les 10 de la fiche plus `workflows-environnements`,
  `wn-ancres-doctrine` et `context-pack-density`.
- Étape sœur, juste après « Gardes de merge et contrôle des registres
  (bancs) », plutôt qu'une ligne plus longue : le commentaire de l'étape
  existante reste exact. Aucun banc écarté comme douteux.
- Placée avant `setup-node` et `npm ci`, comme sa voisine : bancs sans
  dépendance npm.

## Fichiers modifiés

- `.github/workflows/ci.yml` (étape « Outillage de l'intégrateur, de
  l'orchestrateur et des paliers (bancs) »)
- `changelog.d/2026-11-25-ci-bancs-gardes-merge-manquants.md`
- `docs/claude/handoffs/2026-11-25-1120-ci-bancs-gardes-merge-manquants.md`

## Validations exécutées

- Les 13 bancs, un par un, réseau coupé (proxy factice) → tous verts ; puis
  sous `env -i` avec un `PATH` sans `gh` → tous verts.
- `parite-check-ci`, `ci-invariants`, `workflows-environnements` → 103/103 ;
  écart check → CI désormais vide ; YAML valide.
- `npm run check:rapide` → 0 ; `npm run check` (T1 complet) → 0.
- `wn-reviewer` (P1) : GO, ni P0 ni P1. P2-b (précision du commentaire sur
  l'herméticité et les outils du runner) corrigé dans le second commit ;
  P2-a ci-dessous.
- T2/T3 non joués : interdits à la passe cloud, non exigés (CI seule).

## Problèmes ouverts

- P2-a : bancs non joués sous Node 20 (le pas tourne sur le Node du runner,
  avant `setup-node`) ; aucun API postérieure à 20 trouvée, et l'étape
  voisine charge déjà une partie des mêmes modules. Le CI de la PR tranche.
- Piste hors périmètre (wn-reviewer) : un banc du sens check → CI pour
  `bancs-outillage-check` aurait empêché cet écart ; à inscrire comme lot
  séparé si le responsable le veut.

## Prochaine action exacte

CI (`node scripts/wn-attendre-ci.mjs <N>`), revue PR-Agent
(`node scripts/wn-revue-pr-agent.mjs <N>` → 0), un verdict par remarque,
« prête @<sha> » sur la PR, ligne `prete` à la boîte `integrateur`, `pr` sur
la ligne du lot. Merge : l'intégrateur.

## Interdits encore actifs

- Aucun merge, release-db, signature ni réponse à une question depuis la
  passe cloud ; pas de second lot.
- `wn-integrer.mjs` et les scripts testés hors périmètre ; aucun retrait de
  couverture du job, pas de refonte.
