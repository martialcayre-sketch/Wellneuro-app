### Outillage

- **`scripts/wn-cycle.mjs` — phase du cycle de lot et geste suivant.** Le merge
  d'une PR de lot est un squash : la clôture (`SESSION_LOG.md`) et le handoff
  (`HANDOFF_CURRENT.md`) écrits après lui ne remontent plus vers `main` et
  coûtent une seconde PR de doc — c'est ce qui a produit #547 et #548 après
  #545. Le script rend la phase (`hors-lot`, `travail`, `pret-pr`,
  `pr-ouverte`, `apres-merge`) et sort en échec quand la fenêtre est déjà
  fermée. Il est chargé par le bloc `!` de `/wn-finish` et `/wn-handoff` : le
  verdict arrive dans le contexte avant la première écriture, sans dépendre
  d'une invocation croisée entre skills, interdite ici. `--appliquer`
  resynchronise `docs/claude/campagnes/ACTIVE_CAMPAIGN.md` et renseigne les
  champs `git.*` de `.wn/state.json`, restés `null` depuis leur création.
- **Ordre du cycle explicité** dans `/wn-lot`, `/wn-finish`, `/wn-handoff`,
  `/wn-campaign-run` et `CLAUDE.md` : `/wn-finish` puis `/wn-handoff write`
  **avant** `/wn-pr`, sur la branche vivante.
