# CLAUDE.md

Ce fichier donne le contexte essentiel a Claude IA pour intervenir sur Wellneuro NNPP2.

## Objectif projet

Wellneuro NNPP2 est une application de consultation en neuronutrition en production sur **Next.js 14 (App Router) + Prisma + PostgreSQL (Supabase) + NextAuth**, deployee sur **Vercel** (`app.wellneuro.fr`).
Le deploiement Google Apps Script (GAS) historique a ete decommissionne le 2026-07-03 (web app + declencheurs arretes) ; le code est archive dans `archive/gas-legacy/` a titre de reference et n'est plus execute.
**Attention** : certaines routes Next.js (`api/praticien/metrics`, `api/praticien/patients`, `api/praticien/assignations`, `api/praticien/questionnaires`, `api/praticien/reponses`, `api/praticien/migrate-historique`) interrogent encore directement l'API Google Sheets via `SHEET_ID` + le token OAuth du praticien, en parallele de PostgreSQL (ecriture best-effort). Google Sheets n'est donc pas totalement retire du perimetre applicatif malgre la decommission du deploiement GAS — voir `docs/claude/PROJET_CONTEXTE.md`.
Priorite absolue: stabilite de l'application en production, pas de nouvelle migration technologique sans demande explicite.

## Regles critiques

- Ne jamais committer de donnees patients reelles.
- Ne jamais committer de secrets (API keys, OAuth, `.env*` reels, credentials Supabase/Vercel).
- Ne jamais coder en dur `DATABASE_URL`, `SHEET_ID`, cles API ou secrets OAuth dans le code source.
- Toute configuration sensible passe par les variables d'environnement (`web/.env.local` en dev, variables Vercel en production) — jamais commitees.
- Patients fictifs autorises uniquement: Sophie Nicola, Jennifer Martin, Michel Dogne.

## Fichiers coeur a connaitre

- Application Next.js: `web/src/app/` (routes `dashboard/*` praticien, `patient/[idAssignation]` portail patient, `api/*` routes serveur)
- Schema base de donnees: `web/prisma/schema.prisma`
- Catalogue questionnaires et scoring: `web/src/lib/questions.ts`
- Auth praticien (NextAuth, Google OAuth restreint a `@wellneuro.fr`): `web/src/lib/auth.ts`
- Client Prisma: `web/src/lib/prisma.ts`
- Code GAS legacy (reference uniquement, non maintenu): `archive/gas-legacy/`

## Documentation de reference

- Vue d'ensemble Claude: `docs/claude/README.md`
- Contexte projet et etat actuel: `docs/claude/PROJET_CONTEXTE.md`
- Regles de securite et clinique: `docs/claude/REGLES_CRITIQUES.md`
- Workflow de dev: `docs/claude/WORKFLOW_DEVELOPPEMENT.md`
- Templates de prompts: `docs/claude/TEMPLATES_PROMPTS.md`
- Runbook incident Vercel/DNS (reference): `docs/claude/CONTEXTE_SESSION_VERCEL_2026-07-01.md`
- Prompt caching API Claude: `docs/claude/PROMPT_CACHING.md`

## Manieres de travailler attendues

- Interface et textes utilisateur en francais.
- Noms de fonctions explicites, code lisible pour praticien non developpeur.
- Ne pas modifier la logique clinique ou les seuils sans demande explicite et documentation dans CHANGELOG.
- Limiter les changements au besoin exprime.

## Verification avant proposition de commit

```bash
bash scripts/check_no_secrets.sh
cd web && npm run type-check
```

## Definition de done pour une tache standard

- Changement limite au perimetre demande.
- Pas de regression visible dans le parcours praticien ou patient.
- Pas de secret ni donnee sensible introduits.
- Documentation mise a jour si necessaire.
