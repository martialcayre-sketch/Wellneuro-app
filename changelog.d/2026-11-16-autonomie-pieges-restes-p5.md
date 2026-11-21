### Autonomie des sessions, pièges restants (4) : crochet zsh conscient des citations, worktree neuf arrêté avant Vitest (2026-11-16)

Trois points routés de #2192 sont levés dans le crochet des modificateurs zsh.
Le quatrième est routé à la file B. Un piège de plus devient un contrôle.

- **Crochet zsh : un lecteur conscient des citations.** `block-risky-commands`
  lit la commande en un seul passage, avec une pile de contextes : code,
  `$(…)`, accent grave, guillemets doubles, apostrophes, `$'…'`, arithmétique.
  Chaque cas ci-dessous a été constaté sur le crochet de `main` et est couvert
  par un banc.
  - **Faux `<<'EOF'`.** Un `<<` n'ouvre plus un heredoc dans des guillemets,
    des apostrophes, un commentaire ou `$((1<<2))`. Un faux `<<'EOF'` dans un
    message de commit, suivi plus loin d'une vraie ligne `EOF`, masquait le
    `git push "$NEW:refs/heads/x"` placé entre les deux. Le défaut, déjà
    présent sur `main`, avait été signalé en focus area par PR-Agent sur #2192.
  - **Apostrophe sous `$(…)`.** Dans `"$(printf "l'ajout") $NEW:r"`,
    l'apostrophe des guillemets internes est du texte. Avant, elle masquait le
    `$NEW:r` que zsh développe.
  - **`\` en fin de ligne d'un corps nu.** Il joint la ligne suivante, comme
    zsh, et cette ligne ne peut plus être le terminateur. Constaté par
    `zsh -f` : `$NEW\` puis `:refs` donne `abc123efs`.
  - **Trois faux refus levés.** `$((1<<2))`, une apostrophe de commentaire et
    `$'l\'ajout …'` étaient refusés à tort.
- **Flux SDK de `tools/corpus/`.** `certify.mjs:117` et `rediger.mjs:92` sont
  routés à la file B (F05), par le registre des messages, sans modification de
  code.
- **Worktree neuf.** `web/vitest.config.ts` s'arrête net, avec le remède
  (`npm ci && npx prisma generate`), quand `web/node_modules` ou le client
  Prisma manquent. Avant, Vitest remontait sans rien dire au `node_modules` de
  la copie principale, en retard sur la branche, et rendait un vert trompeur.
  Banc : `web/src/lib/worktreePret.guard.test.ts`.
