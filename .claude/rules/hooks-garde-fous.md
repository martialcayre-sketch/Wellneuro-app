---
paths:
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

Un hook `SessionStart` séparé (`startup|resume|clear|compact`) exécute
`git fetch origin main` et enregistre le constat ; le hook `PreToolUse`
d'édition **réévalue**. Le verdict est porté par l'état Git réel au moment de
l'édition, jamais par l'absence du marqueur — un marqueur manquant signifie
« jamais vérifié », donc évaluation à chaud, pas refus.

- L'appartenance d'`origin/main` à `HEAD` est **toujours** recalculée en local
  (`merge-base --is-ancestor`) : une branche remise à niveau en cours de
  session lève le refus dès la tentative suivante, sans reprise ; à l'inverse
  une remise à zéro locale de `HEAD` le rétablit aussitôt.
- Le **fetch réseau** est limité à une tentative toutes les 15 minutes. Dans
  cette fenêtre, une avancée d'`origin/main` sur le serveur reste invisible —
  c'est le prix assumé de ne pas appeler le réseau à chaque édition.
- Fetch impossible : mode dégradé sur la dernière référence connue, signalé
  avec son âge, sans plafond d'ancienneté tant que la session vit. Fetch
  impossible **et** aucune vérification jamais aboutie : refus, à chaque
  tentative.
- Toute commande Git du hook a un délai de 10 s. Un hook tué n'émet aucun
  verdict, donc n'interdit rien : un `fetch` qui pend (remote qui absorbe les
  paquets, invite d'identifiants) doit devenir un échec de fetch, jamais un
  silence.
- Branche qui ne contient pas `origin/main` : refus nommant les deux SHA. La
  remise à niveau est un arbitrage humain — le hook ne fait jamais de pull,
  merge, rebase ou checkout.
- Portée : le dépôt du `cwd` de la session, pas celui du fichier édité. Une
  écriture par chemin absolu vers un **autre** worktree n'est pas gardée — la
  convention « une session = un worktree » est ce qui tient cette limite.

Il n'existe pas de variable d'environnement désactivant la protection des
fichiers (`WN_ALLOW_PROTECTED_WRITE` a été supprimée : elle neutralisait le
hook pour la session entière).

Le hook PostToolUse `log-bash-command.mjs` est purement observationnel
(journal `.claude/logs/`, secrets masqués avant écriture) — il ne décide rien.

Banc de test : `node --test .claude/hooks/*.test.mjs`.
Toute modification d'un hook de sécurité se relit adversarialement et repasse
le banc.
