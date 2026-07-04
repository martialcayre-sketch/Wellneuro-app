# Contexte projet — Wellneuro NNPP2

> Rédigé le 2026-07-03, après la fin de la migration GAS → Next.js. Ce fichier remplace les anciens documents de suivi de migration (`PROJET_CONTEXTE.md` historique, `ETAT_MIGRATION_*.md`) : il décrit l'état courant, pas un historique de lots.

## Ce qu'est Wellneuro NNPP2

Application de consultation en neuronutrition clinique, à deux portails :
- **Portail praticien** (`/dashboard/*`) : gestion patients, assignation de questionnaires, génération de synthèse IA, envoi de booklets.
- **Portail patient** (`/patient/[idAssignation]`) : accès public par lien non prédictible, email gate, remplissage de questionnaires.

Production : `https://app.wellneuro.fr` (Vercel).

## Stack technique

| Couche | Techno |
|---|---|
| Framework web | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Auth praticien | NextAuth 4, provider Google, restreint au domaine `@wellneuro.fr` |
| Base de données | PostgreSQL (Supabase), via Prisma 7 + Driver Adapter (`@prisma/adapter-pg`) |
| IA clinique | Anthropic SDK (`ANTHROPIC_API_KEY`), prompt caching activé — voir `docs/claude/PROMPT_CACHING.md` |
| Email | Nodemailer / SMTP (`SMTP_URL`) |
| Hébergement | Vercel (`rootDirectory: web/`, `framework: nextjs`) |

## Arborescence utile

- `web/src/app/dashboard/*` — pages praticien (patients, synthèse, métriques)
- `web/src/app/patient/[idAssignation]` — portail patient
- `web/src/app/api/praticien/*` — routes serveur praticien (patients, assignations, questionnaires, synthèse, booklet, metrics, migrate-historique)
- `web/src/app/api/patient/*` — routes serveur patient (questionnaire, submit)
- `web/src/lib/questions.ts` — catalogue des questionnaires (67, portés depuis `Questions.gs`) et moteur de scoring
- `web/src/lib/auth.ts` — configuration NextAuth
- `web/src/lib/prisma.ts` — client Prisma
- `web/prisma/schema.prisma` — schéma de données : `Patient`, `Assignation`, `QuestionnaireReponse`, `SyntheseIA`, `AuditSynthese`, `BookletEnvoi`
- `archive/gas-legacy/` — ancien code Google Apps Script (`Code.gs`, `Questions.gs`, `index.html`, `appsscript.json`), gelé, référence historique uniquement

## État de la migration

La migration depuis le MVP Google Apps Script + Google Sheets a été menée en stratégie *strangler pattern* du 2026-06-29 au 2026-07-03 (lots 0, C2, C3, C4, C5). Le lot C5 (2026-07-03) a :
- exécuté la migration historique des données Sheets → Supabase en production ;
- supprimé le déclencheur `sendReminders` côté Apps Script ;
- retiré le déploiement web Apps Script ;
- archivé `src/gas/` dans `archive/gas-legacy/` (commit `2269f91`), puis supprimé les artefacts clasp restants (commit `198f80b`).

`app.wellneuro.fr` (Next.js) est désormais l'unique point d'entrée applicatif. Le MVP GAS est hors service.

## Point de vigilance important : Google Sheets n'a pas totalement disparu

Décommissionner le **déploiement** Apps Script (web app + déclencheurs) n'a pas retiré la **dépendance à l'API Google Sheets** dans le code Next.js. Ces routes appellent encore directement `sheets.googleapis.com` avec `SHEET_ID` + le token OAuth du praticien connecté, en parallèle (best-effort) de PostgreSQL :

- `api/praticien/metrics`
- `api/praticien/patients`
- `api/praticien/assignations`
- `api/praticien/questionnaires`
- `api/praticien/reponses`
- `api/praticien/migrate-historique`

Conséquences pratiques :
- Le scope OAuth NextAuth inclut toujours `https://www.googleapis.com/auth/spreadsheets` (voir `web/src/lib/auth.ts`).
- `SHEET_ID` reste une variable d'environnement obligatoire en production, pas un vestige.
- Toute tâche touchant ces routes doit tenir compte des deux sources (Sheets + PostgreSQL), pas de PostgreSQL seul.

C'est la principale dette technique héritée de la migration — voir `docs/roadmap.md` pour le plan de bascule complet vers PostgreSQL exclusif.

## Sécurité, RGPD, clinique — invariants

- Patients fictifs autorisés dans le dépôt : **Sophie Nicola, Jennifer Martin, Michel Dogne**. Aucun autre nom, aucune donnée patient réelle.
- Secrets et configuration sensible (`DATABASE_URL`, `SHEET_ID`, `ANTHROPIC_API_KEY`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, `SMTP_URL`) uniquement via variables d'environnement (`web/.env.local` en dev, variables Vercel en prod) — jamais en dur, jamais commitées.
- Ne pas modifier la logique clinique ou les seuils de scoring sans demande explicite documentée dans `CHANGELOG.md`.
- Vérification avant tout commit : `bash scripts/check_no_secrets.sh` et `cd web && npm run type-check`.
- Détail complet : `docs/securite_rgpd.md`, `docs/claude/REGLES_CRITIQUES.md`.

## Incidents et runbooks

- Incident 404 production / DNS / config Vercel (2026-07-01), résolu — configuration de référence du projet Vercel (`projectId`, `rootDirectory`, variables d'env prod) : `docs/claude/CONTEXTE_SESSION_VERCEL_2026-07-01.md`.

## Ce qui reste ouvert (hors périmètre sauf demande explicite)

- Bascule des routes praticien listées ci-dessus vers PostgreSQL exclusif (retrait de la dépendance Sheets).
- Pagination patients/assignations si le volume dépasse ~100 lignes.
- Hébergement HDS certifié (nécessaire uniquement si données de santé réelles en production).
- RAG SIIN complet (le prompt système utilise un mini-corpus, pas le corpus plein).
- Génération PDF native (actuellement HTML + impression navigateur), signature électronique du booklet.
- Portail patient autonome avec historique, coaching patient autonome, SSO praticien multi-établissement.

## Où regarder pour aller plus loin

- Règles de travail détaillées : `docs/claude/REGLES_CRITIQUES.md`, `docs/claude/WORKFLOW_DEVELOPPEMENT.md`
- Templates de prompts : `docs/claude/TEMPLATES_PROMPTS.md`
- Roadmap et dette technique : `docs/roadmap.md`
- Checklist de test manuel E2E : `docs/checklist_tests_end_to_end.md`
- Historique des changements fonctionnels : `CHANGELOG.md`
