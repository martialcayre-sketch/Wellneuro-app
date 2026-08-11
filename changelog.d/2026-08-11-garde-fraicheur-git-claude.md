### Modifié

- Claude Code vérifie désormais `origin/main` au démarrage ou à la reprise et
  refuse une première édition si le fetch a échoué ou si la branche repose sur
  une base périmée. Le garde ne modifie jamais l'historique Git.
- Les règles conversationnelles communes sont centralisées dans `CLAUDE.md` :
  une décision confirmée n'est pas remise en discussion, les questions portent
  seulement sur les ambiguïtés non vérifiables, et les updates se limitent aux
  événements significatifs.
