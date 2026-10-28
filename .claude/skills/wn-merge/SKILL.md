---
description: Termine le cycle d'une PR WellNeuro déjà ouverte par /wn-pr — lit le CI, joue les sondes et le contrôle sur l'arbre fusionné, déduit le régime de merge courant depuis CLAUDE.md, applique l'exception migration/auth si besoin, merge et nettoie. Sans `apply`, n'exécute rien.
argument-hint: "[numéro de PR] [apply]"
disable-model-invocation: true
effort: medium
---

# WellNeuro — clôture de PR

## Contexte

!`cat ${CLAUDE_PROJECT_DIR}/docs/claude/REGLES_PR_MERGE.md`
!`cat ${CLAUDE_PROJECT_DIR}/.claude/rules/pr-revue-et-release-db.md`
!`git worktree list 2>/dev/null || true`

Arguments : `$ARGUMENTS`

## Mission

Reprend le cycle là où `/wn-pr` s'arrête : une PR déjà ouverte, dont il faut lire <!-- mention-seule: wn-pr -->
le CI, décider si elle se merge, et nettoyer derrière. Le régime qui autorise
(ou non) le merge côté assistant n'est jamais supposé : il se lit à chaque
invocation dans le texte de gouvernance chargé ci-dessus
(`docs/claude/REGLES_PR_MERGE.md`), pas dans ce fichier — l'autorisation
transitoire est bornée dans le temps et peut avoir été retirée depuis la
dernière session.

1. **Identifier la PR.** Numéro en argument, sinon déduit de la branche
   courante. Aucune PR trouvée → s'arrêter et le dire.
2. **Attendre et lire le CI** — `node scripts/wn-attendre-ci.mjs <N>`, un seul
   appel en tâche de fond ; jamais de `gh pr checks` répété en boucle. Sa
   dernière ligne `SNAPSHOT PR#…` (état, mergeable, base, SHA de tête) est la
   vue à jour de l'état PR — c'est elle qui remplace le `gh pr view` que le
   préambule de ce skill faisait en doublon : ne pas en refaire un derrière.
3. **Le code de sortie décide, et `0` seul autorise la suite.** Le script
   vérifie que les checks obligatoires ont *réellement tourné*, pas seulement
   que rien n'est en attente — c'est ce que l'idiome remplacé ne savait pas
   faire. **`2` = `verify` n'a pas tourné** : le script nomme toutes les causes
   applicables (PR en conflit, branche squashée, commit de tête d'un bot gelant
   le run en `action_required`). **`5` = les checks sont verts mais la PR est en
   conflit** — le vert porte alors sur un commit qui n'est pas le résultat
   fusionné ; fusionner la base et relancer. **`4` = indéterminé**, y compris
   quand la liste des checks obligatoires n'a pas pu être lue. Aucun de ces
   codes ne se débloque en forçant le merge ; le cas du commit de bot se
   débloque en poussant un commit sous le compte du dépôt. **Le statut
   `CodeRabbit` n'est pas une revue** : il passe à `success` même quand la
   revue est sautée — la revue se lit à l'étape 6.
4. **Déduire le régime courant** du texte chargé ci-dessus :
   - la section « Cycle PR complet côté assistant » y est toujours présente et
     décrit une délégation active (`D-290` : CodeRabbit revoit, l'assistant
     merge) → cycle complet possible (étapes 8-9) ;
   - elle a été retirée ou remplacée → s'arrêter après l'étape 3, annoncer
     l'état du CI, laisser le merge au responsable.
