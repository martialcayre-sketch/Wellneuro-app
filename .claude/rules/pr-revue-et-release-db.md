---
paths:
  - ".github/**"
  - "web/prisma/**"
---

# Revue de PR et écriture en base

Ce fichier ferme deux trous qui ne se voient pas au vert : **un commentaire de
revue n'est pas un check**, et **une migration mergée n'est pas une migration
appliquée**. Les deux se paient après coup — quand la branche est squashée, ou
quand la base est en retard sur le code.

Gouvernance générale des PR (régime de merge, codes de sortie de
`wn-attendre-ci`, exception migration/authentification) :
`docs/claude/REGLES_PR_MERGE.md`. Procédure complète de `release-db` :
`docs/DEPLOIEMENT_RELEASE_DB.md`. Ce fichier ne les remplace pas ; il pose ce
qui manquait aux deux.

## 1. Avant de merger — les commentaires de revue

**1.1 Les lire est un geste distinct du CI.** Un `verify` vert et un
`mergeStateStatus: CLEAN` ne disent rien des commentaires. Deux lectures, pas
une :

```bash
gh pr view <N> --json reviews,comments
gh api --paginate --slurp repos/{owner}/{repo}/pulls/<N>/comments > revue.json   # puis relire le fichier
```

Les commentaires **en ligne** — attachés à une ligne de diff — n'apparaissent
**pas** dans `reviews` ni dans `gh pr view --comments`. Les oublier est le cas
le plus fréquent, et le plus coûteux. Écrire la sortie dans un fichier puis la
relire : le `--jq` avec interpolation est refusé par l'isolation de worktree.

**`--paginate` n'est pas un ornement.** L'endpoint rend **30 éléments par
page** : sans lui, une PR qui porte plus de 30 commentaires en ligne en laisse
silencieusement dehors — et la règle rendant le verdict de *chacun* bloquant,
la troncature ferait annoncer une couverture complète sur une liste partielle,
exactement la classe de défaut que ce fichier existe pour fermer. `--slurp` rend
un tableau **de pages** (`[[…],[…]]`) : l'aplatir à la lecture.

**1.2 Trois verdicts, et aucun commentaire n'en sort sans.** Chacun est tranché
**par écrit dans la PR** :

- **Corrigé** — le défaut est réel ; la réponse nomme le commit qui le répare.
- **Écarté avec motif** — le commentaire se trompe, et la réponse dit *pourquoi*,
  sur pièces : ligne de code, banc, décision `D-xxx`. « Non pertinent » seul
  n'est pas un motif.
- **Routé** — le défaut est réel mais hors périmètre du lot ; il part en entrée
  de `docs/claude/campagnes/FILE_ATTENTE.md` ou en dette nommée de
  `docs/ROADMAP_TECHNIQUE.md`, **avec son adresse**. Un « on verra » n'est pas
  un routage.

Un commentaire sans verdict au merge disparaît du champ de vision : le squash
efface la branche, et personne ne relit une PR fermée.

**Pourquoi c'est une règle et pas une bonne pratique.** Le 2026-09-16, quatre PR
de la campagne Correspondance ont été mergées sur CI vert sans lire la revue.
Copilot y avait laissé six constats, dont **quatre réels** : un `length === 0` là
où la validation fait `trim()` (un espace seul coince le praticien), un `count`
borné remplacé par un `findMany` sur tout l'historique sur un chemin monté deux
fois par page, un banc dont le mock rend déjà la liste dédupliquée — donc qui
n'exerce jamais le `distinct` qu'il prétend couvrir —, et un contrat de
commentaire périmé. **Un CI vert ne voit aucun des quatre.**

**1.3 Vérifier la réfutation avant d'écarter.** Une contre-revue se trompe
surtout **en rétrécissant** : elle lit un cas et conclut sur tous. La question
qui décide du rendement : *quelle mutation ferait rougir cette assertion ?* Si
aucune, le commentaire a probablement raison même s'il vise mal. Symétriquement,
un constat peut partir d'une prémisse fausse tout en désignant un vrai trou — et
un autre **introduirait** un défaut s'il était repris tel quel (trimer un
compteur de caractères là où `maxLength` tronque sur la longueur brute). Ne
jamais reprendre un constat sans l'avoir vérifié contre le code.

**1.4 La revue vise aussi les affirmations, pas seulement le code.** Deux des six
constats du 2026-09-16 portaient sur une **couverture annoncée que le banc ne
donnait pas** et sur une **portée de correctif surestimée** dans un sujet de
commit (« cesse de lire tout l'historique », faux sans index : il cesse de le
*charger*). Aucun test ne rattrape cette classe-là.

