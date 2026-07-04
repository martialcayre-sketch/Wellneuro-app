# Roadmap Wellneuro NNPP2

## Migration GAS → Next.js — terminée (2026-06-29 → 2026-07-03)

| Lot | Contenu | Statut |
|---|---|---|
| Lot 0 — Scaffold Next.js | App web `web/`, auth Google (NextAuth), login page, dashboard praticien | ✅ Livré |
| Lot C2 — Métriques dashboard | `GET /api/praticien/metrics` | ✅ Livré |
| Lot C3 — Patients & assignations | CRUD patients, assignations, résultats questionnaires | ✅ Livré |
| Lot C4 — IA & Booklet | Synthèse IA (Anthropic), booklet HTML, envoi SMTP, PostgreSQL via Prisma | ✅ Livré, validé E2E 2026-06-30 |
| Lot C5 — Décommission GAS | Migration historique Sheets → Supabase exécutée en prod, déclencheur `sendReminders` supprimé, déploiement GAS retiré, `src/gas/` archivé dans `archive/gas-legacy/` | ✅ Livré 2026-07-03 |

`app.wellneuro.fr` est l'unique point d'entrée en production.

## Dette technique restante

- **Dépendance Google Sheets non retirée côté Next.js** : les routes `api/praticien/metrics`, `patients`, `assignations`, `questionnaires`, `reponses`, `migrate-historique` lisent/écrivent encore directement l'API Google Sheets (`SHEET_ID` + token OAuth praticien) en parallèle de PostgreSQL. Le déploiement Apps Script est arrêté, mais ce couplage applicatif persiste. À planifier : bascule de ces routes en lecture/écriture PostgreSQL exclusive, puis retrait du scope OAuth `spreadsheets`.
- Pagination patients/assignations : nécessaire si le volume dépasse ~100 lignes.
- Fallback `http://localhost:3000` sur `NEXTAUTH_URL` dans `api/praticien/assignations/route.ts` (signalé dans le runbook du 2026-07-01) — vérifier qu'il ne peut pas produire de lien incorrect en production.

## Hors périmètre (sauf demande explicite)

- Hébergement HDS certifié (requis si données de santé réelles en production)
- Import massif PDF SIIN / RAG vectoriel complet (corpus plein, pas mini-corpus)
- Génération PDF native (actuellement HTML + impression navigateur)
- Signature électronique praticien sur le booklet
- Portail patient autonome avec historique des questionnaires
- Coaching patient autonome
- Auth0 / SSO praticien multi-établissement
