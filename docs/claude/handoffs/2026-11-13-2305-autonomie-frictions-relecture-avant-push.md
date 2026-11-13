# Handoff — 2026-11-13 — Autonomie des sessions, frictions (4) : relecture adverse locale avant le push

## Branche et état Git

- Branche `chore/autonomie-relecture-avant-push-b` dans le worktree `.claude/worktrees/file-d-artefacts`, créée sur
  `origin/main` (d9c4f769).
- Lot du carnet `autonomie-frictions` (D-510), ordre 20, partie b. Un premier commit, sur
  `chore/autonomie-relecture-avant-push` (jamais poussé), avait été dépassé par `main` pendant sa revue. Sur
  arbitrage du responsable (`20261113-1945-d`, option B), il est refait ici avec ses corrections, et l'ancienne
  branche locale est abandonnée.
- Les autres parties :
  - a : #2070 (`pr_agent.yml`), mergée ;
  - c : #2074 (pièges convertis en contrôles), mergée ;
  - d : question `20261113-1905-d`, répondue A (la D-xxx est à rédiger, dans une PR à part).

## Objectif

Attraper avant la PR les défauts que les revues externes trouvaient après elle. L'audit du cadrage « autonomie des
sessions » (2026-11-12, hors dépôt) comptait 157 interruptions en trente jours. La conception proposait une
« pré-revue locale bloquante, ciblée sur les défauts déjà vus ».

## Décisions prises

- Pas de passe de plus ni de nouveau contrôle bloquant, puisque le responsable demande « pas plus de contraintes
  qu'aujourd'hui ». La passe du barème est la même, jouée plus tôt sur le diff local, et `wn-reviewer` y ajoute une
  grille.
- Le diff non commité suffit à cette revue. C'est la leçon du premier essai : un commit local dépassé par `main`
  ne s'avance plus par `--ff-only`.
- Aucune D-xxx : le barème (P2, P1, P0) ne change pas. La question `20261112-1701-g` (barème) reste ouverte et
  n'est pas tranchée ici.
- La règle de lint proposée contre la journalisation d'un objet d'erreur Prisma brut n'est pas livrée. Il faudrait
  d'abord relever les usages existants, sinon elle rougirait le lint d'emblée. Elle reste listée dans
  `autonomie-pieges-restes`.

## Fichiers modifiés

- `.claude/agents/wn-reviewer.md` (grille, moment de la revue, rendu)
- `docs/claude/POLITIQUE_REVUE.md` (moment de la revue interne ; articulation alignée sur D-499)
- `changelog.d/2026-11-13-autonomie-frictions-relecture-avant-push.md` ; ce handoff.

## Validations exécutées

- Première passe de `wn-reviewer` sur le premier commit : NO-GO.
  - P1 : « un commit poussé ensuite demande toujours une revue de l'écart » étendait la règle 1.6 à toute
    revue interne. La phrase est restreinte au cas où `wn-reviewer` tient lieu de revue exigée (D-499 §2, D-448).
  - P2 : le chiffre de l'audit n'avait pas de source dans le dépôt. Il est retiré du prompt de l'agent et du
    fragment, et sa source est nommée ici.
  - P2 : le handoff renvoyait le résultat de `check:rapide` à la PR. Il est maintenant écrit ci-dessous.
- `npm run check:rapide` : vert, 17 étapes, 2 sautées.
- `wn-reviewer` sur ce diff, non commité, avant le push : les trois corrections tiennent, mais NO-GO pour un P1.
  `git diff --merge-base origin/main` ne montre pas les fichiers non suivis, si bien qu'une revue sur du non
  commité pouvait manquer un fichier neuf, une migration par exemple. Corrigé : le prompt fait lire les `??` de
  `git status --short`. Trois P2 corrigés : l'avance `--ff-only` est possible tant que `main` ne touche pas les
  mêmes fichiers ; le sens du fragment est rétabli ; ce verdict est écrit ici.
- `wn-reviewer` sur l'écart des corrections : GO. Restait un P2, un renvoi à une ligne absente de ce handoff, corrigé
  par la présente ligne.

## Problèmes ouverts

- Règle de lint « objet d'erreur brut journalisé » : à relever puis à poser, ou à écarter
  (`autonomie-pieges-restes`).
- Le gain de la grille ne se mesurera qu'aux prochaines PR, au nombre de remarques de PR-Agent corrigées après
  l'ouverture.

## Prochaine action exacte

1. CI, PR-Agent, « prête @<sha> », ligne `prete` au registre.
2. Lot `autonomie-frictions` à `fait` au merge de cette PR, si la D-xxx de la partie d est alors rédigée.

## Interdits encore actifs

- Pas de nouvelle passe ni de contrôle bloquant sans arbitrage.
- Codex seulement par `wn-codex-avis.mjs`, sans aucune donnée patient ni aucun secret dans un paquet.
