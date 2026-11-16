# Handoff — 2026-11-16 — Autonomie des sessions, pièges restants (3) : crochet zsh rectifié, deux pièges convertis

## Branche et état Git

- Branche `chore/autonomie-pieges-partie3`, créée depuis `origin/main` (`29b06090`) dans le worktree
  `.claude/worktrees/orch-ci` (session Orchestration, file D). Avancée plusieurs fois par `--ff-only` sur
  ordre du garde de fraîcheur, sans commit propre : la tête de base est `3caabc93` (#2191). Commit tardif,
  juste avant le push (D-518).
- Lot `autonomie-pieges-restes` (ordre 35), toujours `pris` par Orchestration. La partie 2, #2184, est
  mergée en `3e437768`. Le `merge_fait` de l'intégrateur (ligne `20261116-2123-integrateur-d-2184`) a été
  lu et passé à `traite` à 22:02, heure de Paris. La boîte D ne contenait rien d'autre.

## Objectif

Partie 3 du lot. D'abord les trois points routés de #2184, notés dans le champ `motif` du carnet. Ensuite,
les pièges suivants du titre, un contrôle par piège.

## Décisions prises

- Aucune D-xxx : contrôles ajoutés, sans clinique, sans migration ni schéma, sans changement d'écran.
- **Crochet zsh.** Les heredocs se lisent en un seul passage, dans l'ordre (`lireHeredocs`). Chaque corps,
  cité ou nu, est retiré de la commande ; seul le corps nu est gardé à part, échappements `\x` retirés
  (sauf `\` en fin de ligne). Les trois routés se règlent tous de cette façon :
  1. le corps nu ne masque plus la suite ;
  2. `\$` est littéral ;
  3. un `<<EOF` cité dans un corps cité est consommé avec ce corps.
  Le fait zsh (2) est constaté par `zsh -f` : `\$NEW:refs/heads/x` reste tel quel, `$NEW:refs/heads/x`
  devient `abc123efs/heads/x`.
- **Opacité Tailwind.** Les classes sont compilées en mémoire par `tailwindcss/loadConfig` et postcss,
  comme la mémoire le recommandait, plutôt que déduites du code source.
  - Le gel est strict, classe par classe. #2188, arrivée pendant le lot, a retiré les six
    `bg-destructive/10` : le banc l'a vu et le gel les a perdus.
  - Pas de correction des classes gelées : elle changerait l'écran. Ajouter le jumeau RGB ferait tomber le
    contraste sous AA.
- **Flux SDK.** Le banc est borné à `web/src`. Les deux flux de `tools/corpus/` sans `signal`
  (`certify/certify.mjs:117`, `fiches-usage/rediger.mjs:92`) sont des outils hors ligne. `rediger.mjs` est
  en cours chez F05 (#2185). Ils sont routés, pas modifiés.

## Fichiers modifiés

- `.claude/hooks/block-risky-commands.mjs` et `.claude/hooks/block-risky-commands.test.mjs` (+5 cas).
- `.claude/rules/hooks-garde-fous.md` (une phrase).
- `web/src/lib/opaciteTailwind.guard.test.ts` et `web/src/lib/anthropicFluxBorne.guard.test.ts` (neufs).
- `changelog.d/2026-11-16-autonomie-pieges-restes-p4.md` et ce handoff.

## Validations exécutées

- `block-risky-commands.test` : 92/92.
  - Témoin sur le crochet de `origin/main` : les trois cas routés y donnaient le mauvais verdict ; le
    crochet neuf rend le bon.
  - Les deux cas de garde ajoutés (heredoc nu après un cité, `\$` suivi d'un `$` développé) restent refusés.
- `opaciteTailwind.guard` et `anthropicFluxBorne.guard` : 5/5.
  - Témoins temporaires : `border-surface-foreground/40` rougit le banc Tailwind, un `messages.stream`
    sans `signal` rougit le banc SDK. Les fichiers témoins sont retirés.
  - Le banc Tailwind discrimine `bg-primary/10` (générée) de `text-muted-foreground/70` (non générée).
- `npm run check` (T1 complet) : `code=0`.
- `wn-reviewer` (P0, diff local avant push) : NO-GO, levé à la correction du P1. Aucun P0. Ses constats :
  - **P1, banc Tailwind** : une sous-chaîne sans borne prenait `bg-primary/8` pour générée, à côté de
    `bg-primary/80`. Corrigé par un sélecteur borné, avec un témoin.
  - **P2, crochet** : le second heredoc d'une même ligne (`cat <<'A' <<B`) n'était plus lu, régression
    face à `main`. Corrigé : `lireHeredocs` lit désormais ligne par ligne.
  - **P3 corrigés dans le même geste** :
    - `<<<` pris pour un heredoc ;
    - terminateur indenté ou suivi d'espaces : zsh ne clôt que sur la ligne exacte, constaté par `zsh -f`
      sur un fichier à espace finale vérifiée ;
    - opacité arbitraire `/[.7]` ;
    - portée du banc Tailwind alignée sur `content`.
  - **Rejeu de ses 25 cas** : deux passent de refus à passe, et c'est zsh qui a raison. Un `EOF ` ne clôt
    pas, donc la suite est du corps ; l'autre est un corps cité de bout en bout.
  - Après les correctifs : crochets 620/620, bancs Vitest 7/7.
- Revue de l'écart par `wn-reviewer` : NO-GO sur un P1. GO dès ce P1 corrigé, ce qui est fait.
  - **Le P1.** Un `<<'X'` cité mais faux, dans un message de commit ou un commentaire, sans terminateur,
    avalait toute la suite de la commande. Un délimiteur mi-cité, `<<"E"OF`, était mal lu. C'était une
    régression face à `main`, sur cinq cas.
  - **Le correctif.**
    - Un heredoc cité non terminé redevient de la structure.
    - Un heredoc nu non terminé reste lu.
    - Le délimiteur est un mot shell entier, citations retirées.
  - Les cinq cas sont ajoutés aux bancs, en refus.
  - Crochets : 625/625.
  - Les 44 cas d'épreuve du relecteur sont rejoués contre `main`. Aucun cas ne régresse. Les seuls cas
    passés de refus à passe sont ceux où zsh lit du corps cité.
  - T1 complet : `code=0`.
- Contre-revue Codex P0 sur le diff poussé `facf02cd` : avis conforme (code 0), aucun P0. Les cinq
  constats sont corrigés dans le commit suivant, chacun avec un banc :
  - **P1, crochet** : un `\\` dans un délimiteur entre guillemets doubles n'était pas réduit.
    `<<"E\\OF"` ne trouvait pas `E\OF`, et le heredoc redevenait de la structure : le push passait. Le
    témoin passe de 0 à 2.
  - **Trois P2, banc SDK** : « signal: » écrit dans un prompt, une parenthèse dans une chaîne, et un appel
    coupé sur deux lignes. Chaînes et commentaires sont désormais masqués avant lecture. Une garde par
    fichier (appels bruts = appels lus) signale un littéral regex qui fausserait ce masquage.
  - **P2, banc Tailwind** : une opacité décimale `/10.5` était lue `/10`.
  - Après correction :
    - crochet : 102/102 ;
    - bancs Vitest : 9/9 ;
    - les 44 cas du relecteur rendent un verdict identique ;
    - T1 complet : `code=0`.

## Problèmes ouverts

- Routés, hors de ce lot : `tools/corpus/certify/certify.mjs:117` et `tools/corpus/fiches-usage/rediger.mjs:92`,
  deux flux SDK sans `signal`. Ils sont à borner par la file qui tient ces outils (F05 pour `rediger.mjs`).
- P3 assumés, déjà présents sur `main` ou hypothétiques :
  - dans le banc Tailwind : une classe construite (`bg-${x}/10`) ou une couleur arbitraire ne se lisent pas ;
  - dans le banc SDK :
    - un appel sous un autre nom que `.messages.` n'est pas vu ;
    - `stream: true` porté par une variable n'est pas vu ;
    - `signal: undefined` satisfait le banc ;
    - les littéraux regex ne sont pas lus par le masquage, mais un écart d'appels se signale ;
  - dans le crochet :
    - un `\` en fin de ligne d'un corps nu n'est pas joint à la suivante ;
    - une apostrophe entre guillemets doubles imbriqués sous `$(…)` (`"$(printf "l'ajout")"`) masque
      la suite ;
    - un `<<'X'` écrit entre guillemets ou dans un commentaire est encore pris pour un heredoc quand une
      ligne `X` vient plus loin : il masque ce qui la précède (déjà sur `main`).
- Restent au lot, pour les parties suivantes :
  - `prisma generate` à la création d'un worktree ;
  - les quatre pièges E2E ;
  - un lot d'ingestion de plus de 10 claims ;
  - les listes jumelles ;
  - release-db sur 504 ;
  - un one-off Scalingo recyclé ;
  - la réservation WN-SRC ;
  - les focus areas de PR-Agent ;
  - le SESSION_LOG réordonné ;
  - les sessions concurrentes sur la copie principale ;
  - les crochets de la copie principale en retard ;
  - `echo code=$?` en fond ;
  - `wn-attendre-ci` (tête périmée, e2e lent) ;
  - le statut « transféré » (décision requise) ;
  - la règle de lint « objet d'erreur brut ».

## Prochaine action exacte

1. Commit, push, contre-revue Codex P0 sur le diff poussé (`node scripts/wn-codex-avis.mjs`, avis déposé
   sur la PR).
2. PR (`--body-file`), `node scripts/wn-attendre-ci.mjs <N>` en fond, PR-Agent sur la tête.
3. « Prête @<sha> » en commentaire sur la PR **et** au registre ; relire la boîte D avant.
4. Partie 4 du lot : les pièges suivants.

## Interdits encore actifs

- Ni migration, ni schéma, ni clinique, ni donnée patient.
- Les classes d'opacité gelées ne se corrigent pas dans ce lot : c'est un changement d'écran.
- Un refus de crochet ne s'élargit pas à de la prose : apostrophes et heredocs cités restent libres.
- Ne jamais supprimer une ligne des registres (`questions`, `messages`, `lots`, `reponses`).
- Horodater en lisant l'heure système, jamais à l'estime.
