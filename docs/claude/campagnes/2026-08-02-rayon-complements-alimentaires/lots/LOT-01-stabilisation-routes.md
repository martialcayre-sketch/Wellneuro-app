---
id: "LOT-01"
titre: "Stabilisation des routes praticien et internes"
statut: "en cours"
dépend_de: "LOT-00"
---

# LOT-01 — Stabilisation des routes praticien et internes

## Objectif

Stabiliser les routes du rayon compléments déjà présentes dans le dépôt et clarifier leur comportement selon le flag d’activation.

## Travaux

- vérifier l’état des routes `praticien/complements`, `praticien/complements/corpus` et `internal/supplements/*` ;
- valider les garde-fous d’authentification et de visibilité ;
- s’assurer que le flag `WN_C4_ENABLED` ne masque pas un comportement incohérent.

## État courant

- les routes praticien du rayon compléments partagent désormais un même point de validation d’accès pour l’authentification et le flag d’activation ;
- le périmètre reste borné aux routes API et au mécanisme d’activation, sans ouverture de surface UI ni migration.

## Critères de fin

- les routes répondent de manière cohérente selon leur périmètre ;
- les erreurs sont compréhensibles et testées ;
- la surface reste stable et documentée.
