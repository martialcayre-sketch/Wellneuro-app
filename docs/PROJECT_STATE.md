# État du projet Wellneuro

> Dernier snapshot : 2026-07-11 (WN-0)

## Production

- Domaine : `https://app.wellneuro.fr`
- Hébergement : Vercel (Next.js 14)
- Branche déployée : `main`

## Architecture active

| Couche | Technologie |
|---|---|
| Framework web | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Auth praticien | NextAuth 4, provider Google, restreint au domaine `@wellneuro.fr` |
| Base de données | PostgreSQL (Supabase), via Prisma 7 + Driver Adapter |
| IA clinique | Anthropic SDK, prompt caching activé |
| Email | Nodemailer / SMTP |

## Portails en production

- **Praticien** (`/dashboard/*`) : gestion patients, assignations, questionnaires, synthèse IA, booklets
- **Patient permanent** (`/portail/[token]`) : accès par token révocable, onboarding, hub « Mes questionnaires », consultation permanente — **flux principal**
- **Patient legacy** (`/patient/[idAssignation]`) : ancien flux, conservé en compatibilité, sans token

## Données et persistance

- **Source unique runtime** : PostgreSQL via Prisma (depuis 2026-07-07)
- **Google Sheets** : entièrement décommissionné, code archivé dans `archive/gas-legacy/`
- **Registre questionnaires** : normalisé (tables relationnelles), fallback temporaire sur `packs.qids` legacy
- **67 questionnaires** portés avec moteur de scoring dans `web/src/lib/questions.ts`

## Authentification

- Praticien : NextAuth + Google OAuth (`@wellneuro.fr`)
- Patient : token non prédictible + cookie signé `wn_portail`

## IA et logique déterministe

- Synthèse IA enrichie : fiche signalétique + anamnèse + questionnaires + vigilances déterministes
- Vigilances critiques : signaux d'alerte, traitements, automédication, compléments — garanties même si LLM les omet
- IA traduit et synthétise, ne décide jamais

## Composants legacy

- Code Google Apps Script archivé dans `archive/gas-legacy/` (gelé, ne jamais modifier)
- Flux patient legacy `api/patient/*` conservé pour compatibilité

## Sources de vérité

- Architecture technique : `docs/claude/PROJET_CONTEXTE.md`
- Règles de travail : `docs/claude/REGLES_CRITIQUES.md`
- Roadmap technique : `docs/ROADMAP_TECHNIQUE.md`
- Roadmap produit : `docs/ROADMAP_PRODUIT.md`
- Historique sessions : `docs/claude/SESSION_LOG.md`
