# Handoff — 2026-09-16 — Les deux règles qui ne se voient pas au vert sont posées

Consigne du responsable (« lire la revue Copilot avant chaque merge », plus
l'ordre contraint de `release-db`) transformée en règle armée. Aucune décision
nouvelle : `D-087`, `D-120` et `docs/DEPLOIEMENT_RELEASE_DB.md` restent la
source ; ce lot les rend atteignables au moment où elles servent.

## Branche et état Git

`wn-regles-revue-release-db-2026-09-16`, branchée sur `origin/main` (`9c7317d0`).
Diff documentaire plus un skill.

## Ce que le lot pose

| Fichier | Rôle |
|---|---|
| `.claude/rules/pr-revue-et-release-db.md` | **Neuf.** Armé sur `.github/**` et `web/prisma/**`. Sept sections : commentaires de revue, merge, ordre `release-db`, timing, cinq pièges, comment constater, ce qu'il ne couvre pas |
| `docs/claude/REGLES_PR_MERGE.md` | Renvoi en tête — c'est le chemin de chargement réel, `/wn-merge` lisant ce fichier entier |
| `CLAUDE.md` | Cinq lignes dans §PR, CI, merge : les deux faits, pas leur détail |
| `.claude/skills/wn-merge/SKILL.md` | Étape 6 **neuve et bloquante** : lire les commentaires, un verdict chacun. Étapes suivantes renumérotées (6→7, 7→8, 8→9), références internes suivies |
| `changelog.d/`, `SESSION_LOG.md`, ce handoff | Clôture, écrite sur la branche vivante |

## Les deux trous fermés

**Un commentaire de revue n'est pas un check.** Les commentaires *en ligne* ne
sont ni dans le rollup, ni dans `reviews`, ni dans `gh pr view --comments` : seul
`gh api repos/{owner}/{repo}/pulls/<N>/comments` les rend. Trois verdicts, aucun
commentaire sans l'un d'eux — corrigé (commit nommé), écarté **avec motif** sur
pièces, routé **avec adresse**. Précédent : le 2026-09-16, quatre PR mergées sur
CI vert sans cette lecture ; quatre des six constats tenaient, dont deux défauts
en production.

**Une migration mergée n'est pas une migration appliquée.** Sept étapes, chacune
avec l'état qui la clôt, jusqu'à « le code consommateur part — et seulement là ».
Le timing est écrit parce qu'il ne se subit pas : entre le merge et
l'approbation, l'application est en panne sur tout ce que la migration touche.

## Corrigé au passage — et pourquoi ce n'était pas hors périmètre

`/wn-merge` et `REGLES_PR_MERGE.md` envoyaient vérifier la base de production par
l'`execute_sql` MCP Supabase — base **décommissionnée** le 2026-09-01
(`D-120`) — et le skill interdisait en plus explicitement le geste devenu correct
(« jamais une commande Bash »). Les laisser aurait rendu les deux fichiers
contradictoires avec la règle posée dans le même diff. Les deux pointent
maintenant `scalingo --app wellneuro run -d "npx prisma migrate status"`.

## Question ouverte pour le responsable

**Faut-il enregistrer ceci comme `D-214` ?** Non pris ici : c'est une
consolidation de doctrine existante, pas un arbitrage neuf, et le numéro ne se
réserve qu'au merge (sept collisions en deux jours cette semaine). Si la réponse
est oui, l'entrée s'écrit après ce merge, avec le numéro libre à ce moment-là.

## Prochaine action

Ouvrir la PR `--base main`, `wn-attendre-ci` en un seul appel hors tube, **lire
la revue Copilot et rendre un verdict par commentaire** — la première application
de la règle qu'elle pose —, puis merger avec `--subject`.
