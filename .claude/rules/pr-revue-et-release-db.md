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

Décision qui le pose : `D-214` (2026-09-16). Gouvernance générale des PR
(régime de merge, codes de sortie de `wn-attendre-ci`, exception
migration/authentification) : `docs/claude/REGLES_PR_MERGE.md`. Procédure
complète de `release-db` : `docs/DEPLOIEMENT_RELEASE_DB.md`. Ce fichier ne les
remplace pas — il pose ce qui manquait aux deux, et ne réarbitre ni `D-087` ni
`D-120`.

## 1. Avant de merger — les commentaires de revue

**1.1 Les lire est un geste distinct du CI.** Un `verify` vert et un
`mergeStateStatus: CLEAN` ne disent rien des commentaires. Le bot de revue est
**CodeRabbit** depuis `D-290` (2026-10-14) ; il écrit à **trois endroits**, et
chacun se lit :

```bash
gh pr view <N> --json comments > synthese.json    # commentaire de synthèse (issues/<N>/comments)
gh pr view <N> --json reviews  > revues.json      # .reviews[].body : « Nitpick », « Outside diff range »
gh api --paginate --slurp repos/{owner}/{repo}/pulls/<N>/comments > en-ligne.json
# puis relire chaque fichier
```

Les commentaires **en ligne** — attachés à une ligne de diff — n'apparaissent
**pas** dans `reviews` ni dans `gh pr view --comments`. Les oublier est le cas
le plus fréquent, et le plus coûteux. Écrire la sortie dans un fichier puis la
relire : le `--jq` avec interpolation est refusé par l'isolation de worktree.

**Le CORPS de chaque revue se lit, pas seulement son état.** Un bot de revue
peut loger un constat dans le corps de sa revue plutôt qu'en ligne :
`pulls/<N>/comments` rend alors `[]`, et une lecture qui s'arrête au `state` de
la revue ne voit rien. Copilot le faisait dans un bloc « Suppressed comments »
— constaté sur la PR #1161 (2026-09-16), où le constat ainsi logé était réel,
trois rubriques manquantes au gabarit de handoff. CodeRabbit y range ses
remarques « Nitpick » et « Outside diff range ». **Lire `.reviews[].body`** :
lire l'état d'une revue n'est pas lire la revue.

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
- **Routé** — le défaut est réel mais hors périmètre du lot ; il part au plan
  unique `docs/claude/PLAN_WELLNEURO.md` (dette nommée du §8, ou fiche qui le
  porte), **avec son adresse**. Un « on verra » n'est pas un routage. Depuis
  `D-285` (2026-10-14), la file d'attente est supprimée et l'historique de
  `docs/ROADMAP_TECHNIQUE.md` est archivé : le plan est la seule adresse.

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

**1.5 Un bot qui commite sur la branche bloque le merge.** Quand
`copilot-swe-agent[bot]` a poussé — observé le 2026-09-14 et sur la PR #1115,
PR du dépôt et non d'un fork —, la tête a changé, `statusCheckRollup` est
devenu **vide**, et `gh pr merge` a refusé (« the base branch policy prohibits
the merge »). Le rollup vide est le symptôme, pas la cause — `gh api
repos/{owner}/{repo}/commits/<tête>/check-runs` montrait `verify | success` sur
le commit précédent. GitHub documente deux causes d'un run `pull_request` en
attente d'approbation — une PR créée ou mise à jour avec le `GITHUB_TOKEN`
d'un workflow, ou une PR issue d'un fork — : c'est le jeton qui pousse qui
compte, pas l'auteur affiché. **Avec CodeRabbit, non observé** : toute
génération qui commite est coupée par `.coderabbit.yaml` (`D-290`) ; si un
commit de bot gèle malgré tout le run, la réparation est la même.

- **Toujours recomparer** le `head=` du SNAPSHOT de `wn-attendre-ci` à la tête
  réelle de la PR : un vert peut porter sur un commit qui n'est plus la tête.
