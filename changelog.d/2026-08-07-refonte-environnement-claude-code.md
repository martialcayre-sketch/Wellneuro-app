### Refonte de l'environnement Claude Code — défaut « développeur senior », moins d'overhead

- **CLAUDE.md 309 → 191 lignes** : invariants globaux seulement (secrets, UI
  française, patients fictifs, migrations, worktree/session), plus deux
  sections nouvelles — comportement « développeur senior » et doctrine
  modèle/effort par défaut (**Sonnet 5 + effort high + solo** ; Opus si risque
  critique ; Fable si profondeur exceptionnelle ; Ultracode sur opt-in). Les
  règles spécialisées partent en **`.claude/rules/`** path-scopées (db-prisma,
  clinique-scoring, frontend-ui, docs-changelog, hooks-garde-fous). Aucun
  garde-fou retiré.
- **Fin du méta-routage automatique** : `wn-route` n'est plus invoqué à chaque
  début de session (le défaut vit dans CLAUDE.md) et redevient manuel ;
  `wn-route`/`wn-model`/`wn-ultra`/`wn`/`wn-lot` passent de 618 à 277 lignes.
  L'échelle `think`/`think hard`/`think harder` (non reconnue par les versions
  actuelles de Claude Code) disparaît partout ; les revues à risque s'appuient
  sur les agents épinglés (`wn-reviewer` opus/high).
- **Moins d'appels réseau** : `wn-cycle.mjs` perd la sonde `gh --version`
  (disponibilité déduite du premier `gh pr list`), saute le fetch si
  `FETCH_HEAD` a moins de 5 min et ne lit plus `git status` qu'une fois ;
  `wn-attendre-ci.mjs` perd sa sonde, adopte un polling adaptatif 20 → 60 s
  (CI de 5 min : ~8 lectures au lieu de 15) et imprime un snapshot PR final
  que `/wn-merge` lit au lieu de refaire `gh pr view`. Codes de sortie, cache
  par SHA et bancs (2×39 tests) inchangés.
- **Hook de journalisation** `log-bash-command.mjs` passé `async: true`
  (observabilité pure) et durci (écriture sous try) ; les trois hooks de
  sécurité restent synchrones.
- **Workflows CI** : les longs commentaires historiques de `ci.yml` et
  `release-db.yml` sont déplacés vers
  `docs/adr/2026-08-07-commentaires-workflows.md` ; les invariants gardent
  leur raison courte sur place, zéro changement fonctionnel.
