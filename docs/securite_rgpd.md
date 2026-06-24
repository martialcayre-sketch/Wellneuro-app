# Sécurité et RGPD

## Données interdites dans Git

Ne jamais committer :

- données patients réelles ;
- résultats biologiques réels ;
- questionnaires remplis réels ;
- exports CSV/XLSX ;
- identifiants Google ;
- clés API ;
- fichiers `.env` réels ;
- fichiers `.clasp.json` ou `.clasprc.json`.

## Données de test autorisées

Les seuls patients nommés autorisés dans le dépôt sont fictifs :

- Sophie Nicola ;
- Jennifer Martin ;
- Michel Dogné.

## Identifiants techniques

Le `SHEET_ID` doit être configuré dans les propriétés Apps Script et récupéré par `PropertiesService.getScriptProperties().getProperty('SHEET_ID')`.

## Bonnes pratiques

- Utiliser des exemples anonymes ou fictifs.
- Vérifier les changements avec `scripts/check_no_secrets.sh` avant chaque commit.
- Supprimer tout export local contenant des données personnelles.
