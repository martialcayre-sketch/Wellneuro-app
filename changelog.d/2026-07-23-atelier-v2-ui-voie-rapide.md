### Ajouté

- **Atelier corpus v2 — écran de la voie rapide** (PR C) : section « Validation
  par lot » dans `dashboard/corpus` — tirage serveur (repris tel quel si un
  tirage ouvert existe), confrontation de l'échantillon au verbatim avec
  verdicts et notes, questionnaire de restitution joué **sur le corpus** (les
  réponses citent les claims, couverture des chunks affichée en direct), puis
  signature du lot ou bascule motivée, en deux temps. Nouvelles routes
  praticien : `corpus/claims/recherche` (restitution en mode revue, périmètre
  fermé par source — pas la barrière patient) et GET `corpus/claims/lot/tirage`
  (reprise d'un tirage ouvert).
