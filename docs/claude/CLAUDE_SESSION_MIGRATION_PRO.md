# CLAUDE CODE — Contexte migration stack moderne
# Wellneuro NNPP2 — Apps Script → Next.js + Google Auth + Cloud Run + PostgreSQL

> Coller ce fichier au début d'une session Claude Code dédiée à la migration.
> Complète CLAUDE_SESSION_BOOTSTRAP.md (règles de base) sans le remplacer.
> Pour un point de reprise rapide orienté exécution, utiliser aussi CLAUDE_ETAT_DES_LIEUX_MIGRATION.md.
> Mis à jour le 2026-06-29.

---

## Contexte produit

Wellneuro NNPP2 est un parcours de consultation en neuronutrition clinique (praticien → patient).
Le MVP est Google Apps Script + Google Sheets. La migration vers une stack moderne a été décidée
et démarrée le **2026-06-29**, selon une stratégie **progressive (strangler pattern)** — Apps Script
reste actif en production pendant toute la transition.

Compte Google Workspace actif : `martialcayre@wellneuro.fr`.
Patients fictifs autorisés pour les tests : Sophie Nicola, Jennifer Martin, Michel Dogné.
Aucune donnée patient réelle ni secret ne doit être commité.

---

## Règles non négociables (valables pendant toute la migration)

- Jamais de `SHEET_ID`, `GOOGLE_CLIENT_SECRET`, `ANTHROPIC_API_KEY` ou token en dur.
- Pas de modification de la logique clinique (scores, seuils, questionnaires) sans demande explicite.
- `src/gas/` reste fonctionnel en production jusqu'à la validation des lots C3/C4.
- Toute évolution clinique doit être tracée dans `CHANGELOG.md`.
- `web/.env.local` ne doit jamais être commité (présent dans `.gitignore`).
- Vérifier avant tout push : `bash scripts/check_no_secrets.sh`.

---

## Architecture actuelle — deux stacks coexistantes

### Stack existante (en production)

```
src/gas/
  Code.gs          — serveur GAS: auth, assignations, scoring, synthèse IA, booklet, dashboard ops
  Questions.gs     — catalogue 60+ questionnaires, moteur de scoring clinique
  index.html       — interface Bootstrap 5.3 patient/praticien (~2300 lignes)
  appsscript.json  — manifeste GAS
```

Base de données : Google Sheets (feuilles Patients, Assignations, Rep_Questionnaires,
Syntheses_IA, Audit_Syntheses_IA, Booklet_Envois).
Déploiement GAS : `clasp push` + `clasp deploy` depuis le Codespace.
Script ID GAS : `1sRH00LvhFvjm8OJa6Yv5KmOSwHyYXFxBLjSmEtzaKoTRlOLmEwUurAWq`

### Stack cible — en cours (Lot 0 livré)

```
web/
  src/app/
    layout.tsx                          — layout global + Providers session
    page.tsx                            — redirect /login ou /dashboard
    login/page.tsx                      — page connexion Google
    dashboard/
      layout.tsx                        — layout protégé (redirect si non connecté)
      page.tsx                          — dashboard praticien, métriques placeholder
    api/auth/[...nextauth]/route.ts     — handler NextAuth (Google OAuth)
  src/components/
    Providers.tsx                       — SessionProvider client
    NavBar.tsx                          — barre navigation praticien
  src/lib/
    auth.ts                             — config NextAuth, restriction @wellneuro.fr
  globals.css
next.config.mjs                        — config Next.js (pas .ts — non supporté en Next 14)
postcss.config.cjs                     — PostCSS CommonJS (module.exports — pas export default)
tailwind.config.ts
tsconfig.json
package.json                           — Next 14.2.5, NextAuth 4, React 18, Tailwind 3
.env.local.example                     — template variables (jamais committer .env.local)
```

> Gotchas résolus lors du scaffold :
> - `next.config.ts` → erreur au démarrage → utiliser `next.config.mjs`.
> - `postcss.config.js` avec `export default` → erreur `__esModule` sur `next/font` → utiliser `postcss.config.cjs`.

---

## Variables d'environnement requises (`web/.env.local`)

```env
# Google OAuth — Projet GCP : wellneuro-app-gcp
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...

# NextAuth
NEXTAUTH_SECRET=<générer avec : openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000        # remplacer par l'URL de production

# Apps Script actuel (lien de fallback pendant la transition)
GAS_API_URL=https://script.google.com/macros/s/DEPLOYMENT_ID/exec

# API Cloud Run cible (à renseigner lors du lot C2/C3)
API_URL=
```

URI à configurer dans la console GCP (wellneuro-app-gcp) :
- Origine : `http://localhost:3000`
- Redirection : `http://localhost:3000/api/auth/callback/google`
- En production : remplacer par l'URL réelle (`https://app.wellneuro.fr`)

---

## Plan de migration par lots

| Lot | Contenu | Statut |
|---|---|---|
| **Lot 0** — Scaffold | Next.js 14, auth Google, login, dashboard skeleton | ✅ Livré 2026-06-29 |
| **Lot C2** — API lecture | Connexion métriques praticien depuis GAS ou proxy | ✅ Livré 2026-06-29 |
| **Lot C3** — Patients & assignations | CRUD patients, assignation questionnaires, scoring | ✅ Livré 2026-06-30 |
| **Lot C4** — IA & Booklet | Synthèse IA, booklet, envoi dans nouvelle stack | 🔲 Prochain |
| **Lot C5** — Décommission GAS | Retrait progressif des endpoints Apps Script validés | 🔲 Futur |

