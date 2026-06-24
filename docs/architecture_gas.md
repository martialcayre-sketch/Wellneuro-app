# Architecture GAS

Le MVP NutriConsult NNPP2 repose sur Google Apps Script et Google Sheets.

## Composants

- `Code.gs` : points d'entrée Apps Script, accès aux services Google, orchestration backend.
- `Questions.gs` : catalogue des questionnaires et scoring existant.
- `index.html` : interface française patient/praticien servie par Apps Script.
- Google Sheets : stockage des praticiens, patients fictifs de test, assignations, réponses et résultats.

## Configuration sécurisée

Le `SHEET_ID` doit être stocké dans les propriétés du script Apps Script. Le code doit le lire avec :

```javascript
PropertiesService.getScriptProperties().getProperty('SHEET_ID')
```

Aucun identifiant ne doit être écrit en dur.

## Limites volontaires

Ce dépôt ne lance pas de migration Next.js. Toute évolution doit rester compatible avec le MVP GAS jusqu'à validation end-to-end.
