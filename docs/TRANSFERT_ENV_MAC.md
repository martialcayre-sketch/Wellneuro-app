# Transfert des variables d'environnement vers le Mac

But : récupérer les variables nécessaires au projet sans manipuler de fichier `.env*` dans le dépôt.

## Variables utiles à conserver

- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `DATABASE_URL`
- `SMTP_URL`
- `ANTHROPIC_API_KEY`
- `CLAUDE_MODEL`
- `WN_C5_ENABLED`
- `WN_ENABLE_CORPUS_CLINIQUE_V1`
- `WN_C5_CIQUAL_IMPORT_CONFIRMATION`
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_DSN`
- `SENTRY_TRACES_SAMPLE_RATE`
- `NEXT_PUBLIC_APP_VERSION`

## Méthode automatique recommandée

Si les variables sont déjà gérées dans Vercel, le plus simple sur le Mac est :

```bash
vercel login
cd web
vercel link
vercel env pull .env.local
```

Cette commande récupère les variables de l'environnement lié à Vercel dans le projet local du Mac.

Le script [scripts/bootstrap-mac.sh](scripts/bootstrap-mac.sh) automatise cette séquence si `web/.vercel/project.json` est déjà présent et si `web/.env.local` n'existe pas encore.

## Méthode locale pour variables présentes dans le shell Windows

Si certaines variables existent seulement dans la session Windows ou dans les variables utilisateur/système, tu peux générer une sauvegarde texte avec :

```powershell
scripts\export-env-backup.ps1
```

Par défaut, le fichier est écrit dans `Downloads\wellneuro-env-backup.txt`.

## Recommandation pratique

- Vercel pour les variables partagées et la prod
- Le script PowerShell pour les variables strictement locales
- Pas de commit du fichier de sauvegarde
