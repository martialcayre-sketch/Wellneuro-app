---
id: "LOT-01"
titre: "Stabilisation des routes praticien et internes"
statut: "à faire"
dépend_de: "LOT-00"
---

# LOT-01 — Stabilisation des routes praticien et internes

## Objectif

Stabiliser les routes du rayon compléments déjà présentes dans le dépôt et clarifier leur comportement selon le flag d’activation.

## Travaux

- vérifier l’état des routes `praticien/complements`, `praticien/complements/corpus` et `internal/supplements/*` ;
- valider les garde-fous d’authentification et de visibilité ;
- s’assurer que le flag `WN_C4_ENABLED` ne masque pas un comportement incohérent.

## Critères de fin

- les routes répondent de manière cohérente selon leur périmètre ;
- les erreurs sont compréhensibles et testées ;
- la surface reste stable et documentée.
