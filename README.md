# Wellneuro — Migration Next.js

Wellneuro est une application web praticien-patient de neuronutrition clinique. La migration vers **Next.js + Google Auth + PostgreSQL** a commencé le 2026-06-29.

## Périmètre actuel

- Application cible dans `web/`.
- Authentification praticien via Google / NextAuth.
- PostgreSQL sert de base cible pour patients, assignations, réponses, synthèses et booklets.
- Google Sheets peut rester utilisé comme source transitoire pendant la migration.
- Le dossier `src/gas/` est legacy : il n'est plus maintenu ni corrigé, et sera supprimé après migration complète.

La priorité avant C5 est de finaliser la parité fonctionnelle et la sécurité côté `web/`, puis de retirer progressivement les dépendances Apps Script.

## Sécurité indispensable

- Ne jamais écrire de `SHEET_ID` en dur dans le code.
- Ne jamais committer de données patients réelles, identifiants Google, clés API, exports CSV/XLSX, résultats biologiques ou questionnaires remplis réels.
- Les patients Sophie Nicola, Jennifer Martin et Michel Dogné sont exclusivement des patients fictifs de test.
- Les liens patients doivent rester non prédictibles et expirables.
- Tout HTML généré à partir de données patient, praticien ou IA doit être échappé avant rendu ou envoi.

## Installation locale

La configuration clasp est conservée uniquement pour historique/migration. Ne pas ajouter de nouveau développement GAS.

## Vérifications

```bash
bash scripts/check_no_secrets.sh
cd web && npm run lint
```

## Setup Supabase Prisma Vercel

Configuration recommandee pour la stack Next.js en production:

```bash
# 1) Installer les dependances et generer Prisma client
cd web
npm install
npm run prisma:generate

# 2) Configurer Supabase CLI
supabase login
export SUPABASE_PROJECT_REF=<project-ref>
npm run supabase:link

# 3) Appliquer les migrations sur la base cible
npm run prisma:migrate:deploy

# 4) Verifier le projet
npm run type-check
```

Variables obligatoires cote Vercel:

- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `DATABASE_URL` (pooler Supabase)
- `SHEET_ID`
- `SMTP_URL`
- `ANTHROPIC_API_KEY`

Controle OAuth Google Cloud Console (production):

- Origine JavaScript: `https://app.wellneuro.fr`
- Redirect URI: `https://app.wellneuro.fr/api/auth/callback/google`

## Documentation

- Roadmap migration : `docs/roadmap.md`
- Sécurité RGPD : `docs/securite_rgpd.md`
- Schéma Google Sheets transitoire : `docs/schema_google_sheets.md`
- Configuration Codespaces : `docs/CONFIGURATION_CODESPACES_CODEX.md`
