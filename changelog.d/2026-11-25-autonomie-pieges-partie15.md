### SESSION_LOG : le CI refuse un journal qui ne commence plus par celui de la base (autonomie-pieges-restes, partie 15, 2026-11-25)

`docs/claude/SESSION_LOG.md` porte `merge=union`. Quand une branche qui a
ajouté son entrée en fin de journal fusionne `main`, `union` range l'entrée
du lot DEVANT les entrées venues de `main` : le diff de la PR n'est plus un
ajout en fin de fichier. Constaté deux fois sur #1673 (2026-10-24) ; seule
la revue CodeRabbit le relevait, et elle ne relit plus.

- **Garde** `scripts/wn-session-log-ajout.mjs <base> [<tête>]` : le journal
  de la tête doit commencer par celui de la base, à l'octet près. Refus (1)
  sinon, avec la première ligne divergente et le remède (journal de la base,
  puis le bloc du lot en fin). Une ligne retouchée, une entrée retirée ou le
  journal supprimé sont refusés de même ; la compaction l'est donc aussi,
  gelée par `D-372` §2 — une décision qui lèverait le gel lève ce garde.
- **CI** : étape « SESSION_LOG ajout en fin » du job `controles`, sur toute
  PR, documentaire comprise (un résumé de session en est une), base
  `HEAD^1`. Banc au CI et dans `npm run check`.
- **Banc** `scripts/wn-session-log-ajout.test.mjs` : cas purs, et rejeu réel
  du piège dans un dépôt jetable sous `merge=union` (la fusion de `main`
  réordonne, le script refuse, la reconstruction prescrite passe). Mutation
  inverse (règle affaiblie à une comparaison de longueurs) : trois cas
  rougissent.
- `.gitattributes` : le revers de `union` et son garde, dans le commentaire.
