# NutriConsult NNPP2 — MVP Google Apps Script

NutriConsult NNPP2 est une application web praticien-patient de neuronutrition clinique. Ce dépôt contient la structure de travail du MVP actuel basé sur Google Apps Script (GAS) et Google Sheets.

## Périmètre actuel

- Backend Apps Script dans `src/gas/Code.gs`.
- Catalogue questionnaires et scoring dans `src/gas/Questions.gs`.
- Interface patient/praticien dans `src/gas/index.html`.
- Google Sheets comme base de données du MVP.

La migration cible future pourra être étudiée ultérieurement, mais elle ne doit pas être commencée tant que le MVP GAS n'est pas validé end-to-end.

## Sécurité indispensable

- Ne jamais écrire de `SHEET_ID` en dur dans le code.
- Utiliser uniquement `PropertiesService.getScriptProperties().getProperty('SHEET_ID')`.
- Ne jamais committer de données patients réelles, identifiants Google, clés API, exports CSV/XLSX, résultats biologiques ou questionnaires remplis réels.
- Les patients Sophie Nicola, Jennifer Martin et Michel Dogné sont exclusivement des patients fictifs de test.

## Installation locale avec clasp

1. Copier `.clasp.example.json` vers `.clasp.json`.
2. Remplacer `A_REMPLACER_PAR_LE_SCRIPT_ID_LOCAL` par le script ID local.
3. Vérifier que `rootDir` vaut `src/gas`.
4. Configurer la propriété Apps Script `SHEET_ID` dans l'interface Google Apps Script, sans la committer.

## Vérifications

```bash
bash scripts/check_no_secrets.sh
```

## Documentation

- Architecture GAS : `docs/architecture_gas.md`
- Schéma Google Sheets : `docs/schema_google_sheets.md`
- Sécurité RGPD : `docs/securite_rgpd.md`
- Workflow GitHub + clasp : `docs/workflow_github_clasp.md`
- Tests end-to-end : `docs/checklist_tests_end_to_end.md`
