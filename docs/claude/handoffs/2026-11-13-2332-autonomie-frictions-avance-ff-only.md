# Handoff — 2026-11-13 — Autonomie des sessions, frictions (5) : avance `--ff-only` d'une branche sans commit propre (D-518)

## Branche et état Git

- Branche `chore/autonomie-avance-ff-only` dans le worktree `.claude/worktrees/file-d-artefacts`, créée sur
  `origin/main` (cb608354). Elle a été avancée deux fois par `--ff-only` pendant la rédaction (65625062, puis
  921f0908, qui apporte #2089), sans commit propre : c'est le §1 de la décision, appliqué à la branche qui la porte.
- Lot du carnet `autonomie-frictions` (D-510), ordre 20, partie d. Les autres parties sont toutes mergées :
  - a : #2070 ;
  - c : #2074 ;
  - b : #2089.

## Objectif

Consigner la réponse du responsable à la question `20261113-1905-d` (option A), puis y aligner le garde de
fraîcheur, sa règle et `CLAUDE.md`. Les refus du garde sur une branche sans commit propre cessent d'arrêter la
session, et la session ne fusionne toujours pas une branche commitée.

## Décisions prises

- `D-518` (réservée par `wn-reserver-decision.mjs`), acceptée par la réponse A. L'option B (fusion sans conflit
  d'une branche commitée) et l'option C (le garde avance lui-même) sont écartées.
- Le jugement du garde ne change pas : seuls ses deux messages changent. Le banc fige désormais le contrat du
  message de refus.
- Sur une remarque de `wn-reviewer` (P1), la décision ne prescrit pas le moment du commit. L'option A ne l'avait pas
  arbitré, et la question annonçait « pendant un lot déjà commité, rien ne change ».

## Fichiers modifiés

- `docs/decisions/D-518.md` (neuf)
- `.claude/hooks/git-freshness.mjs` (message de refus, avis de démarrage), `.claude/hooks/git-freshness.test.mjs`
  (contrat du message)
- `.claude/rules/hooks-garde-fous.md`, `CLAUDE.md` (§ Début de session)
- `changelog.d/2026-11-13-autonomie-frictions-avance-ff-only.md` ; ce handoff.

## Validations exécutées

- `node --test .claude/hooks/git-freshness.test.mjs` : 29/29, après les corrections.
- T1 complet (`npm run check`) : vert sur la première version. Il est rejoué avant le commit.
- `wn-reviewer` sur le diff non commité, avec la mission « la PR affaiblit-elle un garde-fou au-delà de l'option
  A ? » : NO-GO pour deux P1.
  - P1-a : le §3 prescrivait de « commiter au moment de pousser », une conduite que l'option A n'avait pas
    arbitrée. Il est réécrit en constat, et la consigne est retirée de `CLAUDE.md`.
  - P1-b : le cas « l'avance échoue » manquait dans les textes que lit la session. Une session aurait pu enchaîner
    `stash`, `--ff-only` et `stash pop`, soit l'option B par un autre chemin. Le message, la règle, `CLAUDE.md` et
    le §2 disent maintenant « arbitrage, ni stash ni commit pour forcer ».
  - P2 corrigés :
    - la citation du §4 ;
    - « commit propre », défini par `origin/main..HEAD` ;
    - « sa branche, dans son propre worktree » (la copie principale reste à l'intégrateur) ;
    - les réglages cités sont ceux, locaux, de la copie principale ;
    - la rubrique « Ce qu'elle ne décide pas » est ajoutée ;
    - ce handoff ;
    - l'assertion du banc.
- `wn-reviewer` sur l'écart : GO, les deux P1 levés. Un P2 restait (le §4 disait que le banc ne figeait pas les
  textes), corrigé : le banc fige le contrat, pas la phrase entière.
- Contre-revue Codex (P0, `wn-codex-avis.mjs --mode revue`, diff poussé d96b27a6) : avis conforme, aucun P0 ni P1, pas
  d'élargissement de l'option A. Un P2 corrigé : une avance « peut » échouer sur un chemin commun, mais pas toujours,
  par exemple quand la modification locale est identique à la version entrante.

## Problèmes ouverts

- `scripts/wn-cycle.mjs` dit « Réconcilier est un arbitrage humain ». La phrase vise la divergence de la branche
  `main` locale, pas une branche de session : hors périmètre, elle n'est pas touchée.

## Prochaine action exacte

1. CI, PR-Agent, Codex P0, « prête @<sha> », ligne `prete` au registre.
2. Lot `autonomie-frictions` à `fait` au merge de cette PR.

## Interdits encore actifs

- La session ne fusionne pas `origin/main` dans une branche qui a un commit propre sans arbitrage, et ne force pas
  une avance en échec, ni par `stash` ni par un commit.
- Le garde ne fait jamais lui-même de pull, de merge, de rebase ni de checkout.
