# Schéma Google Sheets

Ce document décrit le schéma attendu du classeur Google Sheets du MVP. Il doit être mis à jour dès qu'un onglet ou une colonne évolue.

## Principes

- Ne jamais stocker de données patients réelles dans le dépôt.
- Utiliser uniquement des patients fictifs pour les tests : Sophie Nicola, Jennifer Martin et Michel Dogné.
- Documenter les colonnes sans inclure de données de santé réelles.

## Onglets attendus à documenter

- `Patients` : identité minimale, statut, rattachement praticien.
- `Questionnaires` : catalogue des questionnaires disponibles.
- `Assignations` : lien patient-questionnaire et statut.
- `Reponses` : réponses saisies par les patients.
- `Resultats` : scores calculés et synthèses affichées au praticien.

## À compléter pendant la stabilisation MVP

Pour chaque onglet, préciser : nom de colonne, type attendu, obligatoire/facultatif, exemple fictif, règle de validation.
