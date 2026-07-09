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

## Décommission Google Sheets — ✅ Résolu (2026-07-07)

- Les routes praticien (`metrics`, `patients`, `assignations`, `questionnaires`, `reponses`, `packs`…) lisent/écrivent désormais **exclusivement PostgreSQL** via Prisma. Plus aucun appel à `sheets.googleapis.com`.
- La route `api/praticien/migrate-historique` a été **supprimée**.
- Le scope OAuth a été réduit à `openid email profile` (`spreadsheets` retiré) et `SHEET_ID` n'est plus une variable d'environnement requise.
- Le code GAS reste archivé dans `archive/gas-legacy/` (référence uniquement).

## Dette technique restante

- **Registre relationnel packs/questionnaires** : faire du registre normalisé (`questionnaire_packs`, `pack_questionnaires`…) la source de lecture principale, avec fallback temporaire `packs.qids`, puis décommission de `packs.qids` (lot R3).
- Pagination patients/assignations : nécessaire si le volume dépasse ~100 lignes.
- Fallback `http://localhost:3000` sur `NEXTAUTH_URL` dans `api/praticien/assignations/route.ts` (signalé dans le runbook du 2026-07-01) — vérifier qu'il ne peut pas produire de lien incorrect en production.

## Roadmap de reprise R0 → R6 (2026-07-09)

Principe directeur : **consolider avant d'évoluer**. Ordre recommandé, chaque lot conditionne le suivant.

| Lot | Objet | Statut |
|---|---|---|
| **R0** | Réalignement documentaire (docs au niveau réel du code : décommission Sheets, portail patient unifié, registre relationnel, synthèse IA enrichie) | 🟡 En cours |
| **R1** | Validation E2E du parcours patient unifié (`/portail/[token]`) sur patient fictif — voir `docs/checklist_tests_end_to_end.md`, Phase 0 | ⏳ Prochaine action |
| **R2** | Finalisation du pack « Base de consultation » (contenu, ordre, anti-doublon anamnèse, rendu mobile, `par_defaut`) | ⏳ À faire |
| **R3** | Transition progressive vers le registre relationnel (lecture primaire `questionnaire_packs`, fallback `packs.qids`, rapport d'écarts, aucune migration destructive) | ⏳ À faire |
| **R4** | Harmonisation UX patient / design system (tokens deep teal / champagne gold, statut jamais codé par la seule couleur, mobile first) | ⏳ À faire |
| **R5** | Validation de la synthèse IA enrichie (scénarios fiche/anamnèse/alerte/traitements/DNSM, dégradation gracieuse) | ⏳ À faire |
| **R6** | Préparation du moteur clinique avancé (priorisation, protocoles 21 jours, boussole alimentaire, compléments clean label) — **déterministe, traçable, séparé de la narration IA** | 🔒 Gelé tant que R0→R5 non validés |

## Hors périmètre (sauf demande explicite)

- Hébergement HDS certifié (requis si données de santé réelles en production)
- Import massif PDF SIIN / RAG vectoriel complet (corpus plein, pas mini-corpus)
- Génération PDF native (actuellement HTML + impression navigateur)
- Signature électronique praticien sur le booklet
- Coaching patient autonome
- Auth0 / SSO praticien multi-établissement

> Note : le « portail patient autonome avec historique des questionnaires » (auparavant hors périmètre) est **livré** — hub « Mes questionnaires » avec consultation permanente des réponses (portail `/portail/[token]`).
