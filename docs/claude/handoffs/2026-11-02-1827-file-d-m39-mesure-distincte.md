# Handoff — 2026-11-02 — File D, séance de gestes n° 5 : m39, mesure distincte de la fatigue et du sommeil (D-425)

## Branche et état Git

`docs/file-d-m39-dispositif`, worktree `.claude/worktrees/file-d1-suite`,
créée depuis `origin/main` (f5cbf461), puis `origin/main` fusionné après le
merge de #1828 (97951315 ; conflits de `docs/DECISIONS.md`, du registre et
de son README résolus en gardant les deux côtés). Deuxième des trois PR de la
séance, après #1828 (b26, D-424) ; d45 (D-426) suit.

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
- `docs/claude/corpus/source_registry.json` : `WN-SRC-0606` à `0614`, et
  `0621` (source secondaire des droits du MFI-20, ajoutée après la revue
  Copilot) ; `README.md` du corpus.
- `docs/claude/corpus/instrument_registry.json` : `traductionValidee` de
  `Q_SOM_01`, `Q_SOM_02`, `Q_SOM_05`, `Q_SOM_07` ; paragraphe daté ajouté à
  `droits.detail` des cinq instruments.
- `docs/claude/PLAN_WELLNEURO.md` : ligne h3 (instruction de la mesure
  distincte close) et ligne « mesure distincte » du rang 0 (relevé Copilot).
- Neufs : `docs/claude/plan-journal/H19/2026-11-02-01-mesure-distincte-cinq-instruments.md` ;
  `changelog.d/2026-11-02-d425-mesure-distincte-fatigue-sommeil.md` ; ce
  handoff.

## Validations exécutées

- Inventaire du catalogue servi, des trois registres et de D-353 (agent
  `Explore`, faits relus en principal).
- Sept vérifications parallèles de la recherche du responsable ; titres des
  sources retenues recroisés sur Crossref par la session.
- Registres : réécriture contrôlée à l'identique avant modification.
- Revue de la première tête (40c921e0) : PR-Agent, statut des droits écarté
  avec motif (`licence_requise` ferait tomber le barreau `droits_verifies`,
  contre l'arbitrage) ; Copilot, quatre remarques : exclusions de D-353,
  ligne du rang 0 et source secondaire du MFI-20 corrigées ; repères de
  fatigue du catalogue (`sommeil.ts`, Schwarz 2003, Singer 2011, non
  vérifiés) portés à D-425 §4 (b) sur arbitrage du responsable.
- T1 avant chaque commit.

## Problèmes ouverts

- `source_registry.json`, le `README.md` du corpus et l'en-tête de
  `docs/DECISIONS.md` sont aussi touchés par #1830 et #1826 : chaque fusion
  garde les deux côtés (D-426 au-dessus de D-425).
- d57 (MFI-20 dans l'orientation) commence par vérifier Schwarz et al. 2003
  et Singer et al. 2011.
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
