# Handoff — 2026-11-02 — File D, séance de gestes n° 5 : b26, table des niveaux de preuve signée (D-424)

## Branche et état Git

`docs/file-d-seance-5`, worktree `.claude/worktrees/file-d1-suite`, créée
depuis `origin/main` (b5862ee3) puis avancée en `--ff-only` sur f5cbf461.
Première des trois PR de la séance ; m39 (D-425) et d45 (D-426) suivent,
chacune sur sa branche.

## Objectif

Clore b26 : signer la table révisée des niveaux de preuve de « Mon
équilibre » (J3-12d, J3-12f), reprise du handoff
`2026-11-01-2310-file-d-b26-reprise.md` (#1818).

## Décisions prises

- D-424, arbitrages du responsable du 2026-11-02 (questions à options, fiche
  validée telle quelle) : A, B, D gardés ; C retiré ; un niveau par clé ;
  neuf niveaux confirmés tels que dans le code ; application avec J3-12f.

## Fichiers modifiés

- `docs/DECISIONS.md` : D-424.
- `docs/claude/corpus/source_registry.json` : `WN-SRC-0604` (Blais et al.
  1997), `WN-SRC-0605` (Bellinghausen et al. 2009) ; `README.md` du corpus.
- `docs/claude/PLAN_WELLNEURO.md` : ligne « table des niveaux de preuve »
  (H15) et ligne J3-12f du §8.
- Neufs : `docs/claude/plan-journal/H15/2026-11-02-02-table-des-niveaux-de-preuve-signee.md` ;
  `changelog.d/2026-11-02-d424-table-niveaux-preuve.md` ; ce handoff.

## Validations exécutées

- Source du besoin 12 relue au dossier de mesure du 2026-10-18 (Claude Doc,
  lecture seule) : sous-échelle « Relation aux autres » de `Q_MOD_01`,
  option 4 (c).
- `NIVEAU_PREUVE_PAR_SOURCE`, `RANG_PREUVE`, `BESOIN_SOURCES` relus en
  principal (`web/src/lib/equilibre/constants.ts`).
- Recherche du responsable vérifiée référence par référence par sept
  vérificateurs (Europe PMC, Crossref, pages des ayants droit) ; Blais 1997
  confirmé sur son résumé ; Bellinghausen 2009 confirmé sur Crossref
  (effectif et items non lus).
- Registre : réécriture contrôlée à l'identique avant ajout ; `0601` à `0603`
  pris par #1826, d'où `0604`.
- T1 (`npm run check:rapide`) avant le commit.

## Problèmes ouverts

- Traduction servie de la PSS-10 : Bellinghausen 2009 ou une autre, non
  établie (texte intégral inaccessible) ; sans effet sur le niveau signé.
- `README.md` du corpus et `source_registry.json` sont aussi touchés par
  #1826 (`0601` à `0603`) : le second merge résout en gardant les deux.

## Prochaine action exacte

CI, revue, « prête ». Puis PR de m39 (D-425), puis PR de d45 (D-426), qui
porte le handoff de fin de séance.

## Interdits encore actifs

- Aucune modification sous `web/src/lib/clinical/` ni de
  `indicationsBiologieV1.ts` ; ni migration, ni `schema.prisma` ; aucune
  écriture en production.
- Aucune valeur, aucun seuil, aucune dose ni aucune source proposés par la
  session (DC-20) ; aucune D-xxx sans arbitrage du responsable ; aucun
  identifiant Drive dans le dépôt ; un assistant externe n'est jamais source
  d'une valeur.
