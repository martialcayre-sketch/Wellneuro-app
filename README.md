# Wellneuro

Wellneuro est une application web praticien-patient de neuronutrition clinique, en production sur **Next.js 14 + NextAuth (Google) + Prisma + PostgreSQL (Supabase)**, déployée sur **Vercel** (`app.wellneuro.fr`).

La migration depuis le MVP Google Apps Script (GAS) a débuté le 2026-06-29 et s'est achevée le 2026-07-03 (décommission du déploiement GAS, lot C5). Le code GAS historique est archivé dans `archive/gas-legacy/`.

## Périmètre actuel

- Application dans `web/` : portail praticien (`/dashboard/*`) et portail patient (`/patient/[idAssignation]`).
- Authentification praticien via Google / NextAuth, restreinte au domaine `@wellneuro.fr`.
- PostgreSQL (Prisma) est la base cible pour patients, assignations, réponses, synthèses IA et booklets.
- **Point de vigilance** : certaines routes API (`metrics`, `patients`, `assignations`, `questionnaires`, `reponses`, `migrate-historique`) interrogent encore directement l'API Google Sheets via `SHEET_ID` en parallèle de PostgreSQL. Le déploiement GAS (web app + déclencheurs) est arrêté, mais cette dépendance Sheets côté Next.js n'est pas encore retirée — voir `docs/claude/PROJET_CONTEXTE.md`.

## Sécurité indispensable

- Ne jamais écrire de secret en dur dans le code (`DATABASE_URL`, `SHEET_ID`, clés API, secrets OAuth).
- Ne jamais committer de données patients réelles, identifiants Google, clés API, exports CSV/XLSX, résultats biologiques ou questionnaires remplis réels.
- Les patients Sophie Nicola, Jennifer Martin et Michel Dogné sont exclusivement des patients fictifs de test.
- Les liens patients doivent rester non prédictibles et expirables.
- Tout HTML généré à partir de données patient, praticien ou IA doit être échappé avant rendu ou envoi.

## Installation locale

```bash
cd web
npm install
npm run prisma:generate
cp .env.local.example .env.local   # puis renseigner les valeurs (jamais commiter .env.local)
npm run dev                        # http://localhost:3000
```

## Vérifications

```bash
bash scripts/check_no_secrets.sh
cd web && npm run type-check
cd web && npm run lint
```

## Setup Supabase Prisma Vercel

Configuration recommandée pour la stack Next.js en production :

```bash
# 1) Installer les dépendances et générer le client Prisma
cd web
npm install
npm run prisma:generate

# 2) Configurer Supabase CLI
supabase login
export SUPABASE_PROJECT_REF=<project-ref>
npm run supabase:link

# 3) Appliquer les migrations sur la base cible
npm run prisma:migrate:deploy

# 4) Vérifier le projet
npm run type-check
```

Variables obligatoires côté Vercel :

- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `DATABASE_URL` (pooler Supabase, avec `sslmode=require` et `uselibpqcompat=true`)
- `SHEET_ID` (encore utilisé par plusieurs routes praticien, voir ci-dessus)
- `SMTP_URL`
- `ANTHROPIC_API_KEY`

Contrôle OAuth Google Cloud Console (production) :

- Origine JavaScript : `https://app.wellneuro.fr`
- Redirect URI : `https://app.wellneuro.fr/api/auth/callback/google`

## Documentation

- Contexte projet et état actuel : `docs/claude/PROJET_CONTEXTE.md`
- Roadmap : `docs/roadmap.md`
- Sécurité RGPD : `docs/securite_rgpd.md`
- Checklist de validation end-to-end : `docs/checklist_tests_end_to_end.md`
- Runbook incident Vercel/DNS : `docs/claude/CONTEXTE_SESSION_VERCEL_2026-07-01.md`
