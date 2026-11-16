### Autonomie des sessions, pièges restants (2) : trois pièges convertis en contrôles (2026-11-16)

Trois pièges, qui ne vivaient que dans la mémoire des sessions, deviennent
des contrôles. Une session qui ne lit pas la mémoire ne peut plus les reposer :

- **Un module natif de Node atteint depuis un composant client.** Le nouveau
  banc `web/src/lib/clientSansModuleNode.guard.test.ts` suit le graphe des
  imports de valeur depuis chaque fichier `'use client'`, voisins compris. Il
  rougit s'il atteint `node:*` ou un module natif sans préfixe (`crypto`,
  `fs`…), et il rapporte le chemin entier. Avant, seul le `next build` de T2
  le voyait (`Module not found: node:crypto`, LOT-03 d'Alliance 6.0-B).
  Le banc tourne dans la suite Vitest complète (T2, CI), avant le build.
  Il ne tourne pas en T1, car `test:changed` suit le graphe d'imports et ce
  banc lit les composants sans les importer.
  - `import type` reste libre.
  - Un module `'use server'` arrête le parcours.
  - Le banc s'appuie sur le résolveur des bancs BIO-PARCOURS.
- **`now()` nu dans un trigger.** Le nouveau banc
  `scripts/migrations-now-trigger.test.mjs` refuse, dans le corps d'une
  fonction `RETURNS trigger` d'une migration neuve, `now()`,
  `CURRENT_TIMESTAMP` et leurs équivalents. Ces instants suivent le fuseau de
  la session et restent figés par la transaction. La forme retenue est
  `clock_timestamp() AT TIME ZONE 'UTC'`.
  - Les cinq migrations appliquées qui en portent sont gelées à leur compte.
  - Les `DEFAULT` et les `INSERT` des catalogues sont hors champ.
  - Le banc est joué par `bancs-outillage-check` et par le CI.
  - `masquerSql` sort de `migrations-btrim.test.mjs`, sans changement, vers
    `scripts/lib/sql-masque.mjs`, pour être partagé.
- **Un modificateur zsh dans une refspec.** `block-risky-commands` refuse un
  `$VAR:x` non accolé (`git push origin "$NEW:refs/heads/x"`). zsh y lit
  `:r` comme « retire l'extension » et pousse `<sha>efs/heads/x`. Les
  guillemets doubles comptent, puisque zsh y développe aussi, de même qu'un
  heredoc à délimiteur nu. Restent libres une chaîne entre apostrophes hors
  guillemets doubles, un `\$` et le corps d'un heredoc à délimiteur cité.
  Les modificateurs retenus ont été constatés par `zsh -fc`, y compris
  `:fe` (`feat/…`) et `:gh` (`gh-pages`). Le remède est
  `${NEW}:refs/heads/x`.
- `migrations-now-trigger` lit aussi `CURRENT_DATE`, `RETURNS
  pg_catalog.trigger`, un commentaire glissé avant la balise du corps et un
  corps entre apostrophes (`AS '…'`). Son gel est strict : une baisse rougit
  aussi, et une migration gelée introuvable également.
- Après la contre-revue Codex :
  - le crochet lit brut le corps d'un heredoc à délimiteur nu, dont les
    apostrophes sont du texte ;
  - il accepte un délimiteur cité qui n'est pas qu'un mot (`<<'FIN-PR'`) ;
  - le banc client lit les directives dans le prologue du module
    (`'use strict'; 'use client';`, commentaires sautés) et part aussi des
    fichiers `.js` et `.jsx`.
