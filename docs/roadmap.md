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
| **R1** | Validation E2E du parcours patient unifié (`/portail/[token]`) sur patient fictif — voir `docs/checklist_tests_end_to_end.md`, Phase 0 | ✅ Validé (2026-07-10) — reste le test tactile sur téléphone réel |
| **R2** | Finalisation du pack « Base de consultation » (contenu, ordre, anti-doublon anamnèse, rendu mobile, `par_defaut`) | ✅ Validé (2026-07-10) |
| **R3** | Transition progressive vers le registre relationnel (lecture primaire `questionnaire_packs`, fallback `packs.qids`, rapport d'écarts, aucune migration destructive) | ✅ Livré (2026-07-10, commit `3f367a7`) — statut corrigé le 2026-07-10, était resté à tort « à faire » ; validation navigateur des routes d'assignation manquante → R9 |
| **R4** | Harmonisation UX patient / design system (tokens deep teal / champagne gold, statut jamais codé par la seule couleur, mobile first) | ✅ Livré (2026-07-10, commit `eaad01a`) — statut corrigé le 2026-07-10, était resté à tort « à faire » ; validation navigateur réelle manquante → R9 |
| **R5** | Validation de la synthèse IA enrichie (scénarios fiche/anamnèse/alerte/traitements/DNSM, dégradation gracieuse) | ⏳ À faire |
| **R6** | Stabilisation build/tests/go-no-go (aligné sur `.claude/skills/wn-r6/SKILL.md` : type-check, lint, scoring-check, no-secrets, build, vérification ciblée parcours patient, diff review) — pas de nouvelle fonctionnalité | 🔒 Gelé tant que R0→R5 non validés |

## Piste technique transverse — R7 / R8 (fiabilisation, indépendante de la séquence produit R0→R6)

Décidée le 2026-07-10 suite à une revue critique de l'organisation du projet (process, outillage Claude Code, stack). Ces deux lots ne bloquent pas et ne sont pas bloqués par R3→R6 : exécutables à tout moment, y compris en parallèle du reste. Détail complet : entrée SESSION_LOG du 2026-07-10.

| Lot | Objet | Statut |
|---|---|---|
| **R7** | Hygiène repo/doc : `.gitattributes` (fin de ligne LF), réalignement de `docs/claude/REGLES_CRITIQUES.md` (mention obsolète Sheets/`SHEET_ID` encore requis, à corriger pour cohérence avec `PROJET_CONTEXTE.md`), nettoyage racine (`.clasp.example.json`/`.claspignore` → `archive/gas-legacy/` ou suppression, `wellneuro_claude_automation_kit.zip`, `package-lock.json` racine stub), peuplement de la mémoire persistante Claude Code (`memory/`) avec les invariants déjà validés (dry-run avant écriture prod, format SESSION_LOG) | ✅ Livré (2026-07-10) |
| **R8** | Filet de sécurité technique : CI GitHub Actions minimale (type-check + `scoring-check` + `check_no_secrets.sh` + lint, sans secrets prod dans un premier temps), tests unitaires (vitest) sur les fonctions déterministes existantes (scoring, `miniSynthese.ts`, `contexteClinique.ts`, `resolvePackQuestionnaireIds`), formalisation en tests Playwright commités des parcours critiques (session portail, verrouillage/déverrouillage réponse) au lieu de les réinstaller puis jeter à chaque lot (cf. risques résiduels R1/R4) | ⏳ À faire |

> Définition de **R6** tranchée le 2026-07-10 (R10, point 1) : c'est celle de `.claude/skills/wn-r6/SKILL.md` qui fait foi (stabilisation build/tests/go-no-go). Le contenu « moteur clinique avancé » (priorisation, protocoles 21 jours, boussole alimentaire, compléments clean label) précédemment décrit sous R6 n'est pas perdu : il est déjà couvert par les modules produit de `docs/claude/ROADMAP_AGENT_PLAN.md` (série D/R — protocole 21j, arborescence `corpus/`).

## R9 / R10 — Clôture des points en suspens R0→R6 (ajoutée le 2026-07-10)

> ⚠️ Collision de numérotation à noter : ce fichier et `docs/claude/ROADMAP_AGENT_PLAN.md` utilisent tous les deux un préfixe « R » avec des sens différents (ex. « R3 »/« R4 » désignent ici la consolidation technique du parcours patient, et dans `ROADMAP_AGENT_PLAN.md` « Fiches conseils & recettes »/« Protocole builder »). `R9` ci-dessous entre également en collision avec le « R9 — Mon équilibre » de ce même fichier. Numérotation locale à ce fichier uniquement — à désambiguïser un jour (préfixe distinct pour l'une des deux séquences), non traité ici pour rester dans le périmètre demandé.

Consolidation des « Questions ouvertes » et risques résiduels laissés par les entrées SESSION_LOG des lots R0 à R6 (détail : entrée SESSION_LOG du 2026-07-10 « Clôture des questions en suspens R0→R6 »).

| Lot | Objet | Statut |
|---|---|---|
| **R9** | Clôture technique R0→R4 : (1) email retiré de la query string sur le hub patient unifié (`ConsultationScreen`, `MonEquilibreAccueil`, `MonEquilibreDetail`), qui s'appuient désormais uniquement sur la session cookie ; parcours legacy `/patient/[idAssignation]` (sans cookie) volontairement inchangé ; (2) validation navigateur réelle R2/R3/R4 ; (3) test tactile téléphone réel R1 | ✅ Validé (2026-07-10) |
| **R10** | Décisions produit tranchées le 2026-07-10 : (1) définition de R6 = celle de `wn-r6/SKILL.md` (stabilisation), voir note ci-dessus ; (2) lien portail patient exposé dans le frontend praticien (bouton « Copier le lien » dans `PatientsPanel.tsx`, en plus de l'email existant) ; (3) pas de calendrier de décommission de `packs.qids` — reste en statut « surveillance » ; (4) `QuestionnaireDefinition.niveau`/`.publicCible` : statut « surveillance » inchangé, pas d'action requise maintenant | ✅ Tranché (2026-07-10) |

Points mineurs pré-R0, non bloquants, à traiter opportunément (R7 ou un futur lot produit) : enrichir `MOTIFS_CONSULTATION` (1er RDV, suivi…) ; décider d'exposer la mini-synthèse déterministe côté portail patient (masquage de `protocol`) ; décider d'exposer le contexte clinique dans le booklet patient ; standardiser la procédure locale Supabase + Prisma dans la doc ; retirer l'avertissement `supabase/seed.sql` absent si non pertinent.

## Hors périmètre (sauf demande explicite)

- Hébergement HDS certifié (requis si données de santé réelles en production)
- Import massif PDF SIIN / RAG vectoriel complet (corpus plein, pas mini-corpus)
- Génération PDF native (actuellement HTML + impression navigateur)
- Signature électronique praticien sur le booklet
- Coaching patient autonome
- Auth0 / SSO praticien multi-établissement

> Note : le « portail patient autonome avec historique des questionnaires » (auparavant hors périmètre) est **livré** — hub « Mes questionnaires » avec consultation permanente des réponses (portail `/portail/[token]`).
