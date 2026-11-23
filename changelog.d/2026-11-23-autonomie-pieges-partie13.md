### Réservation WN-SRC : le numéro d'une source se réserve avant l'ingestion, et le registre refuse un doublon (autonomie-pieges-restes, partie 13, 2026-11-23)

Rien ne réservait un numéro de source entre deux sessions. Le 2026-11-01,
#1808 prenait `WN-SRC-0577` à `0588` au registre pendant qu'une autre session
(#1810) ingérait en base sous `0577` à `0582`. La base étant la partie
irréversible, c'est la plage sans extrait en base qui a cédé, et #1808 a été
renumérotée.

- **Réservation** `scripts/wn-reserver-source.mjs [--nombre N]`, sur le modèle
  de `wn-reserver-decision.mjs` (D-370 §1), dont il reprend la boucle
  `reserver()`. Celle-ci prend désormais la référence en paramètre, avec la
  référence d'une décision par défaut.
  - Il lit, en brut, le plus haut numéro de
    `docs/claude/corpus/source_registry.json` à la tête de `main`, et les
    réservations existantes.
  - Il crée `refs/tags/reserve/WN-SRC-NNNN` sur le premier numéro libre. La
    référence ne porte que le numéro.
  - Ses issues sont les mêmes que pour les décisions : « déjà existante »
    seule fait passer au suivant, tout autre refus rend « inconnu » sans
    nouvel essai. Un registre en défaut sur `main` (doublon, forme) n'est pas
    un maximum : rien n'est tenté.
- **Garde** `scripts/lib/sources-numerotation.mjs`, alias
  `npm run sources-check`, dans `npm run check` et au CI, sans filtre
  `docs_only`.
  - Refus : un `sourceId` en double, ou hors de la forme `WN-SRC-NNNN`, ou un
    registre illisible.
  - Code 2 : un registre absent ou vide, qui n'est jamais vert.
  - Avertissement seul, au CI d'une PR (au poste : `--pr`) : une source
    ajoutée qu'aucune réservation ne couvre. C'est le régime de D-370 §4 ; un
    refus serait un durcissement à décider. Les réservations ne se lisent que
    s'il y a une source ajoutée. Une réservation n'a pas de titulaire : le
    garde constate qu'elle existe, pas qu'elle est celle de la PR. Une source
    qui comble un trou n'est pas renvoyée au script, qui ne rend jamais ce
    numéro.
- **Docs** : `docs/claude/corpus/README.md`, section « Numéro d'une source
  neuve ».
- **Bancs** `scripts/lib/sources-numerotation.test.mjs` (21 cas, dont un
  dépôt git temporaire avec commit de fusion, en CI de PR et avec `--pr`) et
  `scripts/wn-reserver-source.test.mjs` (10 cas, faux `gh`, aucune référence
  réelle), inscrits à `bancs-outillage-check` et au CI. Treize mutations
  rougissent chacune au moins un cas. Le retrait de `sources-check` de
  `check` rougit le banc de parité.
- **Revue `wn-reviewer`** : GO, sans P0 ni P1. Repris : la lecture réelle de
  la base en mode PR n'était pas couverte, et le libellé « réservé »
  promettait un titulaire. Routé : le garde n'est pas joué par le contrôle
  sur l'arbre fusionné de l'intégrateur (`wn-controle-fusion.mjs`).