**1.5 Copilot pousse sur la branche, et ça bloque le merge.** Quand
`copilot-swe-agent[bot]` commite (observé le 2026-09-14 et sur la PR #1115) : la
tête change, `statusCheckRollup` devient **vide**, `gh pr merge` refuse (« the
base branch policy prohibits the merge »). Le rollup vide est le symptôme, pas
la cause — `gh api repos/{owner}/{repo}/commits/<tête>/check-runs` montre
`verify | success` sur le commit précédent.

- **Toujours recomparer** le `head=` du SNAPSHOT de `wn-attendre-ci` à la tête
  réelle de la PR : un vert peut porter sur un commit qui n'est plus la tête.
- **Réparer en poussant un commit réel** sous le compte du dépôt — jamais un
  commit vide, jamais en relançant le merge à l'aveugle, jamais en relançant le
  CI.

**1.6 Copilot revoit UNE FOIS, à l'ouverture — il ne relit pas vos correctifs.**
Constaté sur la PR #1159 (2026-09-16) : revue automatique sur le premier push,
**aucune** sur les deux suivants, y compris celui qui répondait à ses quatre
constats. Sa propre conclusion le dit (« Get a fresh assessment by requesting
another Copilot review »), et le `POST` REST sur `requested_reviewers` **ne
l'enregistre pas** — la demande passe par le bouton de l'interface, donc par le
responsable. Ne jamais compter sur un second passage pour rattraper un correctif
écrit à la hâte : le premier verdict est le seul garanti. (Ce qui reçoit bien une
revue neuve, c'est une **nouvelle PR** — d'où la revue de la PR de reprise du
2026-09-16.)

**1.7 Ce que Copilot a poussé se relit, toujours.** Il peut avoir aligné le
littéral d'un banc sur le code plutôt que l'inverse. Un banc ainsi « réparé » est
vert et **ne mesure plus rien**.

**1.8 Clinique, signature de périmètre, migration : pas de correction dans la
foulée.** Un commentaire qui touche à l'un des trois remonte en **arbitrage**.
Corriger pour obtenir un vert ferait du vert la raison du changement.

**1.9 La clôture passe avant la PR.** Fragment `changelog.d/`, handoff, verdicts
de revue : ils s'écrivent sur la branche vivante. Ce qui s'écrit après le squash
coûte une seconde PR (`.claude/rules/docs-changelog.md`).

## 2. Merger

| Règle | Le défaut qu'elle ferme |
|---|---|
| `--base main`, toujours | Une PR empilée sur une autre branche meurt au merge de sa base |
| `gh pr merge <N> --squash --delete-branch --subject "<sujet>"` | Le sujet du squash vient du **commit**, pas du titre de la PR : trois `D-NNN` faux sur `main` (#943, #949, #950) |
| `node scripts/wn-attendre-ci.mjs <N>`, un seul appel bloquant | `gh pr checks` en boucle ; et **jamais dans un tube** — un tube rend le code de `tail`, pas celui du script : un feu vert de merge fabriqué |
| Comparer le `head=` du SNAPSHOT à la tête réelle | Enchaîné à un push, le script peut juger la tête **précédente** et rendre `0` |
| Après un échec de `gh`, **constater l'état** | « main is already used by worktree » est trompeur : la PR est mergée quand même. Vérifier, jamais relancer |
| Panne GraphQL ⇒ équivalents REST | `gh pr create` / `merge` meurent, les routes REST passent |
| Le numéro `D-xxx` se prend **au merge** | Sept collisions en deux jours ; `scripts/lib/decisions-numerotation.mjs` refuse un numéro sauté, et un sujet de commit qui annonce un `D-xxx` sans l'écrire ne le réserve pas |
| Le verdict d'une tâche de fond se lit **dans le fichier** | La notification rapporte le code de la dernière commande, pas celui qui compte |
| Un run `queued` sans un seul job n'est pas un run lent | 45 min à `jobs: []` sur la PR #1074 ; remède : `gh pr close <N> && gh pr reopen <N>`, pas une recherche dans le diff |

## 3. `release-db` — l'ordre

Chaque étape a un état **à constater**, jamais à supposer.

| # | Étape | Ce qui la clôt |
|---|---|---|
| 1 | PR de migration **seule**, relue, CI vert sur la bonne tête | `wn-attendre-ci <N>` → exit `0`, et `head=` du SNAPSHOT identique à la tête réelle |
| 2 | **Choisir le créneau** | Geste du responsable : la fenêtre de panne s'ouvre sciemment |
| 3 | Merger | Le push sur `main` touchant `web/prisma/migrations/**` propose automatiquement le run |
| 4 | Scalingo déploie le **code seul** | Le `postdeploy` ne migre plus sous `WN_MIGRATIONS_PAR_RELEASE_DB=1` |
| 5 | **Approuver** — humain, dans l'environnement protégé | Sentinelle `WN_RELEASE_DB_OK id=<run>` dans les logs du one-off — **liée à CE run** : un `OK` nu laissé par un run antérieur ne prouve rien |
| 6 | Constater **par conteneur** | `scalingo --app wellneuro run -d "npx prisma migrate status"` → *up to date* |
| 7 | Le code consommateur part — et seulement là | Lot suivant |

**« Migration seule » emporte le schéma, pas seulement le SQL** : `migration.sql`
+ le bloc `schema.prisma` + le contrat SQL négatif + sa ligne de CI + le fragment
changelog. T3 refuse la dérive entre les deux (`prisma migrate diff`, attendu
*No difference detected*). Ce qui reste dehors est le **code consommateur**
(`D-087`).

## 4. `release-db` — le timing

Entre 3 et 5, **l'application est en panne** sur tout ce que la migration touche :
Prisma sélectionne explicitement toutes les colonnes scalaires d'un modèle, donc
un `ADD COLUMN` déclaré au schéma et absent de la base fait échouer *chaque*
requête sur cette table.

- **Approuver dans la foulée du merge.** Ne jamais merger une migration pour « y
  revenir plus tard ».
- **Heure creuse, choisie** — la fenêtre dure le déploiement plus l'approbation.
- Le second gate est un **temps d'arrêt, pas un second regard** :
  `prevent_self_review` est désactivé (avec un seul relecteur, l'activer rendrait
  toute release impossible). Le `wait_timer` (5 min) et la liste des relecteurs
  **se lisent**, ils ne se rappellent pas de mémoire :

```bash
gh api repos/{owner}/{repo}/environments/release-db --jq '.protection_rules'
gh api repos/{owner}/{repo}/actions/runs/<ID>/approvals --jq '.[] | {state, user: .user.login}'
```

Pendant le minuteur, le `POST` d'approbation échoue en **422** (« No pending
deployment requests to approve or reject »). **Ce message a déjà été mal lu deux
fois, de deux façons opposées** : comme une permission manquante (2026-09-11),
puis comme l'absence de toute porte de relecture (2026-09-12 — conclusion écrite
dans cinq documents avant que les règles ne soient lues). Le journal des
approbations est la seule preuve de qui a ouvert la porte.

