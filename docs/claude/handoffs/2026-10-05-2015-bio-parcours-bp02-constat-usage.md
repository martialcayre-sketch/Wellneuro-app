# Handoff — 2026-10-05 — BIO-PARCOURS BP-02 : constat d'usage

## Branche et état Git

`docs/bio-parcours-bp02-constat-usage`, depuis `main` 99b07dda (#1328, `usage_ia` v5).

## Objectif

BP-02 : ligne de base de l'usage réel, en agrégats, avant toute surface
(`D-266` §12).

## Décisions prises

- Script rejouable versé (`CONSTAT_USAGE_BP02.sql`). Il fait des `COUNT` et des
  `GROUP BY`, en lecture seule, avec un `ROLLBACK` final.
- « Deux véhicules » `conditionnelle_biologie` : payload des versions de
  protocole et `clinical_rules.condition_biologie`. C'est une lecture de la
  note, aucun texte du dépôt ne les nomme.
- Lot courant de BIO-PARCOURS : BP-26.

## Fichiers modifiés

Note `CONSTAT_USAGE_2026-10-05.md` et son script ; fiche LOT-02 (terminé) ;
`CAMPAGNE.md` ; `BIOFLOW_ROADMAP.md` (migration #1326 dite appliquée) ;
changelog ; SESSION_LOG ; ce handoff.

## Validations exécutées

Lecture par le conteneur one-off-5789, ROLLBACK constaté ; `npm run check` vert.

## Problèmes ouverts

- 14 lignes validées dont l'unité lue diffère textuellement du catalogue. La
  graphie ou l'unité sont à départager ligne par ligne, par identifiant, hors
  dépôt.
- Le refus d'unité non suivi d'un écart ne laisse aucune trace en base.

## Prochaine action exacte

BP-26 : préparer la trame de qualification par fonction. Le responsable
statue ; aucune conclusion de session.

## Interdits encore actifs

- Jamais par nom ni par e-mail ; aucune conclusion de parcours tirée d'un agrégat (`D-125`).
- Aucune assistance avant BP-26 (G4).