- **Réparer en poussant un commit réel** sous le compte du dépôt — jamais un
  commit vide, jamais en relançant le merge à l'aveugle, jamais en relançant le
  CI.

**1.6 Savoir quand le bot relit — et ne jamais le supposer.** Copilot revoyait
**une fois**, à l'ouverture : constaté sur la PR #1159 (2026-09-16), aucune
revue sur les deux pushs suivants, y compris celui qui répondait à ses quatre
constats, et le `POST` REST sur `requested_reviewers` ne l'enregistrait pas.
CodeRabbit est configuré à l'inverse — revue incrémentale **à chaque push**,
sans pause (`auto_incremental_review`, `auto_pause_after_reviewed_commits: 0`).
Ce qui fait foi n'est pas la configuration mais la revue constatée : **pas de
merge avant qu'une revue de `coderabbitai[bot]` porte sur le sha de tête** (le
`commit_id` de la revue, ou le sha que nomme le commentaire de synthèse). **Une
revue incrémentale sans remarque ne crée aucun objet revue** : constaté sur
#1440, la seule trace est la synthèse mise à jour — « No actionable comments »,
bloc « Recent review info » dont la plage de commits finit sur la tête, et
« Merge Risk … up to `<sha>` ». Lire `reviews` seul ferait conclure à tort que
la tête n'a pas été relue. Un
correctif poussé après la dernière revue n'est pas relu tant qu'une revue
neuve ne le dit pas.

**1.7 Ce qu'un bot a poussé se relit, toujours.** Il peut avoir aligné le
littéral d'un banc sur le code plutôt que l'inverse. Un banc ainsi « réparé » est
vert et **ne mesure plus rien**. **CodeRabbit ne commite jamais** : ni
« Commit suggestion », ni « Generate unit tests », ni case « Autofix » cochée
depuis l'interface — un correctif se vérifie contre le code (1.3) puis se pousse
comme un commit du lot. Si un commit de bot apparaît malgré tout, 1.5
s'applique.

**1.8 Clinique, signature de périmètre, migration : pas de correction dans la
foulée.** Un commentaire qui touche à l'un des trois remonte en **arbitrage**.
Corriger pour obtenir un vert ferait du vert la raison du changement.

**1.9 La clôture passe avant la PR** — et l'étape « Contrôle de clôture » du
CI refuse depuis E56 une PR de code qui ne crée pas de fragment de handoff
(l'entrée SESSION_LOG n'est plus exigée depuis `D-372`). Fragment `changelog.d/`, handoff, verdicts
de revue : ils s'écrivent sur la branche vivante. Ce qui s'écrit après le squash
coûte une seconde PR (`.claude/rules/docs-changelog.md`).

**1.10 CodeRabbit : ce qui lui est propre** (`D-290`, configuration
`.coderabbit.yaml`).

