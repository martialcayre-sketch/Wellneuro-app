# Wellneuro NNPP2 — Contexte minimal

> Accès rapide : stack, règles, commandes. Voir `CLAUDE.md` racine avant de coder.

## Stack

| | |
|---|---|
| Framework | Next.js 14 App Router + TypeScript + Tailwind |
| Auth | NextAuth (Google, domaine `@wellneuro.fr` praticien) |
| DB | PostgreSQL via Prisma 7 + Supabase |
| IA | Anthropic Claude + prompt caching |
| Hosting | Vercel (`app.wellneuro.fr`) |

## Routes principales

- **Praticien** : `/dashboard/*` (patients, assignations, synthèses, booklets)
- **Patient** : `/portail/[token]` (principal, token révocable) + `/patient/[idAssignation]` (legacy)
- **API** : `api/praticien/*`, `api/portail/*`, `api/patient/*` (tout PostgreSQL)

## Fichiers cœur

- `web/src/lib/questions.ts` — 67 questionnaires + scoring
- `web/src/lib/auth.ts` — NextAuth config
- `web/prisma/schema.prisma` — Patient, Assignation, QuestionnaireReponse, etc.
- `web/src/lib/consultation/packRegistry.ts` — registry questionnaires/packs

## Invariants non négociables

- ✅ UI française uniquement
- ✅ Pas de secret en dur (variables d'env seulement)
- ✅ Patients fictifs : Sophie Nicola, Jennifer Martin, Michel Dogné
- ✅ Pas de modif clinique/scoring sans demande explicite + `CHANGELOG.md`
- ✅ Pas de migration Prisma sans confirmation distincte

## Commandes essentielles

```bash
cd web && npm run dev                    # Serveur dev
cd web && npm run type-check            # TypeScript
bash scripts/check_no_secrets.sh       # Audit sécurité
node scripts/wn-campaign.mjs status     # État campagnes
```

## Documents de référence

- [`CLAUDE.md`](../CLAUDE.md) (racine) — contexte système + règles critiques
- [`PROJET_CONTEXTE.md`](PROJET_CONTEXTE.md) — architecture détaillée
- [`REGLES_CRITIQUES.md`](REGLES_CRITIQUES.md) — sécurité RGPD clinique
- [`campagnes/`](campagnes/) — programme WellNeuro 3.0 (C0-C5)
- [`SESSION_LOG.md`](SESSION_LOG.md) — décisions passées

## Campagnes actives (C0-C5)

6 campagnes autonomes de développement — voir [`campagnes/ACTIVE_CAMPAIGN.md`](campagnes/ACTIVE_CAMPAIGN.md).

```bash
node scripts/wn-campaign.mjs next    # Prochain lot
```

## État project

- ✅ GAS → Next.js migration complète (2026-07-03)
- ✅ Sheets API **supprimée** du runtime (2026-07-07)
- ✅ E2E tests + CI GitHub Actions (R8.2)
- ✅ 61 Vitest tests passing, zéro TypeScript errors

**Prochaine priorité** : Exécution C0 (Alignement documentaire) → C1 (Décision clinique 21j)
