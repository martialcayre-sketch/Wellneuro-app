# Regles Critiques

## 1) Securite et secrets

Interdits dans Git:
- donnees patients reelles,
- resultats biologiques reels,
- questionnaires reels remplis,
- exports CSV/XLSX reels,
- identifiants Google,
- cles API,
- fichiers `.env` reels,
- `.clasp.json`, `.clasprc.json`.

## 2) Donnees de test autorisees

Seuls patients fictifs nommes autorises:
- Sophie Nicola
- Jennifer Martin
- Michel Dogne

## 3) Regle SHEET_ID

Toujours recuperer via:

```javascript
PropertiesService.getScriptProperties().getProperty('SHEET_ID')
```

Jamais en dur dans le code.

## 4) Contraintes cliniques

- Ne pas modifier la logique clinique sans demande explicite.
- Ne pas modifier les seuils de scoring sans source/documentation.
- Ne pas inventer de questionnaire, score, seuil ou recommandation.
- Toute modification clinique doit etre tracee dans `CHANGELOG.md`.

## 5) Contraintes de perimetre

- Ne pas lancer de migration technologique sans demande explicite.
- Pour une tache documentaire, ne pas modifier la logique metier.

## 6) Verification minimale

Avant proposition de livraison:

```bash
bash scripts/check_no_secrets.sh
```
