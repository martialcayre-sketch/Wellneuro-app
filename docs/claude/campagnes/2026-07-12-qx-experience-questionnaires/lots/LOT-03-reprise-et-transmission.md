---
id: "LOT-03"
titre: "Reprise et transmission"
statut: "terminé"
dépend_de: "LOT-02"
---

# LOT-03 — Reprise et transmission

## But

Ajouter brouillon local, reprise rétrocompatible, résumé et correction avant transmission.

## Garde-fous

- Clé locale versionnée et séparée des réponses soumises.
- Brouillon, ordre visuel et métadonnées UX exclus du payload de scoring.
- Aucune migration Prisma.

## Résultats

- Brouillon local migré vers une enveloppe V1 contenant uniquement les
  réponses et la page courante, avec métadonnée d'horodatage séparée et
  fallback rétrocompatible sur les anciennes clés.
- Reprise bornée au renderer courant sans jamais sauter la première partie
  incomplète ; réponses et navigation sont autosauvegardées localement.
- Résumé ordonné ajouté avant transmission, avec état de complétude,
  correction ciblée et reprise de focus, sans afficher les réponses, scores
  ou interprétations cliniques.
- Payload POST, conversion numérique, API, schéma Prisma, catalogue clinique
  et scoring inchangés. Les brouillons nouveaux et historiques sont effacés
  après transmission réussie ou réinitialisation.
- Suite Vitest (100/100), tests ciblés (21/21), type-check, certification des
  63 questionnaires, contrôle anti-secrets et `git diff --check` validés.
  Revue indépendante : GO, aucun constat bloquant.