## 5. `release-db` — les cinq pièges

1. **Un run `queued` sans un seul job** n'est pas un run lent — 45 min à
   `jobs: []` observées. Rouvrir la PR ; ne pas chercher dans le diff.
2. **Toute écriture sur `main` pendant l'attente d'approbation tue le run.** Le
   job déploie une *branche*, pas un SHA : il refuse si la tête de `main` n'est
   plus le commit approuvé — y compris pour un handoff (constaté le 2026-09-06).
   **Aucune écriture en base n'a eu lieu.** Comparer
   `git diff --name-only <sha-approuvé>..origin/main` — une AUTRE migration
   changerait ce qui serait appliqué —, puis relancer en `workflow_dispatch` et
   approuver sans attendre. Ne rien improviser.
3. **Annuler le job GitHub n'arrête pas le one-off** (`--detached`) : la migration
   continue pendant que le workflow s'affiche annulé. Seul
   `scalingo one-off-stop <conteneur>` l'arrête.
4. **Aucune sentinelle après le délai ⇒ état INCONNU**, jamais « échec ». On lit
   l'état de la base au conteneur ; on ne relance pas à l'aveugle. La sentinelle
   se cherche **avec l'identifiant du run** (`WN_RELEASE_DB_OK id=…`) : le
   protocole de sortie est lié au run précisément pour qu'un `OK` laissé par un
   run antérieur ne se lise pas comme celui qu'on attend.
5. **Un run rouge après déploiement laisse code neuf + schéma ancien.** Le filet
   « postdeploy en échec = déploiement annulé » n'existe plus sous le drapeau. La
   sortie — correctif en avant, ou rollback de slug — est un **arbitrage du
   responsable**. Et un rollback vers un slug antérieur au **2026-08-22**
   ré-active l'auto-migration : l'ancien `db-deploy.sh` ignore le drapeau.

L'approbation (`POST …/pending_deployments`) et le déclenchement
(`gh workflow run release-db.yml`) sont refusés par le classifieur de permissions :
**ces deux gestes reviennent à l'humain.**

## 6. Constater, et comment

- **Mise en ligne par contenance, jamais par égalité de SHA** — Scalingo déploie
  le HEAD, pas chaque commit : `git merge-base --is-ancestor <sha> <déployé>`.
- **One-off détaché obligatoire**, commande aplatie sur une ligne, apostrophes
  simples, pas de heredoc — le CLI aplatit `argv` sans re-quoter, et l'app est
  `wellneuro`.
- **Agréger par nom de migration** : un échec suivi d'un `migrate resolve
  --applied` laisse deux lignes dans `_prisma_migrations`. Lire une ligne isolée
  fait conclure à tort qu'une migration manque (requête :
  `.claude/rules/db-prisma.md`).

## 7. Ce que ces règles ne couvrent pas

Elles ne disent **pas** si une migration doit être écrite — cela reste une demande
explicite en conversation (`CLAUDE.md`, règles non négociables). Elles ne
remplacent **pas** la revue : un CI vert et des commentaires traités ne valent pas
relecture du contenu clinique. Et elles ne protègent **pas** des baselines
visuelles, qui vivent sur un autre chemin — régénération par `visual-baselines`
sur Linux, relecture image par image, jamais un desserrage de seuil.
