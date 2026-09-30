### Outillage Claude : le coût est dans la taille du contexte — sessions par lot, délégation sur Sonnet, plus de sondage (2026-09-30)

L'audit de consommation des 30 derniers jours (environ 5 500 $ d'équivalent
API au tarif Opus 5.5) a établi que **90 % du coût est du cache** : la boucle
principale tournait à 340k de contexte en moyenne, compactée à la main vers
530k, et chaque appel relit tout. Le modèle pèse peu : la lecture du cache
coûte le même prix sur Opus et Sonnet.

- **Défaut Opus 5.5 + effort high** (`.claude/settings.json`, arbitrage du
  responsable) — il remplace un « Sonnet 5 » que la pratique n'appliquait pas
  (99 % des appels principaux en Opus, 83 % en xhigh). Effort fixé par
  `modelSettings`, seul réglage qu'Opus 5.5 lit.
- **Délégué = Sonnet** : surcharge `.claude/agents/Explore.md` (l'Explore
  natif héritait d'Opus en xhigh), `CLAUDE_CODE_SUBAGENT_MODEL=sonnet` pour
  les sous-agents sans modèle ; `wn-reviewer` et `wn-fable` gardent le leur.
  Workflows : chaque agent fixe modèle et effort.
- **Méthode de session** (`CLAUDE.md`) : lancer à la racine du dépôt ;
  session principale dans la copie principale, où tournent les `/wn-*`, et
  sessions concurrentes en worktree ; un lot = une session (`/wn-handoff` puis
  `/clear`) ; `/compact` avant une pause d'une heure, jamais au retour ; section
  « Compact instructions ».
- **Sondage refusé** par `block-risky-commands` (`gh pr checks --watch`,
  `gh run watch`, boucles et `sleep` autour de `gh`, `sleep` + `tail` d'une
  tâche de fond) : environ 1 370 appels de ce type en septembre.
- **Revue de diff par workflow = P0 seulement** (`POLITIQUE_REVUE.md`) :
  17 revues en un mois, médiane 19 $, douze à dix-huit fois un `wn-reviewer`.
- Écarté après vérification adverse : réécrire `/wn-test` et une attente CI en
  skills forkées sur Sonnet — chaque fork ajoute deux appels principaux, et la
  plupart de ces séquences n'en font qu'un : le gain était nul ou négatif.
