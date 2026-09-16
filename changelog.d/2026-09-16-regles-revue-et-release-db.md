### Un commentaire de revue n'est pas un check, et une migration mergée n'est pas appliquée : les deux règles sont posées (2026-09-16)

`.claude/rules/pr-revue-et-release-db.md` réunit ce que le vert ne dit pas. Le
fichier est armé sur `.github/**` et `web/prisma/**`, renvoyé depuis
`docs/claude/REGLES_PR_MERGE.md` — que `/wn-merge` charge en entier — et résumé
en cinq lignes dans `CLAUDE.md`.

**Les commentaires de revue se lisent, et chacun reçoit un verdict.** Les
commentaires *en ligne* n'apparaissent ni dans le rollup de checks, ni dans
`reviews`, ni dans `gh pr view --comments` : seul
`gh api repos/{owner}/{repo}/pulls/<N>/comments` les rend. Trois verdicts, et
aucun commentaire n'en sort sans — **corrigé** (le commit est nommé), **écarté
avec motif** (sur pièces : ligne, banc, `D-xxx`), **routé** (`FILE_ATTENTE.md`
ou dette de `ROADMAP_TECHNIQUE.md`, avec son adresse). Un commentaire sans
verdict au merge disparaît : le squash efface la branche. Le 2026-09-16, quatre
PR de la campagne Correspondance ont été mergées sur CI vert sans cette lecture ;
quatre des six constats laissés là tenaient, dont deux défauts en production.

**Le geste devient bloquant dans `/wn-merge`**, en étape distincte entre
l'exception migration/auth et la clôture opposable : sans verdict sur chaque
commentaire, pas de merge. La sortie du skill rend désormais le compte des
commentaires et le verdict de chacun.

**L'ordre de `release-db` est écrit en sept étapes, chacune avec l'état qui la
clôt** — et le rappel que merger n'applique rien : entre le merge et
l'approbation, l'application est en panne sur tout ce que la migration touche,
Prisma sélectionnant explicitement toutes les colonnes scalaires d'un modèle.
Suivent les cinq pièges déjà payés (run `queued` sans job, tête de `main` qui
bouge et tue le run sans rien écrire, one-off détaché qu'un `cancel` GitHub
n'arrête pas, absence de sentinelle qui vaut INCONNU et non échec, run rouge
laissant code neuf sur schéma ancien). Rien n'est réarbitré : `D-087` et
`docs/DEPLOIEMENT_RELEASE_DB.md` restent la source.

**Deux renvois périmés corrigés au passage.** `/wn-merge` et
`docs/claude/REGLES_PR_MERGE.md` envoyaient tous deux vérifier la base de
production par l'`execute_sql` MCP Supabase — base décommissionnée le
2026-09-01 (`D-120`) —, le premier interdisant même explicitement le geste
devenu correct (« jamais une commande Bash »). Les deux pointent maintenant le
conteneur one-off Scalingo.
