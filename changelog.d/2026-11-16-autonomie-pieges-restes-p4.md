### Autonomie des sessions, pièges restants (3) : crochet zsh rectifié, deux pièges convertis en contrôles (2026-11-16)

Trois points routés de #2184 sont levés dans le crochet des modificateurs zsh,
et deux pièges de plus deviennent des contrôles :

- **Crochet zsh : les heredocs se lisent ligne par ligne, comme zsh.**
  `block-risky-commands` lit maintenant, dans l'ordre, tous les heredocs ouverts
  sur une ligne. Il ignore `<<<` et exige un terminateur exact (tabulations de
  tête sous `<<-` seulement). Le délimiteur se lit comme un mot shell entier
  (`<<"E"OF` termine sur `EOF`). Un heredoc cité sans terminateur n'en est pas
  un : un `<<'FIN'` cité dans un message de commit ne masque plus la suite.
  Chaque corps, cité ou nu, est retiré de la
  commande, et seul le corps d'un heredoc nu est lu à part. Trois défauts
  disparaissent, chacun constaté sur l'ancien crochet et couvert par un banc :
  - **Faux négatif (PR-Agent).** L'apostrophe de « l'ajout », dans le corps d'un
    heredoc nu, ouvrait une chaîne qui masquait la suite. Un `git push origin
    "$NEW:refs/heads/x"` passait derrière `git commit -F - <<EOF`.
  - **`\$` dans un heredoc nu** était refusé, alors que zsh l'y lit littéral
    (constaté par `zsh -f`).
  - **Un heredoc nu cité dans le corps d'un heredoc cité** était refusé, alors
    que ce n'est que du texte.
- **Classe d'opacité non générée.** Le nouveau banc
  `web/src/lib/opaciteTailwind.guard.test.ts` compile en mémoire, avec la
  configuration du dépôt, les classes `<utilitaire>-<couleur>/<n>` (ou
  `/[<n>]`) des dossiers que lit Tailwind.
  Il rougit sur toute classe qui ne produit aucune règle : par exemple
  `text-muted-foreground/70` sur un jeton `var(--x)` sans `<alpha-value>`,
  qui laisse le texte hériter de la couleur du parent.
  - Six classes existantes (38 occurrences) sont gelées, au compte près.
  - Les corriger change l'écran, hors de ce lot.
- **Flux SDK sans borne.** Le nouveau banc
  `web/src/lib/anthropicFluxBorne.guard.test.ts` exige un `signal` dans tout
  appel en flux au SDK Anthropic de `web/src`. Il couvre `messages.stream(` et
  `stream: true`. L'option `timeout` du SDK cesse de compter dès les en-têtes,
  si bien qu'un corps qui n'arrive jamais n'est borné par rien.

Les deux bancs tournent dans la suite Vitest complète (T2, CI).
