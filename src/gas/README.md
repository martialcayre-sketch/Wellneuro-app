# Source Google Apps Script

Ce dossier est la racine `clasp` du MVP NutriConsult NNPP2.

## Fichiers

- `Code.gs` : backend Apps Script et fonctions serveur.
- `Questions.gs` : catalogue des questionnaires et scoring.
- `index.html` : interface française patient/praticien.
- `appsscript.json` : manifeste Apps Script.

## Règles

- Ne jamais écrire de `SHEET_ID` en dur.
- Lire le `SHEET_ID` via `PropertiesService.getScriptProperties().getProperty('SHEET_ID')`.
- Ne pas ajouter de données patients réelles.
- Ne pas modifier les scores ou seuils cliniques sans documentation explicite.
