### Autonomie des sessions, pièges restants (1) : les P2 de la revue de #2074 (2026-11-14)

Contrôles posés par #2074 et resserrés sur les constats de `wn-reviewer` et de
Codex, qui avaient été routés au lot `autonomie-pieges-restes` :

- `scripts/migrations-btrim.test.mjs` :
  - toute la famille est vue : `ltrim(x)`, `rtrim(x)`, `trim(x)` et
    `trim(both from x)`, sans caractères, retirent seulement l'espace ASCII,
    comme `btrim(x)`. Leur gel est à zéro ;
  - les chaînes `$tag$…$tag$` sont lues de deux façons, et le banc retient
    le compte le plus haut, si bien qu'il ne voit jamais moins qu'avant.
    - La lecture par contexte lit du SQL après `AS`, `DO [LANGUAGE x]` ou
      `EXECUTE`, et un littéral ailleurs. `btrim($$a,b$$)` compte donc bien,
      et une apostrophe dans un littéral dollar ne masque plus la suite.
    - La lecture d'avant, gardée à l'identique, lit tout le contenu comme du
      SQL.
    - Dans la lecture par contexte, un `$` collé à un identifiant
      (`a$b$c`, `é$q$`) n'ouvre pas de littéral.
    - Le prix : les faux positifs de la lecture d'avant restent des refus
      prudents. Ce sont `trim($$ $$ from t)` et un appel cité dans un
      littéral dollar, deux formes absentes des migrations.
- `.claude/hooks/block-risky-commands.mjs` : `npx prisma@7 format` est
  refusé comme `prisma format`, et un `--check` placé après un `#` (un
  commentaire du shell) ne l'excuse plus.
- `scripts/wn-doublons-prisma.sh` (neuf), appelé par `wn-test-worktree.sh` :
  - les répertoires « * 2 » sont vus ;
  - un client généré absent rend 2 au lieu de passer en silence ;
  - un banc couvre le contrôle, dans `npm run check` et dans le CI.
- `scripts/check_no_secrets.sh` : le contrôle des traces Playwright compare sans
  `tr` (`nocasematch`), ce qui économise deux processus par fichier suivi. Sa
  limite est écrite : une trace renommée sous `playwright-report/data/`
  n'est tenue que par l'exclusion Git.
