# Handoff — garde MCP Prisma, skill Supabase retiré (2026-11-05 19:20)

## Branche et état Git

`claude/sweet-heisenberg-0k4o46`, issue de `origin/main` @ `bdba7eb`. Lot hors
campagne (outillage Claude Code), un seul commit.

## Objectif

Appliquer les recommandations du skill officiel `claude-code-setup`
(`claude-automation-recommender`) d'Anthropic, exécuté en lecture seule sur le
dépôt et validées par le responsable (« go »).

## Décisions prises

- Nouveau garde `guard-prisma-mcp.mjs` (PreToolUse `mcp__.*[Pp]risma.*`),
  liste blanche : seul `migrate-status` passe ; `migrate-dev`, `Prisma-Studio`,
  tout outil inconnu et toute entrée illisible sont refusés. Motif : le plugin
  `prisma` contournait par MCP la garde Bash sur `prisma migrate` (`D-087`).
- Skill `supabase` retiré (Supabase décommissionné, `D-120`) ;
  `supabase-postgres-best-practices` conservé (Postgres générique).
- Message de `guard-supabase-mcp.mjs` : « build Vercel » remplacé par
  « release-db approuvée (D-087) ».
- Écarté : autorisations `/Users/wellneuro/...` de `settings.json` laissées en
  l'état — elles correspondent à `${CLAUDE_PROJECT_DIR}` développé par les
  skills sur la copie principale.

## Fichiers modifiés

`.claude/hooks/guard-prisma-mcp.mjs` (+ `.test.mjs`), `.claude/settings.json`,
`.claude/hooks/guard-supabase-mcp.mjs`, `.claude/rules/hooks-garde-fous.md`,
`skills-lock.json`, suppression de `.agents/skills/supabase/` et du lien
`.claude/skills/supabase`, `changelog.d/2026-11-05-garde-mcp-prisma.md`.

## Validations exécutées

- `npm run hooks-check` : 417/417.
- Lanceur réellement déclaré joué à la main : `migrate-dev` deny,
  `Prisma-Studio` deny, `migrate-status` allow ; matcher ne capte pas
  `mcp__github__*`.
- `npm run check` (T1 complet) : vert (après `prisma generate`, client absent
  du conteneur neuf). T2 non dû (ni UI ni API).

## Problèmes ouverts (hors dépôt, geste du responsable)

- Débrancher les connecteurs claude.ai Vercel et Supabase (décommissionnés).
- Sentry / Better Stack MCP refusés par le proxy en session cloud : autoriser
  `mcp.sentry.dev` et `mcp.betterstack.com` dans l'environnement si voulu.
- context7 : à passer par `/wn-tiers` avant toute activation.

## Prochaine action exacte

PR draft, `wn-attendre-ci` en fond, revue CodeRabbit, un verdict par
remarque. Lot touchant `.claude/hooks` : relecture adverse du garde demandée
par `hooks-garde-fous.md`.

## Interdits encore actifs

Pas de migration Prisma ni de modification de `schema.prisma` ; écriture en
base uniquement par migration relue puis release-db approuvée (`D-087`) ;
aucune variable de désactivation de garde.
