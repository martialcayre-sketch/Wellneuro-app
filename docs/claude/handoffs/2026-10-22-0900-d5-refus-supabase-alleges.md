# Handoff — D/5 : refus Supabase de `.claude/settings.json` retirés

## Branche et état du dépôt

- Branche `chore/d5-supabase-refus-allegés`, worktree `file-d1-suite`,
  partie de `origin/main` (474995b4). Sans migration, sans drapeau.

## Objectif

Plan §8, ligne D/5 : le connecteur MCP Supabase étant débranché (geste d05
du responsable, constaté le 2026-10-21), alléger les refus de
`.claude/settings.json` et corriger la doc qui le disait « branché ».

## Décisions prises

- Retrait tranché par le responsable le 2026-10-21 (mémoire file D).
- Les neuf entrées `permissions.deny` retirées ; la garde
  `guard-supabase-mcp.mjs` (PreToolUse sur `execute_sql`) conservée comme
  filet.

## Fichiers modifiés

- `.claude/settings.json`, `CLAUDE.md`, `.claude/rules/db-prisma.md`,
  `changelog.d/2026-10-22-d5-refus-supabase-alleges.md`, SESSION_LOG.

## Validations exécutées

- `settings.json` relu comme JSON valide ; aucun script ne lit la liste
  `deny` (recherche dans `scripts/`, `.claude/`) ; T1 rapide (résultat dans
  la PR).

## Problèmes ouverts

- Les lignes D/5 du plan (§ dettes et §8) restent à marquer faites par un
  relevé du plan.

## Prochaine action exacte

CI, CodeRabbit sur la tête, merge ; ligne d05 de la page D ; puis PR D/41
(crochet d'écriture, vestige `WN_ALLOW_RISKY_COMMAND`).

## Interdits encore actifs

- Un merge à la fois ; aucun auto-merge ; vérifier qu'aucune « Release DB »
  n'attend avant le merge ; t35, s16, s17 et le dossier magnésium
  appartiennent à d'autres sessions.
