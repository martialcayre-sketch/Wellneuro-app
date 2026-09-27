# Handoff — 2026-09-27 — Fiches d'assiette : droits des sept notices déposées

## 1. Branche et état Git

`wn-fiches-assiette-droits-notices`, worktree
`.claude/worktrees/deploy-anti-recul-lot1`, partie de `origin/main` à
`7ed667f0` (#1240). À merger une fois `7ed667f0` constaté en service, un merge à
la fois.

## 2. Objectif

Consigner au registre ce que le dépôt des sept fiches a rendu vrai : leurs
notices passent `rightsStatus: verified`, comme le prévoit `D-251` §2 au lot où
la version adaptée est ingérée.

## 3. Décisions prises

- **Seul `rightsStatus` bascule**, sur les sept notices seulement.
  `clinicalReviewStatus` reste `not_reviewed` : aucune décision ne le relie à la
  validation d'une fiche, et aucune fiche n'est encore validée.
- **Le README du corpus est corrigé** : il affirmait que toutes les notices
  restaient `to_verify`.
- **Hors périmètre, laissé tel quel.**
  - Le commentaire de `catalogueConduitesV1.ts` parle des « 507 notices
    `to_verify` ». Il porte sur les sources de conduites, pas sur les Fiches MY.
  - Le décompte « 391 notices » en tête du README du corpus est ancien.

## 4. Fichiers modifiés

- `docs/claude/corpus/source_registry.json` : sept lignes `rightsStatus`.
- `docs/claude/corpus/README.md` : la phrase sur `rightsStatus`.
- `changelog.d/2026-09-27-fiches-assiette-droits-notices.md` (fragment de
  changelog).
- `docs/claude/handoffs/2026-09-27-1811-fiches-assiette-droits-notices.md` (ce
  handoff).
- `docs/claude/SESSION_LOG.md` (entrée de clôture).

## 5. Validations exécutées

- **Le diff du registre** compte exactement sept lignes, toutes
  `to_verify → verified`, toutes sur les sept `sourceId` visés. Le script de
  bascule refusait d'écrire autrement.
- **Un seul lecteur de `rightsStatus` dans le dépôt : `wn-context-pack.mjs`**
  (recherche dans le dépôt). Il signale G0 en attente tant qu'une notice reste
  `to_verify`, et c'est toujours le cas pour 500 d'entre elles : sa sortie ne
  change pas. Aucun usage clinique ni produit ; les outils du corpus, les
  vérificateurs de registres, les routes et les gardes ne lisent pas ce champ.
- **Le dépôt des sept fiches est constaté en production par conteneur**, en
  lecture seule : 7 versions v1, 0 acte.
- T1 : voir la PR.

## 6. Problèmes ouverts

- **Les sept fiches attendent la relecture du praticien.** Rien n'est validé,
  rien n'est remis.
- **Le `RAG_INTERNAL_SECRET` de `web/.env.local` n'est pas celui de la
  production.** Le README des outils du corpus suppose le contraire. Le dépôt a
  lu le secret de production sur Scalingo au moment de l'appel, sans l'afficher
  ni l'écrire.

## 7. Prochaine action exacte

Merger cette PR après le constat du déploiement de `7ed667f0`. Ensuite, lot 7 de
`D-251` (migration M2, autorisée).

## 8. Interdits encore actifs

- « Un merge à la fois » (D-248).
- Aucun texte de Fiche MY ni brouillon IA au dépôt, en PR, au journal ou au
  terminal : le dépôt est public.
- Le secret de production ne s'injecte qu'à l'exécution. Il ne s'affiche pas et
  ne s'écrit nulle part.
- Pas d'ouverture du drapeau `WN_FICHES_ASSIETTE` avant trois choses : la
  validation des fiches, le constat de l'espace de lecture et une contre-revue.
