# Sécurité et RGPD

## Données interdites dans Git

Ne jamais committer :

- données patients réelles ;
- résultats biologiques réels ;
- questionnaires remplis réels ;
- exports CSV/XLSX ;
- identifiants Google ;
- clés API ;
- fichiers `.env` / `.env.local` réels.

## Données de test autorisées

Les seuls patients nommés autorisés dans le dépôt sont fictifs :

- Sophie Nicola ;
- Jennifer Martin ;
- Michel Dogne.

## Identifiants techniques

Toute configuration sensible (`DATABASE_URL`, `SHEET_ID`, `ANTHROPIC_API_KEY`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, `SMTP_URL`) passe uniquement par des variables d'environnement : `web/.env.local` en développement (jamais commité) et les variables d'environnement du projet Vercel en production. Aucune de ces valeurs ne doit apparaître en dur dans le code source.

## Bonnes pratiques

- Utiliser des exemples anonymes ou fictifs.
- Vérifier les changements avec `scripts/check_no_secrets.sh` avant chaque commit.
- Supprimer tout export local contenant des données personnelles.
