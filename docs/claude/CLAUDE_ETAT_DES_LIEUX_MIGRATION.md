# CLAUDE CODE - Etat des lieux migration Wellneuro
# Wellneuro NNPP2 - reprise de developpement (C2/C3)

> Document de handoff operationnel pour reprendre rapidement la migration.
> A utiliser en complement de `CLAUDE_SESSION_BOOTSTRAP.md` et `CLAUDE_SESSION_MIGRATION_PRO.md`.
> Mis a jour le 2026-06-30 (session 2).

---

## 1) Resume executif

La migration web Next.js est sortie du simple scaffold:

- Lot 0 est livre (auth Google, login, dashboard protege).
- Lot C2 est implemente et valide en pratique (metriques dashboard depuis Google Sheets API).
- Lot C3 est code-complete et utilisable en lecture + creation:
  - liste patients,
  - liste assignations recentes,
  - creation patient,
  - creation assignation questionnaire.
  (Tests E2E en attente de config env locale complete.)
- C4/C5 ne sont pas demarres fonctionnellement.

Le MVP GAS reste la reference production tant que C3/C4 ne sont pas valides en prod.

---

## 2) Regles non negociables (rappel)

- Ne jamais committer de secret (`GOOGLE_CLIENT_SECRET`, `SHEET_ID`, tokens, cles API).
- Ne jamais committer de donnees patient reelles.
- Ne pas modifier la logique clinique/scoring sans demande explicite.
- `src/gas/` reste actif en production pendant la migration.
- Verifier avant push: `bash scripts/check_no_secrets.sh`.

---

## 3) Etat reel par lot

| Lot | Statut reel | Notes |
|---|---|---|
| Lot 0 - Scaffold Next.js | Livre | Auth Google + pages login/dashboard |
| Lot C2 - Metriques lecture seule | Livre | API metriques + UI connectee a Sheets |
| Lot C3 - Patients & assignations | Livré ✅ | Lecture + création + édition patient, assignation, filtre statut — validé E2E 2026-06-30 |
| Lot C4 - IA & Booklet | Non demarre | A brancher apres stabilisation C3 |
| Lot C5 - Decommission GAS | Non demarre | Depend de validation C3/C4 en prod |

---

## 4) Backend web deja implemente (App Router API)

### C2

- `GET /api/praticien/metrics`
  - Fichier: `web/src/app/api/praticien/metrics/route.ts`
  - Role: lit les feuilles Sheets et calcule les compteurs dashboard.
  - Comportement: renvoie des `reason` explicites en cas d indisponibilite.

### C3

- `GET /api/praticien/patients`
  - Fichier: `web/src/app/api/praticien/patients/route.ts`
  - Role: retourne patients + assignations recentes.

- `POST /api/praticien/patients`
  - Fichier: `web/src/app/api/praticien/patients/route.ts`
  - Role: cree un patient (controle payload + anti-doublon email role Patient + append Sheets).

- `GET /api/praticien/questionnaires`
  - Fichier: `web/src/app/api/praticien/questionnaires/route.ts`
  - Role: charge le catalogue de questionnaires actifs.

- `POST /api/praticien/assignations`
  - Fichier: `web/src/app/api/praticien/assignations/route.ts`
  - Role: cree une assignation questionnaire (verifie patient actif + questionnaire actif + append Sheets).

### Securite appliquee

- Toutes les routes passent par session NextAuth (`getServerSession(authOptions)`).
- Restriction domaine en auth: `wellneuro.fr`.
- Scope OAuth: `spreadsheets` (lecture + ecriture Sheets) — corrige le 2026-06-30,
  necessaire pour que les POST patients/assignations n echouent pas en 403.
  Apres ce changement de scope, l utilisateur doit se deconnecter et reconnecter
  pour que Google redemande le consentement ecriture.

---

## 5) Frontend web deja implemente

- Dashboard principal
  - `web/src/app/dashboard/page.tsx`
  - `web/src/components/MetricsSection.tsx`

- Ecran patients/assignations
  - `web/src/app/dashboard/patients/page.tsx`
  - `web/src/components/PatientsPanel.tsx`

- Navigation praticien
  - `web/src/components/NavBar.tsx`
  - Liens Dashboard + Patients + deconnexion.

