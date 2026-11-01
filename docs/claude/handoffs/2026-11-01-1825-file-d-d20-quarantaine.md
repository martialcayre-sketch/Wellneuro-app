# Handoff — 2026-11-01 — File D, séance de gestes n° 4 (suite) : d20 close, m16 et m10 relues

## Branche et état Git

`docs/file-d-d20-quarantaine`, worktree `.claude/worktrees/file-d1-suite`,
partie de `origin/main` dcef9059 (#1803 mergée), origin/main c6d43df2
fusionnée en cours de séance. Documentation, registre du corpus et un
commentaire de code ; aucune migration. Numéro D-405 réservé
(`refs/tags/reserve/D-405`).

## Objectif

Reprendre la séance n° 4 aux lignes m16, m10, d20, m23, b23 et b26, une à la
fois ; arrêt après la première ligne close, car m16 demande plus d'une
séance.

## Décisions prises

- **m16 (bf, H19), ouverte.** Arbitrage du responsable : les questions déjà
  posées au point d'étape (adhésion, tolérance, énergie, sommeil, observance
  du complément et son motif) entrent dans bf, et chacune doit recevoir sa
  propre D-xxx. Un prompt de recherche approfondie a été remis au responsable
  (hors dépôt) ; la liste reste à fournir. Consigné en fragment
  `plan-journal/H19`.
- **m10, relue.** La liste des statuts de s est déjà soldée (D-322, F58
  close) ; la page de suivi était en retard. Le guide w attend ses
  préalables : dossiers de preuve (besoin 2 inachevé : B9, B12, iode,
  sélénium ; autres besoins en attente). Rien à signer.
- **d20 close (D-405)**, fiche retenue telle quelle :
  - quarantaine levée pour `WN-SRC-0062`, `0241` et `0358`, sur relecture
    de la source entière attestée par le responsable ;
  - `clinicalReviewStatus` gardé `not_reviewed` pour les sept notices ;
  - droits de `0509` et `0510` laissés `to_verify`.

## Fichiers modifiés

- `docs/DECISIONS.md` (D-405) ; `docs/claude/corpus/source_registry.json`
  (trois notices) ; `docs/claude/corpus/README.md` ;
  `docs/claude/PLAN_WELLNEURO.md` (ligne D/20) ;
  `web/src/lib/rag/claims/notebooks.ts` (commentaire de compte, 28 → 25).
- Neufs : `changelog.d/2026-11-01-d405-quarantaine-levee-bp07.md` ;
  `docs/claude/plan-journal/H19/2026-11-01-01-perimetre-et-recherche.md` ;
  ce handoff.

## Validations exécutées

- Lecture en production par conteneur (one-off détaché, transaction en
  lecture seule, agrégats seulement) : claims par source et statut des sept
  notices.
- `WN_C4_ENABLED=true` en production, lu sur cette seule clé : le rayon
  « micronutrition » est servi par la bibliothèque des compléments, pas par
  la recherche générale du corpus (remarque Copilot de #1807, corrigée).
  Remarque PR-Agent sur les droits des trois sources : écartée avec motif
  par le responsable (D-405 §4).
- Europe PMC : aucune licence pour 0509 (PMID 42747316) ni 0510 (PMC3414597).
- Code relu : `checkinDomain.ts` (contrat `c2a-checkin-v1`),
  `notebooks.ts`, `rayonCorpus.ts` (correspondance des rayons : le carnet 11
  n'en a aucun) ; aucun test ne vise les trois sources levées.
- T1 rapide et T1 complet (`npm run check`) verts avant la fusion de main ;
  CI et revue : voir la PR.

## Problèmes ouverts

- m16 : liste et sources des indicateurs, du responsable, après sa recherche ;
  puis une D-xxx par indicateur.
- m10 : guide w bloqué par les dossiers de preuve.
- Lignes non abordées : m23 (H68), b23 (BP-12a, D-314 §10), b26 (J3-12d,
  J3-12f).

## Prochaine action exacte

Revue et « prête » de la PR de d20 ; puis, après `/clear`, reprendre la
séance n° 4 à m23, puis b23 et b26 ; m16 dès que le responsable rapporte sa
recherche.

## Interdits encore actifs

- Aucune modification sous `web/src/lib/clinical/` ni de
  `indicationsBiologieV1.ts` ; ni migration, ni `schema.prisma` ; aucune
  écriture en production.
- Aucune valeur, aucun seuil, aucune dose ni aucune source proposés par la
  session (DC-20) ; aucune D-xxx sans arbitrage du responsable ; aucun
  identifiant Drive dans le dépôt.
