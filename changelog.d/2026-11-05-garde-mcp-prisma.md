### Garde MCP Prisma, skill Supabase retiré (2026-11-05)

Suite d'une analyse par le skill officiel `claude-code-setup`
(`claude-automation-recommender`) d'Anthropic, lu en lecture seule.

- **Nouveau garde `guard-prisma-mcp.mjs`** (PreToolUse, matcher
  `mcp__.*[Pp]risma.*`). Le plugin `prisma` expose `migrate-dev` (crée et
  applique une migration) et `Prisma-Studio` (édite la base en direct) ;
  `block-risky-commands.mjs` ne voyait que `prisma migrate` tapé en Bash, un
  appel MCP passait à côté de `D-087`. Liste blanche : seul `migrate-status`
  passe, tout autre outil — inconnu compris, entrée illisible comprise — est
  refusé. Banc : `guard-prisma-mcp.test.mjs` ; lanceur fermé, couvert par
  `settings-gardes.test.mjs`.
- **Skill `supabase` retiré** (`.agents/skills/supabase`, son lien sous
  `.claude/skills/`, son entrée de `skills-lock.json`) : Supabase est
  décommissionné (`D-120`) et ce skill se déclenchait sur toute tâche
  Supabase avec des consignes (RLS, supabase-js, MCP) devenues fausses.
  `supabase-postgres-best-practices`, générique Postgres, est conservé.
- Le message de refus de `guard-supabase-mcp.mjs` ne renvoie plus au « build
  Vercel de main » mais à la release-db approuvée (`D-087`).
- Écarté : réécrire en relatif les autorisations `/Users/wellneuro/...` de
  `settings.json` — elles correspondent à `${CLAUDE_PROJECT_DIR}` développé
  par les skills sur la copie principale.
