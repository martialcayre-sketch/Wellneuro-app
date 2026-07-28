---
description: Termine le cycle d'une PR WellNeuro déjà ouverte par /wn-pr — lit le CI, déduit le régime de merge courant depuis CLAUDE.md, applique l'exception migration/auth si besoin, merge et nettoie. Sans `apply`, n'exécute rien.
argument-hint: "[numéro de PR] [apply]"
disable-model-invocation: true
effort: medium
---

# WellNeuro — clôture de PR

## Contexte

!`gh pr view $ARGUMENTS --json number,title,headRefName,url,files 2>/dev/null || echo "Passer le numéro de PR en argument, ou se placer sur sa branche."`
!`sed -n '181,195p' CLAUDE.md`
!`sed -n '196,271p' CLAUDE.md`
!`git worktree list 2>/dev/null || true`

Arguments : `$ARGUMENTS`

## Mission

Reprend le cycle là où `/wn-pr` s'arrête : une PR déjà ouverte, dont il faut lire
le CI, décider si elle se merge, et nettoyer derrière. Le régime qui autorise
(ou non) le merge côté assistant n'est jamais supposé : il se lit à chaque
invocation dans le texte de gouvernance chargé ci-dessus, pas dans ce fichier —
l'autorisation transitoire est bornée dans le temps et peut avoir été retirée de
`CLAUDE.md` depuis la dernière session.

1. **Identifier la PR.** Numéro en argument, sinon déduit de la branche
   courante. Aucune PR trouvée → s'arrêter et le dire.
2. **Attendre et lire le CI** avec l'idiome bloquant chargé ci-dessus (un seul
   appel en tâche de fond) — jamais de `gh pr checks` répété en boucle.
3. **Vérifier que `verify` a réellement tourné**, pas seulement les checks
   Vercel. Son absence signale le piège `action_required` (commit de tête signé
   Copilot) : le déblocage se fait en poussant un commit sous le compte du
   dépôt, jamais en forçant le merge.
4. **Déduire le régime courant** du texte chargé ci-dessus :
   - la section « Période transitoire » y est toujours présente et décrit une
     autorisation active → cycle complet possible (étapes 6-7) ;
   - elle a été retirée ou remplacée → s'arrêter après l'étape 3, annoncer
     l'état du CI, laisser la revue et le merge à Copilot.
5. **Exception migration ou authentification** — si le diff touche
   `prisma/schema.prisma`, `prisma/migrations/`, `supabase/migrations/`, ou
   l'authentification (`web/src/lib/auth.ts`, routes `api/auth`, session,
   token) : une revue adversariale indépendante (sous-agent `wn-reviewer`) est
   obligatoire avant le merge si elle n'a pas déjà eu lieu, et une vérification
   de la base de production (`execute_sql` MCP Supabase — jamais `psql`, jamais
   une commande Bash) après. Ces deux passes s'appliquent même en régime
   transitoire ; ne jamais les sauter sur ce périmètre.
6. **Sans `apply`** : ne rien exécuter. Rendre le numéro de PR, l'état CI,
   présence de `verify`, régime déduit, applicabilité de l'exception — puis la
   commande exacte à lancer.
7. **Avec `apply`**, et seulement si l'étape 4 autorise le cycle complet et
   l'étape 5 est satisfaite si elle s'applique :
   ```bash
   gh pr merge <N> --squash --delete-branch
   ```
   puis nettoyer le worktree rattaché (`ExitWorktree` avec `action: "remove"`,
   ou `git worktree remove`), et repartir de `main` — jamais de la branche
   squashée — pour le lot suivant.

Ne jamais forcer un merge sur une PR gelée (`enforce_admins` actif, `verify`
obligatoire) : une PR gelée bloque, elle ne ressemble pas à un succès à
contourner.

## Sortie

1. Numéro de PR et état CI (checks passés, `verify` présent ou non).
2. Régime déduit (cycle complet assistant / ressort Copilot) avec la phrase de
   `CLAUDE.md` qui le justifie.
3. Exception migration/auth : applicable ou non ; si oui, revue adversariale
   déjà faite ou restant à faire.
4. Sans `apply` : commande exacte à lancer pour merger. Avec `apply` : résultat
   du merge et du nettoyage.