5. **Exception migration ou authentification** — si le diff touche
   `prisma/schema.prisma`, `prisma/migrations/`, `supabase/migrations/`, ou
   l'authentification — praticien (`web/src/lib/auth.ts`, routes `api/auth`)
   **ou** portail patient (`web/src/middleware.ts`, lien magique, cookie de
   session, `patients.access_token`), ou plus largement tout chemin touchant
   session/token : deux passes, **et une seule conditionne le merge**.

   - **Avant le merge, bloquant** : une revue adversariale indépendante —
     `Agent(subagent_type: "wn-reviewer")`, agent épinglé Opus/high —
     obligatoire si elle n'a pas déjà eu lieu. C'est *elle seule* que l'étape 9
     exige.
   - **Après le merge, dû** : vérifier la base de production **par conteneur** —
     `scalingo --app wellneuro run -d "npx prisma migrate status"`, sortie relue
     par `scalingo logs --filter one-off-N`. (L'`execute_sql` MCP Supabase que
     ce skill nommait jusqu'au 2026-09-16 vise une base **décommissionnée** le
     2026-09-01, `D-120`.) Sur une migration, ce constat ne peut pas aboutir
     avant que `release-db` ait été approuvée et la sentinelle
     `WN_RELEASE_DB_OK id=<run>` constatée — **merger n'applique pas** : c'est
     une obligation de suite, jamais une condition de merge, sinon aucune PR de
     migration ne pourrait être mergée. Ordre complet :
     `.claude/rules/pr-revue-et-release-db.md` §3.

   Les deux s'appliquent même quand l'assistant merge ; ne jamais les sauter sur
   ce périmètre.
6. **Lire les commentaires de revue — geste distinct du CI, et bloquant.** Un
   `verify` vert ne dit rien d'eux. **Pas de merge avant qu'une revue de
   `coderabbitai[bot]` porte sur le sha de tête** (`commit_id` de la revue, ou
   commentaire de synthèse qui le nomme). **Si CodeRabbit a sauté la PR**
   (statut `skipping`) **ou bute sur son quota** (« Review rate limited »),
   la revue de **PR-Agent** sur la tête le remplace (`D-393` §1). Elle ne
   vaut que si les quatre conditions de `D-393` §2 tiennent, lues dans des
   fichiers (commandes : `.claude/rules/pr-revue-et-release-db.md` §1.6) :
   un run `pull_request` de `pr_agent.yml` conclu `success` sur la tête ;
   un journal qui dit « returning full diff », jamais « pruning diff » ;
   le commentaire persistant de `github-actions[bot]` écrit pendant ce run,
   avec un bloc d'état unique (`head_sha` = tête, `excluded_files` vide),
   ou sans bloc ; aucun autre commentaire de PR-Agent pendant ce run, ni
   commande PR-Agent postée sur la PR après son début. Un run sur commentaire ou une
   revue `-i` ne compte pas. Si aucun bot ne remplit sa condition, ne pas merger. Les remarques
   de PR-Agent (corps du commentaire, et `findings` du bloc) reçoivent leur
   verdict dans un commentaire de PR distinct. CodeRabbit écrit à **trois** endroits,
   chacun redirigé vers un fichier puis relu : le commentaire de synthèse
   (`gh pr view <N> --json comments`), le **corps** de chaque revue —
   `.reviews[].body`, où logent « Nitpick » et « Outside diff range » —
   (`gh pr view <N> --json reviews`), **et** `gh api --paginate --slurp
   repos/{owner}/{repo}/pulls/<N>/comments` —
   les commentaires **en ligne** n'apparaissent dans aucune des deux autres vues.
   **La pagination n'est pas optionnelle** : l'endpoint rend 30 éléments par
   défaut, et une page manquée ferait annoncer « chaque commentaire a son
   verdict » sur une liste tronquée. `--slurp` rend un tableau **de pages** :
   l'aplatir à la lecture. Chaque commentaire reçoit un
   verdict écrit dans la PR — en réponse dans son fil pour une remarque en
   ligne (CodeRabbit apprend de ces réponses) ; dans un commentaire de PR
   distinct, qui la cite, pour une remarque du corps (« Nitpick », « Outside
   diff range ») ou de la synthèse, qui n'ont pas de fil. Les nitpicks sont
   triés, jamais appliqués d'office :
   **corrigé** (le commit qui le répare est nommé),
   **écarté avec motif** (sur pièces — ligne, banc, `D-xxx` ; « non pertinent »
   seul n'en est pas un), ou **routé** (vers le plan unique
   `docs/claude/PLAN_WELLNEURO.md`, dette nommée du §8 ou fiche, avec son
   adresse ; `D-285` ; vers une fiche, une mise à jour datée s'écrit en
   fragment de `docs/claude/plan-journal/<id>/`, `D-371`). Aucun commentaire sans verdict ne passe le merge : le squash
   efface la branche. Un constat touchant au clinique, à une signature de
   périmètre ou à une migration **remonte en arbitrage**, il ne se corrige pas
   dans la foulée. Détail et précédents :
   `.claude/rules/pr-revue-et-release-db.md`.