Parcours actuellement possible:

1. Login Google (`/login`)
2. Consultation metriques dashboard (`/dashboard`)
3. Consultation patients + assignations (`/dashboard/patients`)
4. Creation patient
5. Creation assignation questionnaire

---

## 6) Configuration requise pour un environnement local valide

Dans `web/.env.local` (fichier local non committe):

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` (localhost:3000 en local)
- `SHEET_ID`
- `GAS_API_URL` (optionnel, lien fallback)

A verifier dans Google Cloud Console:

- API Google Sheets activee sur le projet OAuth.
- URI OAuth autorises pour localhost:3000:
  - origine JS,
  - callback `/api/auth/callback/google`.

---

## 7) Risques / vigilance court terme

- Pagination absente sur listes patients/assignations (volume futur).
- Validation metier a renforcer (formats date, longueurs notes, sanitization plus stricte).
- Messages d erreur techniques visibles en UI (acceptable en interne, a reduire avant prod).
- Ecriture encore sur Google Sheets (pas encore PostgreSQL).

---

## 8) Plan de reprise concret (prochaine session Claude)

### Deblocage env local (prerequis avant tout test)

1. Completer `web/.env.local` (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXTAUTH_SECRET, NEXTAUTH_URL, SHEET_ID).
2. Redemarrer `npm run dev`.
3. Se deconnecter et reconnecter Google (nouveau consentement scope ecriture Sheets).

### Sprint C3.1 - Validation fonctionnelle

- [x] Correction scope OAuth `spreadsheets.readonly` -> `spreadsheets` (POST patients/assignations).
- [x] Validation serveur durcie sur POST /patients (longueurs, format date, message d erreur precise).
- [x] Validation serveur durcie sur POST /assignations (longueurs, format date, email).
- [x] PATCH /api/praticien/patients (edition telephone et actif via batchUpdate Sheets).
- [x] Filtre statut sur tableau assignations (cote client).
- [x] Messages d erreur UI lisibles (francais, sans code technique).
- [x] Bouton Modifier patient inline (edition telephone + actif OUI/NON).
- [x] Correction check_no_secrets.sh (exclusion node_modules, .next, .env.local).
- [x] Tests E2E avec Sophie Nicola, Jennifer Martin, Michel Dogne — validés le 2026-06-30.

## Sprint C3.2 - Preparation migration DB

1. Introduire schema PostgreSQL cible (patients, assignations, questionnaires).
2. Brancher une couche repository pour decoupler API de Sheets.
3. Ajouter feature flag de source de donnees (Sheets vs PG).
4. Preparer script de migration initiale de donnees.

## Sprint C4.1 - IA et booklet (apres C3 stable)

1. Endpoint de generation synthese IA.
2. Workflow validation praticien.
3. Generation booklet HTML/PDF.
4. Tracabilite audit sans fuite de donnees sensibles.

---

## 9) Definition de done mise a jour

### C3

- Creation patient et assignation operationnelles sans erreur bloquante.
- Donnees visibles dans l UI apres creation.
- Tests E2E passes sur patients fictifs autorises.
- Pas de secret et pas de regression sur auth/session.

### C4

- Synthese IA + validation praticien + generation booklet operationnels.
- Logs conformes RGPD (pas de fuite email/ID en clair hors necessite operationnelle).

### C5

- C2/C3/C4 stables en production sur periode de validation.
- Decommission GAS planifiee et executee flux par flux.

---

## 10) Commandes utiles reprise rapide

```bash
cd web && npm run dev
cd web && npm run build
cd web && npm run type-check
bash scripts/check_no_secrets.sh
```

---

## 11) Mini changelog interne du document

- 2026-06-30: creation du document de handoff; etat reel C2/C3 aligne avec implementation web actuelle.
- 2026-06-30 (session 2): correction scope OAuth spreadsheets.readonly -> spreadsheets (bug bloquant POST C3);
  plan de reprise mis a jour avec prerequis env local.
- 2026-06-30 (session 2 suite): Sprint C3.1 livre et valide — validation serveur durcie, PATCH patient,
  filtre statut assignations, messages UI lisibles, check_no_secrets.sh corrige.
  Tests E2E passes sur les 3 patients fictifs. Lot C3 clos.
