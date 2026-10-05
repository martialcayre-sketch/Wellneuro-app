# Handoff — 2026-10-05 — BIO-PARCOURS : lot courant réaligné sur BP-02

## Branche et état Git

`docs/bio-parcours-lot-courant-bp02`, partie de `main` (333ab6ba). Ce
changement est de la gouvernance seule.

## Objectif

Corriger une incohérence relevée à la clôture de BIO-INGEST LOT-03 (#1318) :
le `lot_courant` de BIO-PARCOURS valait encore LOT-01 (BP-01), alors que
BP-01 est terminé (#1314).

## Décisions prises

Le lot courant passe à LOT-02 (BP-02, constat d'usage en agrégats, lecture
seule), conformément à l'arbitrage du responsable du 2026-10-05 : BP-02 après
BP-01, BP-26 en parallèle, toute assistance bloquée sans BP-26.

## Fichiers modifiés

- `CAMPAGNE.md` de BIO-PARCOURS : `statut`, `mise_à_jour`, `lot_courant` et
  une phrase sous « Lots ».
- `.wn/state.json` : `parallel_campaigns[].active_lot`.
- `ACTIVE_CAMPAIGN.md`, régénéré par `wn-cycle --appliquer`.
- `changelog.d/2026-10-05-bio-parcours-lot-courant-bp02.md`, ce handoff et
  l'entrée `SESSION_LOG.md`.

## Validations exécutées

`wn-cycle`, `check_no_secrets`, `npm run check`, puis le CI de la PR.

## Problèmes ouverts

- BP-02 coexiste avec BIO-INGEST LOT-07 sans conflit : BP-02 est en lecture
  seule, sans modèle Prisma ni frontière biologique.
- Restent ouverts : la remise en forme de `BIOFLOW_ROADMAP.md`, la dette
  auto-merge et les copies anciennes d'un identifiant de dossier.

## Prochaine action exacte

Selon l'ordre arbitré : remise en forme de la roadmap, puis la décision
préalable au LOT-07. BP-02 se lance sur le feu vert du responsable.

## Interdits encore actifs

- Aucune surface ni aucune assistance sans BP-26.
- BP-02 : agrégats seulement, sans identifiant, mesurés par conteneur.
