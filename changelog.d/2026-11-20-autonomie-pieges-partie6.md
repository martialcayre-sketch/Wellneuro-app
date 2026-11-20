### Garde-fous : une tâche de fond qui finit par `echo … $?` est refusée (autonomie-pieges-restes, partie 6, 2026-11-20)

Le code d'une tâche de fond est celui de sa dernière commande. Avec
`…; echo "code=$?"`, c'est celui d'`echo`, donc 0 : la notification annonce
« exit code 0 » sur un échec. Une attente de CI a ainsi été rapportée verte
alors qu'elle n'avait jamais tourné.

- `.claude/hooks/block-risky-commands.mjs` refuse désormais une commande
  lancée en tâche de fond quand sa dernière commande est un `echo`, un
  `printf` ou un `print` de `$?`. Le refus vaut aussi derrière une
  redirection (`>> f`, `>&2`, `2>&1`), un `;` ou un `}` final, ou un tube
  vers `tee`. Le message donne la forme sûre :
  `…; c=$?; echo "code=$c" >> f; exit $c`.
- La lecture porte sur la structure : un `echo $?` dans le corps d'un heredoc
  reste du texte. Au premier plan, rien ne change.
- Le banc `block-risky-commands.test.mjs` reçoit 28 cas neufs, dont les trous
  assumés épinglés. Chaque refus est vérifié par sa source. La règle, trous
  compris, est écrite dans `.claude/rules/hooks-garde-fous.md`.
