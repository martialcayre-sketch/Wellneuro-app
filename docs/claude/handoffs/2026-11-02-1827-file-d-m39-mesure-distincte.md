# Handoff — 2026-11-02 — File D, séance de gestes n° 5 : m39, mesure distincte de la fatigue et du sommeil (D-425)

## Branche et état Git

`docs/file-d-m39-dispositif`, worktree `.claude/worktrees/file-d1-suite`,
créée depuis `origin/main` (f5cbf461). Deuxième des trois PR de la séance,
après #1828 (b26, D-424) ; d45 (D-426) suit.

## Objectif

Clore m39 : instruire le dispositif distinct de D-407 §2-3 sur les
questionnaires déjà servis (version française, sensibilité au changement,
droits) et faire trancher le responsable.

## Décisions prises

- D-425, arbitrages du responsable du 2026-11-02 (questions à options, une
  précision rendue, fiche validée telle quelle) : cinq instruments au
  dispositif ; calendrier et forme à décider ; droits du PSQI, de l'Epworth et
  du MFI-20 maintenus sous la déclaration du 2026-07-29, écarts consignés ;
  l'Epworth et le MFI-20 dans « Mon équilibre », le MFI-20 dans
  l'orientation, en principe.

## Fichiers modifiés

- `docs/DECISIONS.md` : D-425.
- `docs/claude/corpus/source_registry.json` : `WN-SRC-0606` à `0614` ;
  `README.md` du corpus.
- `docs/claude/corpus/instrument_registry.json` : `traductionValidee` de
  `Q_SOM_01`, `Q_SOM_02`, `Q_SOM_05`, `Q_SOM_07` ; paragraphe daté ajouté à
  `droits.detail` des cinq instruments.
- `docs/claude/PLAN_WELLNEURO.md` : ligne h3 (instruction de la mesure
  distincte close).
- Neufs : `docs/claude/plan-journal/H19/2026-11-02-01-mesure-distincte-cinq-instruments.md` ;
  `changelog.d/2026-11-02-d425-mesure-distincte-fatigue-sommeil.md` ; ce
  handoff.

## Validations exécutées

- Inventaire du catalogue servi, des trois registres et de D-353 (agent
  `Explore`, faits relus en principal).
- Sept vérifications parallèles de la recherche du responsable ; titres des
  sources retenues recroisés sur Crossref par la session.
- Registres : réécriture contrôlée à l'identique avant modification.
- T1 avant le commit.

## Problèmes ouverts

- `WN-SRC-0604` (Blais 1997), cité ici, est inscrit par #1828 : merger #1828
  d'abord. `source_registry.json`, le `README.md` du corpus et l'en-tête de
  `docs/DECISIONS.md` sont aussi touchés par #1828 et #1826 : le second merge
  garde les deux côtés (D-425 au-dessus de D-424 ; compte des notices recalculé).
- Droits : l'usage clinique du PSQI et l'Epworth restent servis sans licence
  de l'ayant droit, par arbitrage du responsable ; consigné, non résolu.

## Prochaine action exacte

CI, revue, « prête ». Les deux lignes neuves (§4) vont à la page de suivi et
au handoff de fin de séance (PR de d45).

## Interdits encore actifs

- Aucune modification sous `web/src/lib/clinical/` ni de
  `indicationsBiologieV1.ts` ; ni migration, ni `schema.prisma` ; aucune
  écriture en production.
- Aucune valeur, aucun seuil, aucune dose ni aucune source proposés par la
  session (DC-20) ; aucune D-xxx sans arbitrage du responsable ; aucun
  identifiant Drive dans le dépôt ; un assistant externe n'est jamais source
  d'une valeur.