- **Son statut n'est pas sa revue.** Il publie sur le commit de tête un statut
  de commit nommé `CodeRabbit` (`pending` « Review in progress » pendant la
  revue) ; sur #1438 (2026-10-14), ce statut était `success` avec la
  description « Review skipped » — **aucune revue n'avait eu lieu**. Le statut
  dit qu'il a fini, pas qu'il a relu. Il n'est pas un check obligatoire de
  `main` (geste du responsable s'il le devient) ; la condition de merge reste
  1.6.
- **Il lit la configuration de la branche de la PR**, pas celle de `main` :
  constaté sur #1440, qui créait `.coderabbit.yaml` — synthèse en français,
  sans poème ni diagramme, sans contrôle de docstrings. Une PR qui modifie
  `.coderabbit.yaml` est donc revue sous sa propre configuration.
- **Une PR qui modifie `.coderabbit.yaml` est P1** (`D-291`) : passe
  `Agent(subagent_type: "wn-reviewer")` **avant le merge**, avec une mission
  nommée — la PR affaiblit-elle la revue ? Le relecteur compare la
  configuration de la branche à celle de `main` : `path_filters` qui réduisent
  le périmètre de revue (exclusions élargies ou inclusions restreintes),
  `auto_review` coupée ou restreinte, `path_instructions` ou lignes
  directrices retirées, outils de secrets coupés, générations qui commitent
  réactivées. Tout affaiblissement non demandé en conversation est un
  constat bloquant. La revue de CodeRabbit sur cette PR ne compte pas pour
  cette question : elle tourne sous la configuration qu'elle juge. La
  protection de `main` n'exige aucune approbation et le dépôt n'a pas de
  `CODEOWNERS` (lu le 2026-10-14) : ce garde-fou est une règle, pas un
  verrou.
- **La case « Autofix » de la synthèse reste affichée** (bloc « autopilot »)
  alors que `autofix`, `fix_ci` et `resolve_merge_conflict` sont coupés, et
  aucune clé du schéma ne la retire. **Ne jamais la cocher** : elle annonce
  des commits sur la branche (1.5). Le responsable la désactive dans
  l'interface CodeRabbit (arbitrage du 2026-10-14, `D-291`) ; sa disparition
  se constate sur la synthèse de la PR suivante. La règle reste en filet.
- **L'attente ne se sonde pas.** Pendant le CI (`wn-attendre-ci` en fond), la
  revue arrive d'ordinaire ; à la notification, lire les trois sorties (1.1)
  une fois. Revue absente sur la tête : la demander, pas boucler sur
  `gh pr checks` (refusé par les gardes).
- **Demander une revue** : elle part seule au push ; sinon
  `gh pr comment <N> --body "@coderabbitai review"` (incrémentale) ou
  `"@coderabbitai full review"` (tout le diff). Si une garde refuse ce
  commentaire, le signaler au lieu de la contourner.
- **Verdicts dans son fil.** Chaque remarque reçoit son verdict (1.2). Une
  remarque **en ligne** le reçoit **en réponse dans son fil** : CodeRabbit
  apprend de ces réponses (`knowledge_base.learnings`). Une remarque logée dans
  le **corps** d'une revue (« Nitpick », « Outside diff range ») ou dans la
  synthèse n'a pas de fil auquel répondre : son verdict va dans **un
  commentaire de PR distinct**, qui la cite et mentionne `@coderabbitai`. Les
  nitpicks sont triés, jamais appliqués d'office. Une remarque qui touche au
  clinique, à une migration ou à une signature de périmètre remonte en
  arbitrage (1.8), même formulée en suggestion prête à copier.
- **Il n'approuve pas, il ne merge pas.** `request_changes_workflow: false` :
  aucune approbation automatique, et son approbation n'est pas requise. Le
  merge reste à l'assistant (`docs/claude/REGLES_PR_MERGE.md`).
- **Le barème ne change pas.** CodeRabbit s'ajoute à `POLITIQUE_REVUE.md` sans
  remplacer aucune ligne : `/code-review medium` en P2, `wn-reviewer` en P1,
  Codex manuel obligatoire en P0.

## 2. Merger

| Règle | Le défaut qu'elle ferme |
|---|---|
| `--base main`, toujours | Une PR empilée sur une autre branche meurt au merge de sa base |
| `gh pr merge <N> --squash --delete-branch --match-head-commit <sha revu> --subject "<sujet>"` | Le sujet du squash vient du **commit**, pas du titre de la PR : trois `D-NNN` faux sur `main` (#943, #949, #950). Et sans `--match-head-commit`, un push arrivé après la revue part au merge sans revue — le statut `CodeRabbit` n'étant pas un check obligatoire, rien d'autre ne l'arrête (revue CodeRabbit de #1440) |
| `node scripts/wn-attendre-ci.mjs <N>`, un seul appel bloquant | `gh pr checks` en boucle ; et **jamais dans un tube** — un tube rend le code de `tail`, pas celui du script : un feu vert de merge fabriqué |
| Comparer le `head=` du SNAPSHOT à la tête réelle | Enchaîné à un push, le script peut juger la tête **précédente** et rendre `0` |
| Après un échec de `gh`, **constater l'état** | « main is already used by worktree » est trompeur : la PR est mergée quand même. Vérifier, jamais relancer |
| Panne GraphQL ⇒ équivalents REST | `gh pr create` / `merge` meurent, les routes REST passent |
| Le numéro `D-xxx` se prend **au merge** | Sept collisions en deux jours ; `scripts/lib/decisions-numerotation.mjs` refuse un numéro sauté, et un sujet de commit qui annonce un `D-xxx` sans l'écrire ne le réserve pas |
| Le verdict d'une tâche de fond se lit **dans le fichier** | La notification rapporte le code de la dernière commande, pas celui qui compte |
| Lancée en fond, une attente **se laisse notifier** : ni `TaskOutput` bloquant, ni `sleep` + `tail`, ni `gh run`/`gh pr checks` entre-temps | Chaque sondage relit tout le contexte de la session : environ 1 370 appels de ce type en septembre 2026. Depuis le 2026-10-24, `block-risky-commands` ne refuse plus les formes en boucle (autorisation du responsable) : la notification reste préférée, la boucle bornée est permise |
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
| 7 | Le code consommateur part — et seulement là | Même lot, seconde PR (`D-266` §11) |

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

## 5. `release-db` — les six pièges

1. **Un run `queued` sans un seul job** n'est pas un run lent — 45 min à
   `jobs: []` observées. Rouvrir la PR ; ne pas chercher dans le diff.
2. **Un merge de code seul pendant l'attente d'approbation ne tue pas le run**
   (réécrit le 2026-10-27, `D-374` §2-§4, fiche H88). Le job déploie une
   *branche*, pas un SHA : à l'approbation, si la tête de `main` a dépassé le
   commit approuvé **sans migration ni changement clinique nouveau**, il
   déploie la tête — l'ensemble à écrire est celui approuvé —, applique, puis
   finit en **rouge volontaire** (garde anti-recul, piège 6), qui se lit
   « appliquée », jamais « à relancer ». Si la tête apporte une migration ou
   un changement clinique nouveau (`web/prisma/migrations/**`,
   `web/src/lib/clinical/**`), le déclenchement ne déploie rien — en
   `workflow_dispatch` il refuse ; en `push` l'étape se dit obsolète, mais le
   job continue (dette au plan §8) — et c'est le run de la tête qui
   s'approuve ; l'ancien se rejette (`D-374` §3). Le refus du 2026-09-06 (un
   handoff mergé pendant l'attente) n'a plus lieu depuis ce même jour ; ce qui
   reste gelé se lit par phases, **avant chaque merge** :
   `node scripts/wn-sonde-release-db.mjs <N>` — `0` seul autorise. Attente
   d'approbation (`waiting`, phase 1) : gelés, les seuls merges qui touchent
   une migration, un chemin clinique, `release-db.yml` et ce que son run
   exécute, ou le déployeur. Tout autre état non conclu — exécution (phase 2),
   ou démarrage avant la porte — : aucun merge jusqu'à la conclusion du run.
   Lecture impossible : gel. Un run coincé ne se contourne pas : sa sortie est
   le rejet par le responsable (`D-374` §5).
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
6. **Le vert d'un run sur un commit DÉPASSÉ fait reculer la production.**
   Scalingo auto-déploie un commit quand TOUS ses checks sont verts, et
   `release-db` en est un : le 2026-09-23, le run d'un commit vieux de deux
   jours a déployé la tête, conclu vert — et Scalingo a redéployé le vieux
   commit une minute après (quatre lots perdus, six heures). Depuis, la
   **garde anti-recul** fait finir un tel run en échec **volontaire** : la
   release, elle, a eu lieu — lire « NE PAS RELANCER » avant tout geste.
   Après chaque release, la PREMIÈRE ligne de `scalingo --app wellneuro
   deployments` — la liste va du plus récent au plus ancien — doit être la
   tête de `main`. Un recul se rattrape par
   `integration-link-manual-deploy main`, jamais en ré-approuvant l'ancien run.

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
