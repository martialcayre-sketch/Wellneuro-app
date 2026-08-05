### Corrigé

- **Doublons d'assignation** : les quatre chemins qui créent des assignations
  (assignation unitaire, pack, file d'envoi, pack de base à l'onboarding)
  vérifient désormais, sous verrou de la ligne patient, qu'aucune assignation
  **ouverte** (`En attente`) ne porte déjà le même questionnaire. Un doublon
  intégral est refusé (`409 deja_assigne`, aucun e-mail) ; un recouvrement
  partiel part amputé des questionnaires déjà ouverts. Une assignation annulée
  ou complétée ne bloque jamais une repassation. Le moteur d'orientation ne
  marque plus « déjà assigné » un questionnaire dont l'assignation est annulée
  ou complétée.
