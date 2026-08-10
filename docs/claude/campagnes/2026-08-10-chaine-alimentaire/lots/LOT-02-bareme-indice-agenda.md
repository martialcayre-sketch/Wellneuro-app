---
id: "LOT-02"
statut: "gaté — porte des 21 jours"
---

# LOT-02 — Barème et indice agenda (gaté)

## Objet

Le scorer `agenda_alimentaire` sur le gabarit exact du jumeau sommeil
(`questions.ts:3783-3910`) : refus sous couverture minimale avec motif,
plancher **par axe**, axe non couvert = `null` renormalisé (jamais 0),
drapeaux cliniques jamais des points. `Q_ALI_09` passe de `type:'journal'` à
ce type **à la clôture seulement**.

## Porte — ne s'ouvre pas sans

1. **Recueil réel suffisant** (clôture des 21 jours) — la porte est posée par
   la campagne agenda elle-même (`CAMPAGNE.md:123,151`). État à l'ouverture du
   lot : relecture datée via `execute_sql`, consignée dans ce fichier.
2. **Décision clinique D-xxx** : axes, poids, bornes — après observation de
   la distribution réelle. `FENETRE_ALI_MAX_PLAUSIBLE` (types.ts:87) est une
   borne de plausibilité de recueil, pas un seuil clinique : ne pas la
   promouvoir.

## Dépend de

LOT-00, et d'une action humaine hors lot : la relance du recueil.
