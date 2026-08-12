---
description: Termine le cycle d'une PR WellNeuro déjà ouverte par /wn-pr — lit le CI, déduit le régime de merge courant depuis CLAUDE.md, applique l'exception migration/auth si besoin, merge et nettoie. Sans `apply`, n'exécute rien.
argument-hint: "[numéro de PR] [apply]"
disable-model-invocation: true
effort: medium
---

# WellNeuro — clôture de PR

## Contexte

!`gh pr view $ARGUMENTS --json number,title,headRefName,url,files 2>/dev/null || echo "Passer le numéro de PR en argument, ou se placer sur sa branche."`
!`cd "$(git rev-parse --show-toplevel)" && cat docs/claude/REGLES_PR_MERGE.md`
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
   dernière ligne `SNAPSHOT PR#…` (état, mergeable, base, SHA de tête) sert de
   vue à jour : ne pas refaire un `gh pr view` derrière.
3. **Le code de sortie décide, et `0` seul autorise la suite.** Le script
   vérifie que les checks obligatoires ont *réellement tourné*, pas seulement
   que rien n'est en attente — c'est ce que l'idiome remplacé ne savait pas
   faire. **`2` = `verify` n'a pas tourné** : le script nomme toutes les causes
   applicables (PR en conflit, branche squashée, commit de tête Copilot gelant
   le run en `action_required`). **`5` = les checks sont verts mais la PR est en
   conflit** — le vert porte alors sur un commit qui n'est pas le résultat
   fusionné ; fusionner la base et relancer. **`4` = indéterminé**, y compris
   quand la liste des checks obligatoires n'a pas pu être lue. Aucun de ces
   codes ne se débloque en forçant le merge ; le cas Copilot se débloque en
   poussant un commit sous le compte du dépôt.
4. **Déduire le régime courant** du texte chargé ci-dessus :
   - la section « Période transitoire » y est toujours présente et décrit une
     autorisation active → cycle complet possible (étapes 7-8) ;
   - elle a été retirée ou remplacée → s'arrêter après l'étape 3, annoncer
     l'état du CI, laisser la revue et le merge à Copilot.
5. **Exception migration ou authentification** — si le diff touche
   `prisma/schema.prisma`, `prisma/migrations/`, `supabase/migrations/`, ou
   l'authentification — praticien (`web/src/lib/auth.ts`, routes `api/auth`)
   **ou** portail patient (`web/src/middleware.ts`, lien magique, cookie de
   session, `patients.access_token`), ou plus largement tout chemin touchant
   session/token : une revue adversariale indépendante — `Agent(subagent_type:
   "wn-reviewer")`, agent épinglé Opus/high — est obligatoire
   avant le merge si elle n'a pas déjà eu lieu, et une vérification de la base
   de production (`execute_sql` MCP Supabase — jamais `psql`, jamais une
   commande Bash) après. Ces deux passes s'appliquent même en régime
   transitoire ; ne jamais les sauter sur ce périmètre.
6. **Clôture opposable — se lit dans les `files` de la PR, pas en local.** La
   PR doit porter `docs/claude/SESSION_LOG.md` **et** un fragment
   `docs/claude/handoffs/AAAA-MM-JJ-HHMM-slug.md` (le `README.md` du dossier ne
   compte pas). L'un des deux manque → **ne pas merger, même CI vert** :
   demander `/wn-finish` puis `/wn-handoff write`, poussés sur la branche de la <!-- mention-seule: wn-finish, wn-handoff -->
   PR tant qu'elle est ouverte. Il n'y a pas de dérogation à accorder : la PR de
   doc qui répare une fenêtre déjà ratée (verdict de cycle en sortie `1`) porte
   précisément cette clôture, donc elle passe le contrôle par construction — et
   c'est la seule forme acceptée de PR de rattrapage.
7. **Sans `apply`** : ne rien exécuter. Rendre le numéro de PR, l'état CI,
   présence de `verify`, régime déduit, applicabilité de l'exception, verdict de
   clôture (étape 6) — puis la commande exacte à lancer.
8. **Avec `apply`**, et seulement si l'étape 4 autorise le cycle complet, si
   l'étape 5 est satisfaite quand elle s'applique, et si l'étape 6 est
   satisfaite :
   ```bash
   gh pr merge <N> --squash --delete-branch
   ```
   puis nettoyer le worktree rattaché (`ExitWorktree` avec `action: "remove"`,
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
2. Régime déduit (cycle complet assistant / ressort Copilot) avec la phrase de
   `CLAUDE.md` qui le justifie.
3. Exception migration/auth : applicable ou non ; si oui, revue adversariale
   déjà faite ou restant à faire.
4. Clôture opposable : `SESSION_LOG.md` et fragment de handoff présents dans la
   PR, ou merge refusé avec le geste de rattrapage.
5. Sans `apply` : commande exacte à lancer pour merger. Avec `apply` : résultat
   du merge et du nettoyage.
