### Les refus Supabase de `.claude/settings.json` retirés : le connecteur est débranché (plan D/5) (2026-10-22)

- Le connecteur MCP Supabase est absent de claude.ai (constaté le
  2026-10-21) ; les neuf refus `mcp__claude_ai_Supabase__*` de
  `.claude/settings.json` ne neutralisaient plus rien et sont retirés
  (retrait tranché par le responsable le 2026-10-21).
- La garde `guard-supabase-mcp.mjs` sur `execute_sql` reste en place : filet
  si le connecteur revenait.
- `CLAUDE.md` et `.claude/rules/db-prisma.md` ne disent plus que l'outil
  « reste branché ».
