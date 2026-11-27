# Handoff — 2026-11-16 — Nettoyage de fichiers Markdown périmés

## Branche et état Git

Branche `worktree-nettoyage-md-obsoletes`, partie d'`origin/main` 7300f78c,
dans le worktree `.claude/worktrees/nettoyage-md-obsoletes` (session
concurrente, cycle en `git`/`gh` direct). PR de documentation seule : aucun
code, ni Prisma, ni migration, ni release-db.

## Objectif

Suite à `/wn-hygiene` du 2026-11-16, le responsable a demandé un bilan des
`.md` sans raison d'être, puis donné son feu vert (« go ») à une PR de
nettoyage limitée aux cas quasi certains.

## Décisions prises

- Supprimés, sans renvoi dans le dépôt : `prompts/interpretation_dnsm.md`
  (gabarit de 3 lignes), `tests/scenarios_validation_mvp.md` (scénarios du MVP
  de juin), `docs/claude/consentement-statuts-r8-lite.md` (document de travail
  d'une branche d'expérience jamais reprise).
- Corrigés plutôt que supprimés : `README.md` (section Supabase/Vercel
  remplacée par Prisma et Scalingo, selon `D-080`/`D-120` ; le script
  `supabase:link` n'existe plus) et `README_MAC_FIRST_RUN.md` (les scripts
  `bootstrap-mac*.sh` ne tirent plus rien de Vercel et n'ont pas d'option
  `--skip-env-pull`).
- **Écarté : la copie `.agents/skills/supabase-postgres-best-practices/`.**
  Annoncée « copie sans usage » dans le bilan, c'est en fait l'original :
  `.claude/skills/supabase-postgres-best-practices` en est un lien symbolique,
  et `LICENSE` la cite. La supprimer cassait le skill.
- Le lien du `README.md` vers le runbook Vercel/DNS
  (`docs/claude/CONTEXTE_SESSION_VERCEL_2026-07-01.md`) est conservé : le skill
  d'hygiène impose de le garder.

## Fichiers modifiés

- `README.md`, `README_MAC_FIRST_RUN.md`
- supprimés : les trois fichiers ci-dessus
- `changelog.d/2026-11-16-nettoyage-md-obsoletes.md`
- ce handoff

## Validations exécutées

- `scripts/check_no_secrets.sh --staged` : OK.
- Contrôles de documentation joués depuis `web/` : `ancres-check`,
  `decisions-check`, `plan-journal-check`, `skills-check`,
  `campaign-audit-check`, `hooks-check` — tous verts.
- `npm run check:rapide` : échec sur `type-check` seulement, parce que ce
  worktree n'a ni `node_modules` ni client Prisma généré (erreurs TS2307 sur
  `@/generated/prisma`) ; sans rapport avec un diff de documentation. Le CI
  tranche.
- Les fins de ligne du `README.md` (CRLF) sont conservées : le diff ne porte
  que sur la section réécrite.

## Problèmes ouverts

- Restent à arbitrer, non touchés : le kit Copilot (`.github/agents/`,
  `.github/prompts/`, cités par `wn-kit-doctor.mjs` et `copilot-instructions.md`),
  `docs/ai/POLICY.md`, `docs/claude/BRAINSTORMING_PROMPTS.md`,
  `docs/claude/templates/` et six documents de `docs/claude/propositions/`.
  « Jamais cité » vient d'une recherche par nom de fichier : un chargement par
  convention ne s'y voit pas.
- Aucun contrôle de fond n'a été fait sur les documents devenus faux, hors
  mentions Vercel/Supabase dans `README*.md` et `docs/claude/*.md`.

## Prochaine action exacte

PR, `node scripts/wn-attendre-ci.mjs <N>` en fond, revue PR-Agent sur la tête
(`node scripts/wn-revue-pr-agent.mjs <N>` → 0), puis « prête @sha » à
l'intégrateur.

## Interdits encore actifs

- Ne supprimer, déplacer, fusionner ou archiver aucun autre document sans
  confirmation distincte du responsable.
- Ne jamais toucher `.agents/skills/` : il porte l'original du skill tiers.
- Pas de merge par la session : déclarer « prête ».