7. **Clôture opposable — se lit dans les `files` de la PR, pas en local.** Le
   snapshot de l'étape 2 ne porte pas les `files` : les lire en un seul
   `gh api --paginate --slurp repos/{owner}/{repo}/pulls/<N>/files` au moment
   de ce contrôle, sortie écrite dans le scratchpad de la session — jamais dans
   le worktree —, puis relue en aplatissant les pages (`gh pr view --json
   files` peut s'arrêter à 100 fichiers). La
   PR doit porter un fragment `docs/claude/handoffs/AAAA-MM-JJ-HHMM-slug.md`
   **créé** par elle — `status` `added`, ou `renamed` depuis un fichier qui
   n'était pas déjà un handoff (`previous_filename`) ; un handoff passé
   `modified` ou rebaptisé ne compte pas, le `README.md` du dossier non plus ;
   l'entrée `SESSION_LOG.md` n'est plus exigée depuis D-372. Il manque → **ne pas merger, même CI vert** :
   demander `/wn-finish` puis `/wn-handoff write`, poussés sur la branche de la <!-- mention-seule: wn-finish, wn-handoff -->
   PR tant qu'elle est ouverte. Il n'y a pas de dérogation à accorder : la PR de
   doc qui répare une fenêtre déjà ratée (verdict de cycle en sortie `1`) porte
   précisément cette clôture, donc elle passe le contrôle par construction — et
   c'est la seule forme acceptée de PR de rattrapage. Depuis E56 (2026-10-18),
   l'étape « Contrôle de clôture » du CI refuse la même absence sur toute PR
   qui touche du code — un fragment CRÉÉ par la PR, pas un handoff passé
   retouché ; ce contrôle-ci reste, et couvre aussi les PR de doc.
7 bis. **Déploiement, registre, arbre fusionné, chevauchement — avant chaque
   merge** (`D-373` §2, §4 et §7). Quatre gestes, dans cet ordre, chaque code
   lu directement — jamais dans un tube.
   - **Sonde du déploiement** : `node scripts/wn-deploiement-observation.mjs`
     (lecture seule : `scalingo deployments` et l'ascendance d'`origin/main`).
     **`1`** = recul de production, **`2`** = production illisible (aucun recul
     ne peut être exclu) : pas de merge, arrêt et question au responsable — le
     redéploiement est son geste. **`0`** : la tête est en service, ou son
     déploiement est en cours, ou en retard (avertissement, rapporté) ; une PR
     ordinaire merge sans attendre le déploiement (`D-373` §1). Une seule
     retenue : une migration de `main` pas encore en service —
     `git diff --name-only <en service> origin/main -- web/prisma/migrations`
     non vide, `<en service>` lu sur la ligne « En service » de la sonde.
     Lire alors d'abord la sonde de l'étape 7 ter (elle se rejoue de toute
     façon juste avant le merge) : si un run `release-db` attend
     l'approbation (phase 1) sur un commit qui contient la migration
     (`git merge-base --is-ancestor <commit de la migration> <commit du run>`),
     ce n'est pas une retenue — le déployeur retient la tête et les PR non
     gelées mergent (`D-374`, « Effet sur le plan ») ; l'exception ne vaut
     que tant que ce run attend : si la sonde de l'étape 7 ter ne le montre
     plus en attente, rejouer 7 bis (la migration, toujours hors service,
     retient alors). Sinon (appliquée et
     pas encore déployée, run rejeté, état inconnu) : **pas de merge, arrêt et
     question au responsable**, avec l'état lu (« un merge à la fois »,
     `D-373` §1). La retenue ne vise que les migrations : un commit clinique
     ou de la table signée en attente de déploiement ne retient rien ici, sa
     phase 2 est gelée par la sonde release-db.
   - **Contrôle sur l'arbre fusionné** : `node scripts/wn-controle-fusion.mjs <N>`
     (`--source <copie principale>` hors de la copie principale : il emprunte
     `node_modules` et le client Prisma de la source). Il juge la tête que
     GitHub porte à cet instant et la tête d'`origin/main`, qu'il nomme sur sa
     dernière ligne `CONTROLE fusion code=… main=<8> tete=<8>`. **`0`** = sain,
     ou contrôle non requis (`main` n'a pas bougé depuis la base de la PR) :
     seul il autorise la suite. **`1`** = défaut (conflit, garde rouge
     imputable à la PR) : pas de merge, la PR revient à sa file (`D-373` §3 :
     l'intégrateur ne corrige pas une PR). **`2`** = indéterminé — empreinte
     d'environnement qui ne concorde pas (schéma, dépendance), rouge instable,
     lecture impossible : **pas de merge, arrêt et question au responsable**
     avec le motif rendu ; jamais lu comme un sain. **`3`** = usage. La tête
     jugée doit être celle de la revue : `tete=` est le préfixe du `head=` du
     SNAPSHOT de l'étape 2 et du sha lu à l'étape 6, sinon les étapes 2, 6 et
     ce contrôle se rejouent sur la nouvelle tête.
   - **Relecture de la tête de `docs/DECISIONS.md`** : les décisions entrées
     dans `main` depuis la base de la PR — `git merge-base <sha> origin/main`,
     puis `git diff <base> origin/main -- docs/DECISIONS.md`, lu en entier :
     les titres `+### D-` nouveaux, et tout changement dans le texte d'une
     décision existante (statut, gel levé, repli consigné). Une décision qui
     amende le régime du merge (`D-290`, `D-373`, `D-374`, ce skill,
     `REGLES_PR_MERGE.md`) ou le domaine de la PR : arrêt et question. La
     numérotation de l'arbre fusionné, elle, est jugée par le contrôle.
   - **Signal de chevauchement** : `node scripts/wn-chevauchement.mjs <N>`.
     Affiché dans la sortie, **jamais bloquant** — il sort en `0` quoi qu'il
     trouve ; seul le contrôle refuse.
   - **`main` n'a pas bougé** : la tête de `main` que la sonde du
     déploiement a lue (ligne « Tête ») et
     `git ls-remote origin refs/heads/main` doivent commencer par le `main=`
     du contrôle. Sinon, **rejouer toute l'étape
     7 bis**, déploiement compris — ce qui a fait bouger `main` peut être une
     migration —, jamais passer au merge directement. Reste une course entre
     cette lecture et `gh pr merge` : `--match-head-commit` lie la tête, pas
     la base ; elle est assumée.
7 ter. **Sonde release-db — juste avant le merge, et bloquante** (`D-374` §2 à
   §4) : `node scripts/wn-sonde-release-db.mjs <N>`, un appel, code lu
   directement — jamais dans un tube. Elle lit tous les runs non conclus de
   `release-db.yml` (filtre par statut, toutes pages) et rend **`0` seul pour
   autoriser le merge** : aucun run non conclu, ou runs tous en attente
   d'approbation (`waiting`, phase 1) et la PR ne touche ni
   `web/prisma/migrations/**`, ni `web/src/lib/clinical/**`, ni
   `release-db.yml` et ce que son run exécute, ni le déployeur (liste :
   `CHEMINS_GELES` du script). **`1`** = gelé — un run hors de l'attente
   (exécution, phase 2, ou démarrage avant la porte : aucun merge), ou PR qui
   touche un chemin gelé ; **`2`** = lecture impossible, gel par prudence. Un run coincé ne se contourne pas : sa sortie est le rejet du
   run par le responsable (`D-374` §5). Les lignes `·` disent, pour un ancien
   run en attente, s'il s'approuve tel quel ou se rejette (`D-374` §3) :
   conseil au responsable, jamais un geste de l'assistant. Une session sans
   `/wn-*` lance la même commande avant son `gh pr merge`. <!-- mention-seule: wn -->
8. **Sans `apply`** : ne rien exécuter. Rendre le numéro de PR, l'état CI,
   présence de `verify`, régime déduit, applicabilité de l'exception, verdicts de
   revue (étape 6), verdict de clôture (étape 7) — puis la commande exacte à
   lancer.
9. **Avec `apply`**, et seulement si l'étape 4 autorise le cycle complet, si
   la passe **avant le merge** de l'étape 5 est faite quand elle s'applique (la
   vérification de production, elle, est due **après** et ne conditionne rien),
   si tout commentaire de revue
   porte son verdict (étape 6), si l'étape 7 est satisfaite, si les gestes
   de l'étape 7 bis le permettent (déploiement `0` sans retenue, contrôle
   `0`, aucune décision à arbitrer, `main` inchangé) et si la sonde de
   l'étape 7 ter vient de
   rendre `0` :
   ```bash
   gh pr merge <N> --squash --delete-branch --match-head-commit <sha>
   ```
   où `<sha>` est le `head=` du SNAPSHOT de l'étape 2, celui que la revue de
   l'étape 6 a lu et dont le `tete=` du contrôle est le préfixe : si la tête
   a bougé depuis, GitHub refuse le merge, et les étapes 2, 6, 7 bis et
   7 ter se rejouent sur la nouvelle tête. Tout rejeu de 7 bis est suivi de
   celui de 7 ter : la sonde release-db reste le dernier geste avant le
   merge. Puis nettoyer le worktree rattaché (`ExitWorktree` avec `action: "remove"`,
   ou `git worktree remove`), et repartir de `main` — jamais de la branche
   squashée — pour le lot suivant. **Le merge vient de faire avancer
   `origin/main`** : tant que le worktree reste sur la branche squashée, le
   garde de fraîcheur refuse toute édition, et c'est le comportement voulu. Le
   lever ne demande **pas** de reprise de session — `git fetch origin main`
   puis une branche qui contient `origin/main` suffisent, le garde rejuge à la
   tentative suivante.

Ne jamais forcer un merge sur une PR gelée (`enforce_admins` actif, `verify`
obligatoire) : une PR gelée bloque, elle ne ressemble pas à un succès à
contourner.

## Sortie

1. Numéro de PR et état CI (checks passés, `verify` présent ou non).
2. Régime déduit (cycle complet assistant / merge laissé au responsable) avec
   la phrase de `CLAUDE.md` qui le justifie.
3. Exception migration/auth : applicable ou non ; si oui, revue adversariale
   déjà faite ou restant à faire.
4. **Commentaires de revue** : leur nombre, et pour chacun son verdict — corrigé
   (commit), écarté (motif), routé (adresse). Aucun sans verdict.
5. Clôture opposable : fragment de handoff créé par la PR, ou merge refusé
   avec le geste de rattrapage.
5 bis. Sonde du déploiement (code, état, retenue de migration ou non) ;
   contrôle sur l'arbre fusionné (sa ligne `CONTROLE fusion`, et le motif
   d'un `1` ou d'un `2`) ; décisions entrées dans `main` depuis la base de la
   PR ; chevauchement, tel que le signal le rend.
5 ter. Sonde release-db : code, phase, runs non conclus, et ses conseils
   `D-374` §3 s'il y en a.
6. Sans `apply` : commande exacte à lancer pour merger. Avec `apply` : résultat
   du merge et du nettoyage.
