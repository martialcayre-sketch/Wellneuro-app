# Handoff — 2026-11-16 — Autonomie des sessions, pièges restants (2) : trois pièges convertis en contrôles

## Branche et état Git

- Branche `chore/autonomie-pieges-p3`, créée depuis `origin/main` (`ca9d3499`) dans le worktree
  `.claude/worktrees/orch-ci` (session Orchestration, file D). L'ancienne branche du worktree
  (`chore/licences-hors-graphe`) portait un commit déjà squashé dans #2180 : d'où une branche neuve plutôt
  qu'une avance `--ff-only`.
- Lot `autonomie-pieges-restes` (ordre 35) repris au carnet le 2026-11-16 à 18:36 UTC, sur décision du
  responsable : `reprises` 1, `pris_par` Orchestration. La session file-d-artefacts qui le tenait n'avait
  plus de worktree, sa branche distante était supprimée, et sa dernière trace remontait au 2026-11-14 à 07:18.
- Boîte D lue à l'ouverture : aucun message non traité.

## Objectif

Partie 2 du lot (la partie 1, #2094, levait les P2 de #2074) : convertir en contrôle les pièges qui ne
vivaient que dans la mémoire des sessions, un contrôle par piège. Cette PR en convertit trois, choisis parce
qu'ils sont mécaniques et vérifiables.

## Décisions prises

- Aucune D-xxx. Ce sont des contrôles ajoutés, sans clinique, sans migration et sans schéma.
- **`node:*` sous `use client`.** Le banc Vitest suit le graphe des imports de valeur avec le résolveur
  BIO-PARCOURS, sur le patron de `bundleClient.guard`. Les modules natifs sans préfixe (`crypto`) sont visés
  aussi, puisque Next les remplace en silence par un polyfill. Un module `'use server'` arrête le parcours.
- **`now()` dans un trigger.** Seul le corps des fonctions `RETURNS trigger` est lu. Les `INSERT …
  CURRENT_TIMESTAMP` des catalogues, mesurés à 149 occurrences sur 20 migrations, ne sont pas le piège :
  les refuser aurait gêné un geste fréquent. Cinq migrations appliquées sont gelées, et le gel est strict.
  `masquerSql` sort tel quel de `migrations-btrim.test.mjs` vers `scripts/lib/sql-masque.mjs`, pour qu'un banc
  node:test n'en importe pas un autre, ce qui rejouerait ses tests.
- **Refspec zsh.** Le crochet refuse un `$VAR:x` non accolé. Il le lit sur une commande où seul l'inerte est
  masqué : apostrophes hors guillemets doubles, `\x`, et corps de heredoc à délimiteur cité. Les guillemets
  doubles ne protègent pas, puisque zsh y développe. Les modificateurs retenus ont été constatés par
  `zsh -fc`. `:f`, `:F` et `:g` ne jouent que devant un autre modificateur (`:fe` de `feat/x`, `:gh` de
  `gh-pages`). `:w` et `:x` ne s'appliquent pas à un paramètre.

## Fichiers modifiés

- `web/src/lib/clientSansModuleNode.guard.test.ts` (neuf).
- `scripts/migrations-now-trigger.test.mjs` (neuf) et `scripts/lib/sql-masque.mjs` (neuf, déplacé) ;
  `scripts/migrations-btrim.test.mjs` (import et ré-export).
- `web/package.json` (`bancs-outillage-check`) et `.github/workflows/ci.yml` (une étape).
- `.claude/hooks/block-risky-commands.mjs` et `.claude/hooks/block-risky-commands.test.mjs`.
- `.claude/rules/hooks-garde-fous.md`.
- `changelog.d/2026-11-16-autonomie-pieges-restes-p3.md` et ce handoff.

## Validations exécutées

- Bancs :
  - `clientSansModuleNode.guard` : 4/4. Témoin : un fichier client temporaire qui importe
    `assemblageProposition` rougit le banc, avec le chemin entier jusqu'à `node:crypto`. Le fichier est retiré.
  - `migrations-now-trigger` et `migrations-btrim` : 15/15. 110 fonctions trigger sont lues, autant que de
    `RETURNS trigger` relevés par `grep`.
  - `block-risky-commands.test` : 82/82.
  - `parite-check-ci` : 59/59.
- Le fait de départ est vérifié sur un vrai zsh : `"$N:refs/heads/x"` rend `abc123efs/heads/x`.
- `npm run check:rapide` : vert. `npm run check` (T1 complet) : `code=0`.
- `wn-reviewer` (P0, diff local avant push) : GO, sans P0 ni P1. Trois P2, tous corrigés :
  - le crochet ne voyait pas `f`, `F` ni `g` ;
  - le banc client était annoncé « en T1 », ce qui est faux : il tourne en T2 et en CI ;
  - le crochet masquait les apostrophes sans tenir compte des guillemets doubles.

  P3 corrigés : retrait de `w` et `x`, heredoc à délimiteur nu, `CURRENT_DATE`, `pg_catalog.trigger`,
  commentaire avant la balise, gel strict.
- Revue de l'écart par `wn-reviewer` : un P1, corrigé. Le masquage des heredocs prenait une ligne vide pour
  la fin d'un corps cité : une référence arrière vers un groupe vide vaut « » en JS. Deux effets en
  découlaient :
  - faux positif sur un corps de PR ou un message de commit de plusieurs paragraphes ;
  - faux négatif, une apostrophe de la suite masquant un push.

  Le délimiteur tient maintenant dans un seul groupe, et trois bancs sont ajoutés (85/85). Le GO était
  conditionné à ce correctif.

## Problèmes ouverts

- P3 assumés, tous hypothétiques et absents du dépôt :
  - dans le crochet :
    - `zsh <<'EOF'` qui contient le piège ;
    - `"$a[1]:r"` et `$?:h` ;
    - une apostrophe dans un commentaire `# c'est`, ou dans le corps d'un heredoc nu, qui masque la suite ;
    - les apostrophes d'un `$(…)` entre guillemets doubles, prises pour du texte : c'est un refus prudent ;
  - dans le banc des triggers : `'now'::timestamptz`, `EXECUTE '… now()'`, `"now"()`, un corps `AS '…'`, et
    un `BEGIN ATOMIC` suivi d'un trigger (double compte).
- Restent au lot, pour les parties suivantes :
  - `prisma generate` à la création d'un worktree ;
  - les quatre pièges E2E ;
  - un lot d'ingestion de plus de 10 claims ;
  - les listes jumelles ;
  - release-db sur 504 ;
  - un one-off Scalingo recyclé ;
  - le flux du SDK sans borne ;
  - la réservation WN-SRC ;
  - les focus areas de PR-Agent ;
  - le SESSION_LOG réordonné ;
  - les sessions concurrentes sur la copie principale ;
  - les crochets de la copie principale en retard ;
  - `echo code=$?` en fond ;
  - l'opacité Tailwind ;
  - `wn-attendre-ci` (tête périmée, e2e lent) ;
  - le statut « transféré » (décision requise) ;
  - la règle de lint « objet d'erreur brut ».

## Prochaine action exacte

1. Revue de l'écart par `wn-reviewer`, puis commit, push et contre-revue Codex P0 sur le diff poussé
   (`node scripts/wn-codex-avis.mjs`, avis déposé sur la PR).
2. PR (`--body-file`), `node scripts/wn-attendre-ci.mjs <N>` en fond, PR-Agent sur la tête.
3. « Prête @<sha> » en commentaire sur la PR **et** au registre (consigne de l'intégrateur sur #2180).
4. Partie 3 du lot : les pièges suivants.

## Interdits encore actifs

- Ni migration, ni schéma, ni clinique, ni donnée patient.
- Un refus de crochet ne s'élargit pas à de la prose : apostrophes et heredocs cités restent libres.
- Ne jamais supprimer une ligne des registres (`questions`, `messages`, `lots`, `reponses`).
- Horodater en lisant l'heure système, jamais à l'estime.
