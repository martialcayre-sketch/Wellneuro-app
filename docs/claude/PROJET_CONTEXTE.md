# Contexte projet — Wellneuro NNPP2

> Rédigé le 2026-07-03, après la fin de la migration GAS → Next.js. Ce fichier remplace les anciens documents de suivi de migration (`PROJET_CONTEXTE.md` historique, `ETAT_MIGRATION_*.md`) : il décrit l'état courant, pas un historique de lots.

## Ce qu'est Wellneuro NNPP2

Application de consultation en neuronutrition clinique, à deux portails :
- **Portail praticien** (`/dashboard/*`) : gestion patients, assignation de questionnaires, packs, génération de synthèse IA, envoi de booklets.
- **Portail patient permanent** (`/portail/[token]`) : espace patient unifié, accès par token révocable (non prédictible), vérification email une seule fois + cookie signé `wn_portail`, onboarding (consentement, fiche signalétique, anamnèse) puis hub « Mes questionnaires ». **Flux patient principal.**
- **Flux patient legacy** (`/patient/[idAssignation]`) : ancien accès par lien d'assignation + email gate, conservé en compatibilité.

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
- `web/src/app/portail/[token]` — portail patient permanent (onboarding + hub « Mes questionnaires » + pages autonomes par questionnaire)
- `web/src/app/patient/[idAssignation]` — flux patient legacy (compatibilité)
- `web/src/app/api/praticien/*` — routes serveur praticien (patients, assignations, questionnaires, reponses, synthèse, booklet, metrics, packs, consultations, token)
- `web/src/app/api/portail/*` — routes serveur portail patient (session, consentement, fiche, assignations, valider)
- `web/src/app/api/patient/*` — routes serveur patient legacy (questionnaire, submit, assignations, consentement, reponses)
- `web/src/lib/questions.ts` — catalogue des questionnaires (67, portés depuis `Questions.gs`) et moteur de scoring
- `web/src/lib/auth.ts` — configuration NextAuth
- `web/src/lib/prisma.ts` — client Prisma
- `web/prisma/schema.prisma` — schéma de données (40 modèles au 2026-07-21 ; `grep -c '^model ' web/prisma/schema.prisma` pour un compte à jour plutôt qu'une énumération qui périme à chaque migration)
- `archive/gas-legacy/` — ancien code Google Apps Script (`Code.gs`, `Questions.gs`, `index.html`, `appsscript.json`), gelé, référence historique uniquement

## État de la migration

La migration depuis le MVP Google Apps Script + Google Sheets a été menée en stratégie *strangler pattern* du 2026-06-29 au 2026-07-03 (lots 0, C2, C3, C4, C5). Le lot C5 (2026-07-03) a :
- exécuté la migration historique des données Sheets → Supabase en production ;
- supprimé le déclencheur `sendReminders` côté Apps Script ;
- retiré le déploiement web Apps Script ;
- archivé `src/gas/` dans `archive/gas-legacy/` (commit `2269f91`), puis supprimé les artefacts clasp restants (commit `198f80b`).

`app.wellneuro.fr` (Next.js) est désormais l'unique point d'entrée applicatif. Le MVP GAS est hors service.

## Google Sheets : décommission terminée (2026-07-07)

La dépendance à l'API Google Sheets a été **entièrement retirée du runtime** (au-delà du seul déploiement Apps Script arrêté au lot C5). État vérifié :

- Aucune route ne référence plus `sheets.googleapis.com`, `SHEET_ID`, `spreadsheets` ni `googleapis` dans `web/src/**`. Les routes praticien (`metrics`, `patients`, `assignations`, `questionnaires`, `reponses`, `packs`…) lisent/écrivent **exclusivement PostgreSQL via Prisma**.
- Le scope OAuth NextAuth se limite à `openid email profile` (`web/src/lib/auth.ts`). Le scope `spreadsheets` a été retiré.
- La route `api/praticien/migrate-historique` a été **supprimée** (n'existe plus sur le disque).
- `SHEET_ID` n'est **plus** une variable d'environnement requise (elle reste seulement dans les garde-fous anti-fuite de `scripts/check_no_secrets.sh` et les listes d'hygiène « ne jamais committer »).
- Le code GAS reste archivé dans `archive/gas-legacy/` à titre de référence.

## Portail patient permanent (état actuel)

- Token d'accès **révocable** porté par `Patient`, route `/portail/[token]`.
- Vérification email **une seule fois**, puis session via cookie signé `wn_portail` (pas d'email en URL, pas de ressaisie).
- Onboarding : consentement groupé tracé → fiche signalétique → anamnèse resserrée (repères, motif & attentes, histoire, signaux d'alerte, antécédents, traitements/compléments).
- Hub **« Mes questionnaires »** : navigation libre entre questionnaires, pages autonomes, brouillon local (avec reset limité au non-transmis), transmission au praticien puis verrouillage.
- Consultation permanente des réponses verrouillées + **demande de correction enrichie** (commentaire patient), déverrouillage manuel côté praticien.
- Le modèle **`Consultation`** (historisable) porte consentement / fiche / anamnèse / motif ; le pack **« Base de consultation »** est marqué `par_defaut`.

## Registre relationnel questionnaires / packs

Deux couches coexistent, en transition maîtrisée (lot R3, livré le 2026-07-10, commit `3f367a7`) :
1. Modèle historique simple `Pack.qids` — reste la source d'édition praticien (`PacksPanel.tsx`).
2. Registre normalisé : `questionnaire_categories`, `questionnaires`, `questionnaire_secondary_categories`, `questionnaire_packs`, `pack_questionnaires`, `pack_triggers`.

Les routes d'assignation (`portail/valider`, `praticien/packs/assign`) lisent désormais en priorité le registre via `resolvePackQuestionnaireIds` (`web/src/lib/consultation/packRegistry.ts`), qui ne fait confiance au registre que si son ensemble de qids correspond exactement au `qids` legacy du pack — sinon fallback automatique sur `packs.qids`. Cohérence vérifiable via `npm run check:pack-registry`. Aucun calendrier de décommission de `packs.qids` à ce stade (statut « surveillance », tranché en R10).

## Synthèse IA enrichie (fiche + anamnèse)

La synthèse IA du premier bilan est nourrie, en plus des scores de questionnaires, par la fiche signalétique et l'anamnèse (module déterministe `web/src/lib/consultation/contexteClinique.ts`). Les **vigilances déterministes** (signaux d'alerte, traitements, automédication, compléments) sont extraites puis fusionnées en tête des points de vigilance — garanties même si le LLM les omet. La couche IA traduit, ne décide jamais (garde-fous conservés).

## Architecture clinique cible 3.2

La réconciliation WN Ultimate v2 du 2026-07-13 fixe une cible progressive :
C1 prépare épisode/snapshot/décision/protocole brouillon ; C2 possède la
persistance, l'activation et le longitudinal ; JA possède le journal
alimentaire ; C5A les profils intrinsèques et C5B leur lecture contextuelle.
Les paramètres cliniques non sourcés restent bloqués. Voir
`docs/claude/ARCHITECTURE_CLINIQUE_3_2.md` et
`docs/claude/REGISTRE_FRONTIERES.md`.

## Sécurité, RGPD, clinique — invariants

- Patients fictifs autorisés dans le dépôt : **Sophie Nicola, Jennifer Martin, Michel Dogné**. Aucun autre nom, aucune donnée patient réelle.
- Secrets et configuration sensible (`DATABASE_URL`, `ANTHROPIC_API_KEY`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, `SMTP_URL`) uniquement via variables d'environnement (`web/.env.local` en dev, variables Vercel en prod) — jamais en dur, jamais commitées. `SHEET_ID` n'est plus requis (décommission Sheets, voir plus haut).
- Ne pas modifier la logique clinique ou les seuils de scoring sans demande explicite documentée dans `CHANGELOG.md`.
- Vérification avant tout commit : `bash scripts/check_no_secrets.sh` et `cd web && npm run type-check`.
- Détail complet : `docs/securite_rgpd.md`, `docs/claude/REGLES_CRITIQUES.md`.

## Incidents et runbooks

- Incident 404 production / DNS / config Vercel (2026-07-01), résolu — configuration de référence du projet Vercel (`projectId`, `rootDirectory`, variables d'env prod) : `docs/claude/CONTEXTE_SESSION_VERCEL_2026-07-01.md`.

## Ce qui reste ouvert (hors périmètre sauf demande explicite)

- **R6** : stabilisation build/tests/go-no-go (`.claude/skills/wn-r6/SKILL.md` fait foi, tranché en R10) — gelé jusqu'à validation de R0.
- **R8** : filet de sécurité technique (CI GitHub Actions, tests unitaires vitest, tests Playwright commités) — piste indépendante, non bloquante.
- Calendrier de décommission de `packs.qids` : statut « surveillance », pas de date fixée (R10).
- Curation de `QuestionnaireDefinition.niveau` / `.publicCible` : statut « surveillance », pas d'usage applicatif à ce jour (R10).
- Pagination patients/assignations si le volume dépasse ~100 lignes.
- Hébergement HDS certifié (nécessaire uniquement si données de santé réelles en production).
- RAG SIIN complet (le prompt système utilise un mini-corpus non validé, pas
  le corpus plein). Le registre sanitaire des 391 notices n'est pas
  activable ; gates G0–G6 obligatoires.
- Génération PDF native (actuellement HTML + impression navigateur), signature électronique du booklet.
- Coaching patient autonome, SSO praticien multi-établissement.
- Séquencement complet : voir la roadmap de reprise **R0 → R6** dans `docs/ROADMAP_TECHNIQUE.md`.

## Où regarder pour aller plus loin

- Règles de travail détaillées : `docs/claude/REGLES_CRITIQUES.md`, `docs/claude/WORKFLOW_DEVELOPPEMENT.md`
- Templates de prompts : `docs/claude/TEMPLATES_PROMPTS.md`
- Roadmap et dette technique : `docs/ROADMAP_TECHNIQUE.md`
- Checklist de test manuel E2E : `docs/checklist_tests_end_to_end.md`
- Historique des changements fonctionnels : `CHANGELOG.md`
