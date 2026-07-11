# Contexte projet — Format minimal

## Wellneuro NNPP2 : Application clinique neuronutrition

**Production** : `app.wellneuro.fr` (Vercel)  
**État** : Post-migration GAS→Next.js (2026-07-03), Sheets dépendance supprimée (2026-07-07)

### Deux portails

1. **Praticien** → `/dashboard/*` (patients, questionnaires, synthèses IA, booklets)
2. **Patient** → `/portail/[token]` (onboarding: consentement+fiche+anamnèse, hub questionnaires, révision)
3. **Patient legacy** → `/patient/[idAssignation]` (compatibilité, email gate)

### Architecture donnée

| Table | Rôle |
|-------|------|
| Patient | Praticiens + portail patient (token révocable) |
| Assignation | Questionnaire assigné à patient + state |
| QuestionnaireReponse | Réponses transmises + verrouillage |
| Consultation | Consentement/fiche/anamnèse (historisable) |
| SyntheseIA | Bilan IA (fiche + anamnèse + scores) |
| BookletEnvoi | Fiches conseils |

**Registre** : `questionnaire_categories`, `questionnaires`, `pack_questionnaires` (migration ongoing, fallback sur `packs.qids` si divergence)

### Questionnaires

67 questionnaires hébergés dans `web/src/lib/questions.ts` (migré depuis `Questions.gs`). Scoring déterministe par questionnaire.

### Synthèse IA enrichie

- Anthropic Claude + prompt caching activé
- Sources : scores questionnaires + **fiche signalétique + anamnèse**
- Vigilances déterministes garanties (signaux d'alerte, traitements, compléments) en tête → jamais oubliées même si LLM les omet

### Règles incontournables

| Règle | Raison |
|-------|--------|
| Pas de secret en dur | RGPD, sécurité |
| UI français | Métier |
| Patients fictifs uniquement | Conformité données santé |
| Pas de modif scoring/clinique sans demande | Responsabilité clinique |
| Pas de migration Prisma sans confirmation | Risque données |

### État actuels vs oubliés

| État | Détail |
|------|--------|
| ✅ PostgreSQL | Unique source données (Sheets partie 2026-07-07) |
| ✅ NextAuth Google | Praticien uniquement, `@wellneuro.fr` |
| ✅ CI GitHub Actions | Tests, lint, build, Playwright E2E |
| ✅ 61 Vitest tests | Zéro TypeScript errors |
| ✅ Portail patient `/portail/[token]` | Onboarding + hub, flux principal |
| ❌ GAS deploiement | Arrêté 2026-07-03 (archived `archive/gas-legacy/`) |
| ❌ Google Sheets API | Supprimée 2026-07-07 |
| ⏳ Pagination patients | Non implémentée (~100 lignes max) |
| ⏳ Curation questionnaire.niveau/.publicCible | Surveillance, pas d'usage applicatif |

### Prochaines étapes

1. **C0** (Alignement documentaire) — vérifier doc/code cohérence
2. **C1** (Décision clinique 21j) — cockpit praticien + protocole minimal
3. **C2** (Persistance J7/J14/J21) — suivi longitudinal + migration gate
4. **C3-C5** — fiches conseils, compléments, boussole alimentaire

Voir [`campagnes/ACTIVE_CAMPAIGN.md`](campagnes/ACTIVE_CAMPAIGN.md) et [`campagnes/PROGRAMME_WELLNEURO_3_0.md`](campagnes/PROGRAMME_WELLNEURO_3_0.md).

### Où chercher

| Question | Fichier |
|----------|---------|
| Secrets, RGPD, clinique | [`REGLES_CRITIQUES.md`](REGLES_CRITIQUES.md) |
| Bug incident Vercel | [`CONTEXTE_SESSION_VERCEL_2026-07-01.md`](CONTEXTE_SESSION_VERCEL_2026-07-01.md) |
| Workflow code/test/livraison | [`WORKFLOW_DEVELOPPEMENT.md`](WORKFLOW_DEVELOPPEMENT.md) |
| Histoique décisions | [`SESSION_LOG.md`](SESSION_LOG.md) |
| Programme produit (priorités) | [`ROADMAP_AGENT_PLAN.md`](ROADMAP_AGENT_PLAN.md) |
| Config IA + caching | [`PROMPT_CACHING.md`](PROMPT_CACHING.md) |
