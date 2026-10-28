# Règles PR, CI et merge — Wellneuro

Ce document porte le détail de la gouvernance des PR : attente du CI, régime de
revue et de merge, exception migration/authentification.

**Pourquoi ici et non dans `CLAUDE.md`.** Ces règles ne servent qu'au moment
d'ouvrir, suivre ou merger une PR — mais `CLAUDE.md` est relu *intégralement à
chaque requête de chaque session*. Elles y coûtaient 7 417 o (27,8 % du fichier)
payés partout, et étaient de surcroît rechargées une seconde fois par
`/wn-merge` au moment utile. Sorties ici, elles sont payées une fois, là où elles
servent. `CLAUDE.md` garde la décision non négociable et renvoie ici pour le
détail ; `/wn-merge` charge ce fichier entier.

Rien n'a été réécrit lors du déplacement : le texte ci-dessous est celui qui
était dans `CLAUDE.md` jusqu'au 2026-08-07.

> **À lire avec ce document : `.claude/rules/pr-revue-et-release-db.md`.** Il
> porte ce qui manque ici et ne se voit pas au vert — **les commentaires de
> revue** (les lire est un geste distinct du CI ; les commentaires *en ligne*
> n'apparaissent ni dans `reviews` ni dans `gh pr view --comments` ; **un constat
> peut n'être nulle part ailleurs que dans le *corps* de la revue**, bloc
> « Suppressed comments », `pulls/<N>/comments` rendant alors `[]` — lire
> `.reviews[].body` ; trois verdicts, et aucun commentaire n'en sort sans) et
> **l'ordre de `release-db`**
> (une migration mergée n'est pas une migration appliquée). Le 2026-09-16,
> quatre PR ont été mergées sur CI vert sans lire la revue : quatre constats
> réels y attendaient. **Ce fichier se charge tout seul au moment utile** : il
> est armé par chemin sur `.github/**` et `web/prisma/**`, et le préambule de
> `/wn-merge` le lit en entier, comme celui-ci — un renvoi qui demanderait au
> lecteur d'aller le chercher ne serait pas une règle, juste un vœu.

## Attendre le CI d'une PR — un script, plus un idiome

```bash
node scripts/wn-attendre-ci.mjs <N>     # un seul appel bloquant, en tâche de fond
```

Un seul appel bloquant remplace le sondage répété (le 2026-07-20, une session a
produit 81 appels de `gh pr checks` pour l'information que cet appel rend en un
seul). Mais la boucle `until … bucket=="pending"` qui tenait ce rôle jusqu'au
2026-08-03 **ne distinguait pas « aucun check en attente » de « aucun check du
tout »** : elle rendait la main sur deux checks Vercel verts quand `verify`
n'avait jamais été créé. C'est arrivé sur la PR #550, et le correctif a dû être
refait à la main sur #553. Une règle oubliée deux fois devient exécutable.

| Code | Sens | Geste |
|---|---|---|
| `0` | les checks **obligatoires** ont tourné et sont verts | annoncer la PR prête |
| `1` | un check obligatoire a échoué | lire le log, corriger |
| `2` | un check obligatoire **n'a pas tourné** — absent, gelé en `action_required`, ou run **annulé** (`concurrency`) sans remplaçant | le script nomme **toutes** les causes applicables ; ne pas merger |
| `3` | délai dépassé sans conclusion | expirer n'est pas réussir |
| `4` | **indéterminé** — PR illisible ou mergée, `gh` muet, ou liste des checks obligatoires illisible | aucun verdict ; ne pas merger |
| `5` | les checks sont verts mais la PR est **en conflit** | ce vert porte sur un commit qui n'est pas le résultat fusionné |

**`0` est le seul code qui autorise à annoncer une PR prête.** Les cinq autres
disent, chacun à sa façon, qu'on ne peut pas l'affirmer — y compris `4`, qui
couvre le cas où la liste des checks obligatoires n'a pas pu être lue : ne
sachant plus ce qu'il fallait attendre, le script se tait plutôt que de replier
en silence sur `verify`.

La liste des checks attendus vient de la **protection de branche** (`verify`
aujourd'hui), pas d'une constante : un second check rendu obligatoire est suivi
sans toucher au script. Ce qu'il ne fait pas : merger, ou dire s'il faut merger.
Un même nom porté par **deux runs** n'est vert que si les deux le sont — le
rouge ne se laisse pas écraser par l'ordre du tableau. (Le cas venait des
branches `campaign/**`, que `ci.yml` déclenchait sur `push` *et* sur
`pull_request` ; le déclencheur `push` y a été retiré le 2026-08-07, le garde
reste.) Un run **annulé** — `CANCELLED`, la trace normale d'un run supplanté
depuis le bloc `concurrency` de `ci.yml` — n'est ni vert ni un échec : le script
attend le run du commit de tête, puis sort en `2`.

**Ne jamais relancer un run qui n'est pas celui de la tête, tant que celui de la
tête n'a pas conclu.** Hors `main`, `ci.yml` range tous les runs d'une branche
dans un **même groupe de concurrence**, `cancel-in-progress` compris
([`.github/workflows/ci.yml:21-23`](../../.github/workflows/ci.yml)) — la
condition `github.ref == 'refs/heads/main'` n'ajoute `run_id` au groupe que sur
`main`, si bien que toute branche de PR n'a qu'un seul groupe pour toute sa vie.
Relancer un run périmé — pour lever un flake, pour revoir un log — y fait entrer
un run neuf, qui **annule celui du commit de tête s'il est encore en attente ou
en cours** : la PR se retrouve alors sans run vert, `wn-attendre-ci` sort en
`2`, et l'attente recommence à zéro. **La condition est réelle et ne protège
pas** — un run déjà conclu ne peut plus être annulé, mais la fenêtre où le run
de tête est encore en cours est exactement celle où l'on est tenté de relancer
autre chose pour occuper l'attente. Ce qui se relance est le run **de la tête**,
jamais un run plus ancien ; et un bras témoin se lance **avant** de pousser la
suite, pas après. Constaté le 2026-09-17. Le pendant, plus strict, existe déjà
pour les rouges WebKit du CI : ceux-là ne se relancent jamais du tout (`D-155`).

Gabarit de corps de PR et check-list complète : le skill `/wn-pr` (invocation
manuelle ; ces idiomes valent pour **toute** ouverture de PR, `/wn-pr` invoqué ou non). <!-- mention-seule: wn-pr -->

## Revue par CodeRabbit, merge par l'assistant (`D-290`)

**Régime en vigueur depuis le 2026-10-14 (`D-290`).** La revue de code appartient
à **CodeRabbit** (`coderabbitai[bot]`, configuré par `.coderabbit.yaml` à la
racine) ; le merge des PR et la suppression des branches appartiennent à
**l'assistant**, par la délégation du responsable du 2026-09-30, selon l'idiome
« Cycle PR complet côté assistant » plus bas. CodeRabbit n'approuve pas et ne
merge pas : son approbation n'est pas requise. Comment lire ce qu'il écrit,
l'attendre et rendre les verdicts : `.claude/rules/pr-revue-et-release-db.md` §1.

**La revue de substitution (`D-393`, qui amende `D-290` §1 et §3).** Une
seule revue de bot est exigée sur la tête. Si CodeRabbit saute la PR (statut
`skipping`, moins de dix étoiles) ou bute sur son quota (« Review rate
limited »), la revue de **PR-Agent** (`.github/workflows/pr_agent.yml`,
commentaire de `github-actions[bot]`) le remplace, sans redemander
CodeRabbit. Elle n'est prouvée sur la tête que par les quatre conditions
de `D-393` §2 : run `pull_request` conclu `success` sur la tête, diff
entier (« returning full diff »), commentaire persistant écrit pendant ce
run (bloc d'état avec `head_sha` = tête et `excluded_files` vide, ou, sans
remarque, aucun bloc), aucune autre revue de PR-Agent pendant ce run ni
commande PR-Agent postée sur la PR après son début. Une PR de clôture seule, ou
faite seulement de fichiers exclus du modèle, ne produit pas de revue
PR-Agent : CodeRabbit s'y demande à la main (`D-393` §4). Lecture et verdicts :
`.claude/rules/pr-revue-et-release-db.md` §1.6 et §1.10.

**L'intégrateur (`D-373` §2 et §3, qui amende `D-290` §1).** La délégation ne
change pas, son porteur change. Pendant l'essai (fiche H89 du plan), une
session « intégrateur », seule occupante de la copie principale, merge les
PR ordinaires. Une file déclare sa PR par un commentaire **« prête @<sha> »**
qui porte le chemin de son fragment de handoff et ses exceptions, puis fait
`/clear`. Une PR n'a qu'un responsable actif à la fois. Les lots de
migration, d'authentification, de `.coderabbit.yaml` et de `pr_agent.yml`
(`D-393` §6) ne se déclarent pas :
leur file les merge jusqu'au bout. Une remarque de bot arrivée après
« prête » revient à la file, qui reprend depuis son handoff : l'intégrateur
ne corrige pas une PR. En repli (`D-373` §5), chaque session reprend ses
merges selon le même cycle, plus bas.

La raison de fond tient toujours, et c'est elle qui fait garder un bot de revue
plutôt que d'en reprendre la charge : un **regard différent** sur le code — une
revue par l'agent qui vient de l'écrire est une relecture, pas une revue.

**Historique — décision du 2026-07-21, amendée par `D-290`.** La revue, le
merge et la suppression des branches appartenaient alors à **Copilot** ;
l'assistant ouvrait la PR, vérifiait le CI, annonçait l'état et s'arrêtait là.
Deux raisons : le regard différent, et le **coût en tokens** du suivi de CI et
du merge. Le merge est passé à l'assistant le 2026-09-30 ; la revue a quitté
Copilot le 2026-10-14, son quota épuisé.

**Effet de bord à connaître.** Quand le commit de tête d'une PR a été poussé
par le bot Copilot (un merge de `main` résolu par lui, par exemple, sur une PR
du dépôt et non d'un fork — non observé avec CodeRabbit, dont les générations
qui commitent sont coupées par `.coderabbit.yaml`), GitHub a mis le run
`pull_request` en `action_required` et **n'exécute rien** sans approbation
humaine. `gh pr checks` n'affiche alors que les checks Vercel, **sans `verify`** :
la PR paraît verte alors que la vérification n'a jamais tourné. Vérifier la
présence de `verify`, et débloquer en poussant un commit sous le compte du dépôt
— `POST /actions/runs/{id}/approve` ne s'applique qu'aux PR issues de forks.

### Quand l'assistant merge : le sujet est à poser

**Le sujet du commit de squash vient du COMMIT de branche, pas du titre de la
PR.** Réglage du dépôt : `squash_merge_commit_title = COMMIT_OR_PR_TITLE` —
GitHub prend le titre du **commit** quand la branche ne porte qu'un seul commit
*réel*, les commits de fusion ne comptant pas. **Éditer le titre de la PR ne
change donc rien**, et `gh pr edit --title` donne l'illusion inverse.

Le cas où ça mord : une décision renumérotée en cours de route — fréquent
tant que le numéro se prenait au merge, plus rare depuis qu'il se réserve à la
rédaction (`D-370`, `node scripts/wn-reserver-decision.mjs`), mais pas exclu
pour une décision posée sans réservation (voir l'en-tête de
`scripts/lib/decisions-numerotation.mjs`). Le registre porte `D-147`, le sujet
du commit annonce `D-145`, et `main` ne se réécrit pas. Trois PR en portent la
trace : #943, #949, #950 — celle de #949 citant un `D-145` qui **existe** et
désigne autre chose, si bien que remonter du `git log` au registre mène à un
faux ami.

Poser le sujet explicitement, ce qui ne demande aucun `force`-push
(contrairement à un `commit --amend`) :

```bash
gh pr merge <N> --squash --delete-branch --match-head-commit <sha revu> --subject "<sujet exact>"
```

Une PR gelée ne peut pas être mergée pour autant : `verify` est un **check
obligatoire** de la protection de `main`, et `enforce_admins` est actif depuis le
2026-07-21 — **personne ne passe outre, propriétaire compris**. Un run gelé
bloque donc le merge au lieu de ressembler à un succès. Pour un correctif
d'urgence, il faut désactiver le réglage explicitement avant de merger
(`gh api -X DELETE repos/<dépôt>/branches/main/protection/enforce_admins`), puis
le remettre. Ce geste doit rester visible et rare.

`strict` reste **désactivé** délibérément : une PR peut être mergée sans avoir
été remise à jour sur `main`. Peu de PR tournent en parallèle ici, et l'activer
imposerait une resynchronisation et un nouveau CI à chaque merge concurrent —
friction quotidienne pour un incident rare.

### Cycle PR complet côté assistant (idiome de merge)

La délégation du responsable (2026-09-30) confie le suivi du CI, le merge et le
nettoyage à l'assistant ; `D-290` en fait le régime en vigueur, la revue restant
à CodeRabbit. Si le responsable retire cette délégation, cette section se retire
avec elle, et `/wn-merge` s'arrête à l'annonce du CI. Une fois le CI vert lu
(idiome d'attente ci-dessus) **et la revue de bot lue sur le sha de tête
— CodeRabbit, ou PR-Agent en substitution (`D-393`) —, chaque remarque
tranchée** (`.claude/rules/pr-revue-et-release-db.md` §1),
enchaîner en un minimum d'allers-retours :

1. **Vérifier que `verify` a réellement tourné**, pas seulement les checks Vercel
   ou le statut `CodeRabbit` (effet de bord `action_required` décrit plus haut) ;
   sans `verify`, ne pas merger.
2. **Avant chaque merge, l'étape 7 bis du skill `wn-merge`** (`D-373` §2, §4
   et §7) : sonde du déploiement, contrôle sur l'arbre fusionné, relecture du
   registre `docs/DECISIONS.md`, signal de chevauchement, `main` inchangé.
   Les commandes, les codes et ce que chacun arrête sont dans le skill ; ce
   texte ne les recopie pas.
3. Juste avant le merge, l'étape 7 ter : la sonde release-db (`D-374` §2 à §4)
   `node scripts/wn-sonde-release-db.mjs <N>` — `0` seul autorise ; `1` gelé,
   `2` lecture impossible (gel). Tout rejeu de 7 bis est suivi de celui de
   7 ter. Puis
   `gh pr merge <N> --squash --delete-branch --match-head-commit <sha revu> --subject "<sujet exact>"` —
   merge et suppression de la branche distante en un geste, **lié au sha que la
   revue et le CI ont vu** : si la tête a bougé depuis, GitHub refuse, et les
   contrôles se rejouent sur la nouvelle tête.
4. Supprimer le worktree rattaché une fois la PR fermée (`ExitWorktree`, ou
   `git worktree remove`).
5. **Repartir de `main` pour le lot suivant**, jamais de la branche squashée :
   sinon la PR suivante ré-embarque le lot précédent, la fusion conflictue et
   GitHub ne crée aucun run.
6. **L'intégrateur avance la copie principale par `git merge --ff-only`**
   (`D-373` §2),
   après T1 si le lot touche les crochets. Une avance rapide ne réconcilie
   aucun historique divergent : elle ne relève pas de l'interdit de fusion
   automatique, et un refus de `--ff-only` s'arbitre.

`enforce_admins` reste actif et `verify` obligatoire (plus haut) : une PR gelée
bloque le merge au lieu de ressembler à un succès — ne jamais forcer. Sur une PR
de migration ou d'authentification, appliquer d'abord l'exception ci-dessous.

### L'exception : migration ou authentification

CodeRabbit revoit et l'assistant merge **aussi** ces PR. Mais avant le merge, sur
une PR qui porte une migration ou touche l'authentification — praticien
(`web/src/lib/auth.ts`, routes `api/auth`) ou portail patient
(`web/src/middleware.ts`, lien magique, cookie de session,
`patients.access_token`), et plus largement tout chemin touchant
session/token (périmètre repris tel quel par `/wn-merge`) :

1. **Une passe de revue adversariale indépendante** (sous-agent `wn-reviewer`).
   C'est elle qui a trouvé, le 2026-07-21 sur la PR #202, un backfill manquant
   dont l'absence défaisait silencieusement une révocation d'accès. Il n'y avait
   aucune ligne fautive à pointer : le défaut était ce que la migration **ne
   faisait pas**. Une revue de diff ne voit pas cette classe-là.
2. **Après le merge, vérifier la base de production** — la migration s'est-elle
   appliquée, et le backfill a-t-il fait ce qu'il annonçait ? La lecture se fait
   **par conteneur** : `scalingo --app wellneuro run -d "npx prisma migrate
   status"` (l'`execute_sql` MCP Supabase cité ici jusqu'au 2026-09-16 vise une
   base décommissionnée le 2026-09-01, `D-120` — détail :
   `.claude/rules/db-prisma.md`). Sans cela, un `migrate deploy` ou un import qui
   a échoué à mi-course lors de la release (`release-db`) ne se voit nulle part
   ailleurs. **Et le merge n'applique rien** : l'ordre complet — approbation
   humaine, sentinelle `WN_RELEASE_DB_OK`, constat par conteneur avant que le
   code consommateur parte — est dans
   `.claude/rules/pr-revue-et-release-db.md` §3.

Le coût de ces deux gestes se compte en minutes ; celui d'un raté sur
l'authentification ou une migration se compte en accès patients rompus.
