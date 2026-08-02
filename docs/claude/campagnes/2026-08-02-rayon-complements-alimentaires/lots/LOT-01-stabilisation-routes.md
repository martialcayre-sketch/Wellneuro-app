---
id: "LOT-01"
titre: "Stabilisation des routes praticien et internes"
statut: "fait"
dépend_de: "LOT-00"
---

# LOT-01 — Stabilisation des routes praticien et internes

## Objectif

Stabiliser les routes du rayon compléments déjà présentes dans le dépôt et clarifier leur comportement selon le flag d’activation.

## Travaux réalisés

- l’état des routes `praticien/complements`, `praticien/complements/corpus` et `internal/supplements/*` a été vérifié et stabilisé ;
- les garde-fous d’authentification et de visibilité ont été validés ;
- le comportement du flag `WN_C4_ENABLED` a été rendu explicite et cohérent sur le périmètre API concerné.

## Critères de fin

- les routes répondent de manière cohérente selon leur périmètre ;
- les erreurs sont compréhensibles et testées ;
- la surface reste stable et documentée.
