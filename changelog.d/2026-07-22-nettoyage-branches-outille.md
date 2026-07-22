### Nettoyage outillé des branches et worktrees obsolètes (2026-07-22)

Le squash merge de Copilot rend `git branch --merged` aveugle : aucun tip de
branche n'est ancêtre de `main`, et 76 branches locales, 15 branches remote et
7 worktrees morts s'étaient accumulés en trois semaines sans qu'aucun outil ne
les voie. `scripts/nettoyage-branches.sh` rejoue la preuve utilisée pour cette
purge : une branche n'est supprimable que si son tip est contenu dans le head
d'une PR mergée (`headRefOid` via `gh`) ou ancêtre de `origin/main` ; constat
seul par défaut, `--appliquer` pour purger. Sont toujours conservés : PR
ouvertes, branches extraites, worktrees verrouillés ou sales, PR fermées sans
merge — le travail jamais mergé découvert pendant la purge (journal LOT-01b)
prouve que ce garde-fou n'est pas théorique. En parallèle,
`delete_branch_on_merge` est activé sur le dépôt : le remote se nettoie
désormais seul au merge.