---

## Architecture cible retenue

```
Navigateur
  ↓ HTTPS
Next.js 14 App Router  — hébergé Cloud Run (ou Vercel temporairement)
  ↓ Google OAuth (NextAuth, restriction @wellneuro.fr, session JWT 8h)
  ↓ fetch() vers API REST interne
Cloud Run — API Node.js / Fastify
  ├── Cloud SQL PostgreSQL  — patients, assignations, résultats, synthèses, booklets
  ├── Cloud Storage         — booklets HTML/PDF exportés
  ├── Anthropic API         — synthèse IA (clé dans Secret Manager)
  └── Cloud Scheduler       — rappels automatiques (remplace trigger GAS)
Google Cloud Secret Manager — toutes les clés sensibles (pas de .env en prod)
```

---

## Données métier à migrer (Sheets → PostgreSQL)

| Feuille Sheets actuelle | Table PostgreSQL cible | Lot |
|---|---|---|
| Patients | `patients` | C3 |
| Assignations | `assignations` | C3 |
| Rep_Questionnaires | `questionnaire_reponses` | C3 |
| Syntheses_IA | `syntheses_ia` | C4 |
| Audit_Syntheses_IA | `audit_syntheses` | C4 |
| Booklet_Envois | `booklet_envois` | C4 |

Questionnaires et scoring (`Questions.gs`) : extraire vers JSON ou table `questionnaires`
en lot C3. Ne jamais modifier les seuils cliniques pendant l'extraction.

---

## Rôles et emails du domaine wellneuro.fr

| Email | Rôle GAS | Rôle Next.js cible |
|---|---|---|
| `martialcayre@wellneuro.fr` | Praticien + Patient (DEV) | admin + praticien |
| `contact@wellneuro.fr` | Praticien | praticien |
| `admin@wellneuro.fr` | Praticien | admin |
| `noreply@wellneuro.fr` | Expéditeur email uniquement | — (alias SMTP uniquement) |

La restriction domaine est dans `web/src/lib/auth.ts` :
```typescript
const ALLOWED_DOMAINS = ['wellneuro.fr'];
```

---

## Commandes de travail

```bash
# Front Next.js
cd web && npm run dev            # → http://localhost:3000
cd web && npm run build          # vérification production
cd web && npm run type-check     # TypeScript sans erreur

# Sécurité (obligatoire avant push)
bash scripts/check_no_secrets.sh

# Apps Script (inchangé)
clasp status
clasp push
clasp deploy -i <DEPLOYMENT_ID> -V <VERSION> -d "description"
```

---

## Règles de code pour la migration

1. **Ne pas modifier `src/gas/`** sauf pour adapter un endpoint temporaire nécessaire au front.
2. **Strangler pattern strict** : chaque lot remplace un flux GAS complet avant qu'on passe au suivant.
3. **Sécurité API** : toute route Next.js API doit appeler `getServerSession(authOptions)` et renvoyer 401 si absent.
4. **RGPD** : masquer emails dans les logs ; ne pas stocker de données patient dans les logs Cloud Run.
5. **Feature flags** : `process.env.NEXT_PUBLIC_FEATURE_*=true/false` pour activer progressivement en prod.
6. **Tests** : checklist E2E avec patients fictifs autorisés avant clôture de chaque lot.

---

## Fichiers clés par tâche

| Tâche | Fichiers |
|---|---|
| Auth / session | `web/src/lib/auth.ts`, `web/src/app/api/auth/[...nextauth]/route.ts` |
| Dashboard métriques (C2) | `web/src/app/dashboard/page.tsx`, `src/gas/Code.gs` → `getPraticienDashboard` |
| Patients / assignations (C3) | `src/gas/Code.gs` → `createPatient`, `assignQuestionnaire`; `docs/schema_google_sheets.md` |
| Questionnaires / scoring (C3) | `src/gas/Questions.gs` → `QUESTIONNAIRE_CATALOGUE`, `calculateScore` |
| Synthèse IA (C4) | `src/gas/Code.gs` → `generateAISynthesisForPatient`; `prompts/synthese_multi_questionnaires.md`; `prompts/siin_mini_corpus.md` |
| Booklet (C4) | `src/gas/Code.gs` → `generateBookletHTML`, `sendBookletToPatient`; `prompts/generation_bilan_pdf.md` |
| Sécurité | `scripts/check_no_secrets.sh`, `docs/securite_rgpd.md` |

---

## Définition de done par lot

**Lot C2** (métriques lecture seule)
- Dashboard affiche données réelles depuis API.
- Fonctionne avec message d'erreur propre si GAS indisponible.
- Aucune donnée sensible dans les logs Next.js.

**Lot C3** (patients & assignations)
- CRUD patients + assignation questionnaire opérationnel dans l'interface web.
- Scoring côté serveur Cloud Run (même logique que `Questions.gs`, seuils inchangés).
- Tests E2E avec Sophie Nicola, Jennifer Martin, Michel Dogné réussis.

**Lot C4** (IA & Booklet)
- Synthèse IA via Anthropic, validation praticien, stockage PostgreSQL.
- Booklet HTML généré, prévisualisé, envoyé manuellement avec confirmation relecture.
- Audit masqué (emails, IDs) dans les logs.

**Lot C5** (décommission GAS)
- Lots C2-C4 validés en production ≥ 2 semaines sans incident.
- Retrait de chaque trigger / endpoint GAS confirmé explicitement.
- `src/gas/` archivé, plus déployé.
