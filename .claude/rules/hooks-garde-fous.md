---
paths:
  - ".claude/hooks/**"
  - ".claude/settings.json"
globs:
  - ".claude/hooks/**"
  - ".claude/settings.json"
---

# Garde-fous d'écriture — détail des hooks

Trois verdicts, rendus par les hooks PreToolUse de `.claude/settings.json` :

- **refus** — `.env*`, `.git/`, `node_modules/` ; commandes destructives ou
  exposant des secrets. Sans dérogation pour les fichiers. Le scan porte sur
  la commande brute, littéraux compris : `bash -c "rm -rf /"` est attrapé, et
  `echo 'DROP TABLE'` aussi — faux positif assumé. Seule exception : le corps
  d'un heredoc est traité comme de la donnée lorsque **la structure de la
  commande** (tout sauf les corps de heredoc) ne contient aucun interpréteur.
  `cat >> journal.md <<'FIN'` écrit du texte ; `cat <<'FIN' | bash` reste
  attrapé, le `| bash` étant sur la ligne d'ouverture. Ce que le corps
  *raconte* n'entre pas dans la décision.
- **demande** — `schema.prisma`, `prisma/migrations/`, `supabase/migrations/` ;
  `prisma migrate`, `supabase db push`, push forcé. L'autorisation en un clic
  dans la session matérialise la « confirmation explicite » exigée par
  CLAUDE.md.
- **silence** — tout le reste.

Il n'existe pas de variable d'environnement désactivant la protection des
fichiers (`WN_ALLOW_PROTECTED_WRITE` a été supprimée : elle neutralisait le
hook pour la session entière).

Le hook PostToolUse `log-bash-command.mjs` est purement observationnel
(journal `.claude/logs/`, secrets masqués avant écriture) — il ne décide rien.

Banc de test : `node --test .claude/hooks/block-risky-commands.test.mjs`.
Toute modification d'un hook de sécurité se relit adversarialement et repasse
le banc.
