# Handoff — 2026-11-02 — File D, séance de gestes n° 5 : d45 (D-426) et fin de séance

## Branche et état Git

`docs/file-d-d45-borne`, worktree `.claude/worktrees/file-d1-suite`, créée
depuis `origin/main` (f5cbf461). Troisième et dernière PR de la séance, après
#1828 (b26, D-424) et #1829 (m39, D-425).

## Objectif

Clore la séance n° 5 de la file D : b26, m39, d45 closes ; d46 et trois
lignes neuves prêtes à reprendre.

## Décisions prises

- D-424 (b26, #1828) : table des niveaux de preuve signée, appliquée avec
  J3-12f.
- D-425 (m39, #1829) : cinq instruments au dispositif distinct ; droits
  maintenus par arbitrage ; Epworth et MFI-20 dans « Mon équilibre », MFI-20
  dans l'orientation, en principe.
- D-426 (d45, cette PR) : borne de 3 confirmée ; graduation de `DC-29` à
  dicter par le responsable.
- d46 : rouverte ; le responsable dictera une fenêtre par instrument.

## Fichiers modifiés

- `docs/DECISIONS.md` : D-426.
- `docs/claude/corpus/source_registry.json` : `WN-SRC-0615` à `0620` ;
  `README.md` du corpus.
- `docs/claude/PLAN_WELLNEURO.md` : lignes D/45 et D/46.
- Neufs : `changelog.d/2026-11-02-d426-borne-axes-dc29.md` ; ce handoff.

## Validations exécutées

- d45 et d46 relues à leur source : D-107 décision 4, D-103, D-180 §3 ; code
  lu en principal (`synthese-praticien.ts:13-41`,
  `orientationRulesV1.ts:312-327`, `orientationEngine.ts:1172-1262`).
- Recherche du responsable vérifiée par sept vérificateurs ; titres des six
  sources de cette PR recroisés sur Crossref par la session. Numérotées
  `0615` à `0620` (la fiche validée annonçait `0616` à `0621`, `0615` étant
  resté libre : renumérotées pour ne pas laisser de trou).
- Écartés à la vérification : α = 0,91 de l'échelle de Pichot (introuvable),
  kappa 0,816 de la Bristol (concordance définition-image, pas le retest),
  retest de Cungi (introuvable), phrase attribuée à Holleman et Simel (non
  trouvée), contenu d'O'Cathain 2010 et synthèse AHRQ du PSQI (inaccessibles).
- T1 avant le commit.

## Problèmes ouverts

- **d46, fenêtres par instrument à dicter** (D-180 §3 ; aucune source ne
  fonde une fenêtre) pour les quinze instruments des vingt règles
  d'orientation : `Q_GAS_01` (TFD SIIN), `Q_GAS_03` (Bristol), `Q_INF_01`
  (hyperexcitabilité SIIN), `Q_NEU_11` (HAD), `Q_SOM_01` (PSQI), `Q_SOM_02`
  (Epworth), `Q_SOM_03` (Berlin), `Q_SOM_05` (MEQ), `Q_SOM_06` (Pichot),
  `Q_STR_02` (PSS-10), `Q_STR_03` (Cungi), `Q_STR_04` (DASS-21), `Q_STR_05`
  (BMS-10), `Q_STR_06` (Karasek), `Q_STR_08` (WART). Faits vérifiés à
  consigner avec la décision : HADS « at not less than weekly intervals »
  (Snaith 2003, `0544`) ; périodes de rappel PSQI et PSS un mois, HADS et
  DASS une semaine ; retests WART une semaine (Ravoux et al. 2018, JMIR Ment
  Health 5:e12) et deux semaines (Robinson et al. 1992, Percept Mot Skills
  74:926), JCQ 1 à 8 semaines (Choi et al. 2014, Ergonomics 57:897-911),
  Bristol 7,76 jours (Parés et al. 2009, Rev Esp Enferm Dig 101:312-316).
  Ces sources ne sont pas encore au registre. Ensuite : D-xxx amendant D-180
  §3, re-signature de `ORIENTATION_RULES_V1`, lot de la file B.
- **Ligne neuve — `DC-29`, graduation à dicter** (D-426 §2) : niveaux et
  critère d'indépendance, puis D-xxx amendant D-103 et D-041, lot de la file
  B.
- **Ligne neuve — Epworth et MFI-20 dans « Mon équilibre »** (D-425 §4 a) :
  besoin, groupe, poids, sous-scores du MFI-20 (aucun score global au
  catalogue ; quatre dimensions en français), niveau de preuve (D-424 §5) ;
  avec un changement de version (empreinte, réapprobation b27).
- **Ligne neuve — MFI-20 dans l'orientation** (D-425 §4 b) : claim validé et
  déclencheur sourcé ; aucun seuil publié du MFI-20 trouvé.
- Ordre de merge : #1828, puis #1829 (cite `WN-SRC-0604`), puis cette PR ;
  `source_registry.json`, le README du corpus et l'en-tête de
  `docs/DECISIONS.md` se recoupent entre elles et avec #1826 : chaque fusion
  garde les deux côtés, D-426 au-dessus de D-425 au-dessus de D-424.

## Prochaine action exacte

« Prête » sur les trois PR, puis `/clear`. Séance suivante de la file D :
d46 (fenêtres dictées), puis les trois lignes neuves, par questions à options
et valeurs dictées.

## Interdits encore actifs

- Aucune modification sous `web/src/lib/clinical/` ni de
  `indicationsBiologieV1.ts` ; ni migration, ni `schema.prisma` ; aucune
  écriture en production.
- Aucune valeur, aucun seuil, aucune dose ni aucune source proposés par la
  session (DC-20) ; aucune D-xxx sans arbitrage du responsable ; aucun
  identifiant Drive dans le dépôt ; un assistant externe n'est jamais source
  d'une valeur.
