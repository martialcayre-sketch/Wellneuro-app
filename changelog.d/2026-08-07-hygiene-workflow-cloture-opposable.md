### Outillage — la clôture de lot devient opposable, le pointage devient fiable

- Suppression des 7 skills legacy `wn-r0`…`wn-r6` (stubs de redirection,
  chantier clos le 2026-07-10) et purge des références vivantes.
- `wn-cycle.mjs` fait un `git fetch` borné et tolérant au hors-ligne, affiche
  l'écart ahead/behind du défaut local vs `origin` et signale un pointage
  `.wn/state.json` périmé — constat seulement, jamais de réconciliation
  automatique.
- `/wn-pr` refuse d'ouvrir une PR sans clôture (SESSION_LOG + fragment de
  handoff) dans le diff ; `/wn-merge` refuse de merger une PR dont les `files`
  ne la portent pas — la PR de rattrapage d'une fenêtre ratée passe par
  construction. L'ancre sed « Attendre le CI » de `/wn-merge`, désynchronisée
  par un renommage de titre, est réparée et désormais gardée par
  `wn-check-automation.sh`.
- `.wn/state.json` s'écrit atomiquement (write-temp + rename) : deux sessions
  concurrentes ne peuvent plus laisser un JSON tronqué. `--appliquer` alimente
  `recent_decision_ids` depuis `docs/DECISIONS.md`.
