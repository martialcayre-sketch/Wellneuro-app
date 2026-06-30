# État de la migration Wellneuro NNPP2
> Arrêté au 2026-06-30 — Dr Martial Cayre

---

## Ce qui est fait

### Lot 0 — Infrastructure web
- Scaffold Next.js 14 App Router, TypeScript, Tailwind
- Auth Google OAuth via NextAuth 4, restreint au domaine `@wellneuro.fr`
- Page login, layout protégé, NavBar praticien
- Connexion PostgreSQL locale via Prisma 7 + Driver Adapter (`pg.Pool`)
- Devcontainer Docker parité local ↔ Codespaces

### Lot C2 — Métriques dashboard
- `GET /api/praticien/metrics` : lit Google Sheets, calcule 4 compteurs
- `MetricsSection` : patients actifs, assignations en attente, questionnaires complétés, synthèses

### Lot C3 — Gestion patients & assignations (Sheets)
- **Patients** : liste, création, édition (téléphone, statut), suppression
  - Suppression : hard-delete dans Sheets + soft-delete PostgreSQL (`actif: false`)
- **Assignations** : liste avec filtre statut, création avec validation email + questionnaire
- **Résultats questionnaires** : affichage par patient (lecture depuis Sheets + PostgreSQL)
- Validation serveur durcie sur tous les POST/PATCH
- Messages d'erreur UI en français

### Sprint C3.2 — Double écriture Sheets → PostgreSQL
Toutes les écritures praticien sont désormais répercutées en PG de façon *best-effort* (non bloquante) :
- `POST /patients` → `prisma.patient.upsert`
- `PATCH /patients` → `prisma.patient.updateMany`
- `DELETE /patients` → `prisma.patient.updateMany({ actif: false })`
- `POST /assignations` → `prisma.assignation.upsert`

### Lot C4 — Synthèse IA + Booklet + SMTP
- Seed 3 patients fictifs autorisés en PostgreSQL : Sophie Nicola, Jennifer Martin, Michel Dogne (5 questionnaires chacun)
- `GET /api/praticien/synthese` : génération synthèse IA via Anthropic SDK (prompt caching)
- Validation praticien obligatoire avant envoi
- `GET/POST /api/praticien/booklet` : génération HTML + envoi nodemailer
  - SMTP : authentification sur `martialcayre@wellneuro.fr` (App Password), expéditeur `noreply@wellneuro.fr` (alias Workspace)
  - Anti-double-envoi, confirmation relecture obligatoire, audit `BookletEnvoi` en PG
- **Validé E2E le 2026-06-30**, email booklet reçu

### Portail patient
- Page publique `/patient/[idAssignation]` (aucune auth Google requise)
- **Email gate** : le patient saisit son email → vérification vs assignation PG
- **Moteur questionnaire** : rendu section par section, support `likert` / `number` / `select`
- **Q_PLAINTES** : questionnaire spécial à sliders 1–10 (7 dimensions)
- Port complet du catalogue `Questions.gs` → `web/src/lib/questions.ts` (67 questionnaires, scoring intégral)
- `POST /api/patient/submit` : calcul score + sauvegarde `QuestionnaireReponse` PG + statut assignation → Complété + accusé de réception email patient
- `POST /api/praticien/assignations` : envoi automatique du lien questionnaire au patient à la création
- Vue résultats praticien : lecture Sheets + PG (merge, dédupliqué)
- **Validé E2E le 2026-06-30**

---

## Architecture actuelle

```
Google Sheets  ←──── source de vérité GAS (production actuelle)
     │
     │  double écriture best-effort (non bloquante)
     ▼
PostgreSQL     ←──── cible Next.js (patients, assignations, réponses, synthèses, booklets)
     │
     │  lecture primaire
     ▼
Next.js App    ──── portail praticien (/dashboard/*)
               ──── portail patient  (/patient/[idAssignation])
```

**Pendant la migration** : Sheets reste autoritaire pour les patients GAS existants. Les nouveaux flux passent par Next.js + PG. Les réponses soumises via portail patient Next.js vont en PG uniquement (pas de service account Sheets).

---

## Ce qui reste à faire

### Court terme — avant mise en production

| Tâche | Priorité | Notes |
|-------|----------|-------|
| Déploiement production (Vercel + Supabase ou infra HDS) | Haute | Choisir hébergeur selon contraintes RGPD/HDS |
| Variables d'environnement production (`SHEET_ID`, `GOOGLE_CLIENT_*`, `ANTHROPIC_API_KEY`, `SMTP_URL`, `DATABASE_URL`) | Haute | Ne jamais committer |
| Domaine `app.wellneuro.fr` + callback OAuth à mettre à jour dans GCP | Haute | Ajouter l'URI de prod dans Google Cloud Console |
| Tests avec vrais patients (non fictifs) sur env de staging | Haute | Respecter les règles RGPD |
| Pagination patients/assignations | Moyenne | Nécessaire si volume > ~100 lignes |

### Lot C5 — Décommission GAS
> Démarré le 2026-06-30 sur demande explicite (avant la fenêtre des 2 semaines de prod stable initialement prévue)

- ✅ `POST /api/praticien/migrate-historique` — migration idempotente Sheets → PostgreSQL (patients, assignations, réponses), mode `dryRun` disponible. **Pas encore exécuté en prod.**
- 🔲 Rediriger `WEB_APP_URL` (Script Property GAS) vers `app.wellneuro.fr` — **action manuelle console Apps Script, hors portée Claude Code**
- 🔲 Exécuter la migration historique réelle (après vérification dryRun)
- Éteindre flux GAS un par un :
  1. Portail patient (remplacé par `/patient/[idAssignation]`) ✅ prêt
  2. Création/gestion patients (remplacé par `/dashboard/patients`) ✅ prêt
  3. Assignations (remplacé par `/dashboard/patients`) ✅ prêt
  4. Synthèse IA + booklet (remplacé par `/dashboard/synthese`) ✅ prêt
  5. Métriques (remplacé par `/dashboard`) ✅ prêt
- Archiver `src/gas/` dans une branche `archive/gas-legacy`
- Révoquer le déploiement GAS (Google Apps Script) — **action manuelle console Apps Script**

### Hors périmètre MVP (décisions futures)

- Portail patient autonome avec historique des questionnaires
- Génération PDF native (actuellement HTML + impression navigateur)
- Signature électronique praticien sur le booklet
- RAG SIIN complet (corpus plein, pas mini-corpus)
- Rappels automatiques patients (actuellement GAS gère les rappels)
- Auth0 / SSO praticien multi-établissement
- Hébergement HDS certifié (requis si données de santé réelles en production)

---

## Règles qui restent en vigueur

- Ne jamais committer de secrets (API keys, `.env.local`, `.clasp.json`)
- Ne jamais committer de données patients réelles
- `SHEET_ID` uniquement via `PropertiesService` côté GAS, via env var côté Next.js
- Patients fictifs de test autorisés : Sophie Nicola, Jennifer Martin, Michel Dogne
- Vérifier avant tout commit : `bash scripts/check_no_secrets.sh`
- Logique clinique et seuils de scoring : ne pas modifier sans demande explicite documentée dans `CHANGELOG.md`
