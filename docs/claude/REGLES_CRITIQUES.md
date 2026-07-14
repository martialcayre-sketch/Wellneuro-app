# Regles Critiques

## 1) Securite et secrets

Interdits dans Git:
- donnees patients reelles,
- resultats biologiques reels,
- questionnaires reels remplis,
- exports CSV/XLSX reels,
- identifiants Google,
- cles API,
- fichiers `.env` / `.env.local` reels.

## 2) Donnees de test autorisees

Seuls patients fictifs nommes autorises:
- Sophie Nicola
- Jennifer Martin
- Michel Dogné

## 3) Regle secrets et configuration

Toute configuration sensible (`DATABASE_URL`, `ANTHROPIC_API_KEY`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, `SMTP_URL`) passe uniquement par des variables d'environnement (`web/.env.local` en dev, variables Vercel en production).

Jamais en dur dans le code.

Note : la decommission Google Sheets est terminee (2026-07-07) — toutes les routes praticien (`metrics`, `patients`, `assignations`, `questionnaires`, `reponses`, `packs`...) lisent/ecrivent exclusivement PostgreSQL via Prisma, la route `migrate-historique` a ete supprimee, et `SHEET_ID` n'est plus une variable d'environnement requise. Voir `docs/claude/PROJET_CONTEXTE.md`.

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
