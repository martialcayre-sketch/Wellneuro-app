---
id: "LOT-05"
titre: "Contrat de corpus et maturité du rayon compléments"
statut: "fait"
dépend_de: "LOT-02"
---

# LOT-05 — Contrat de corpus et maturité du rayon compléments

## Objectif

Distinguer un corpus vide en cours de constitution d’un corpus indisponible ou bloqué par une garde métier, puis restituer clairement cet état au praticien.

## Travaux réalisés

- le contrat du rayon distingue l’état vide de l’état indisponible ;
- le message métier renvoyé par l’API est conservé jusqu’à l’interface praticien ;
- la fiche complément et ses tests couvrent cette restitution explicite ;
- la stratégie fail-closed reste inchangée lorsque le rayon n’est pas disponible.

## Critères de fin

- un corpus vide n’est pas présenté comme une erreur technique ;
- une indisponibilité conserve son message métier explicite ;
- les tests du panneau praticien couvrent les deux états.
