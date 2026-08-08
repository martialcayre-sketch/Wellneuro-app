### Archivage de l'orchestrateur GitHub orphelin

- `scripts/wn-github-orchestrator.mjs` déplacé vers `archive/scripts/`
  (référence seule) : aucun skill, hook, workflow ni script ne l'invoquait et
  il n'avait pas de banc de test — constat du contre-audit de la refonte de
  l'environnement Claude Code (PR #618). Sa politique `.wn/orchestrator.json`
  reste en place tant qu'un successeur ne la reprend pas.
