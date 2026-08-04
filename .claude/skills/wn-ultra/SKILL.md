---
description: Détermine si le mode ultracode (orchestration multi-agent via Workflow) est utile pour une tâche, rend le verdict solo / multi-agent léger / ultracode, et lance le Workflow adapté si le mode est justifié et opté.
argument-hint: "[tâche] | ultracode | leger | solo"
disable-model-invocation: true
effort: low
---

# WellNeuro — routeur de mode d'exécution

## Contexte

!`cd "$(git rev-parse --show-toplevel)" && git status --short --untracked-files=all`
!`git diff --stat 2>/dev/null | tail -n 1`
!`cd "$(git rev-parse --show-toplevel)" && test -f docs/claude/SESSION_LOG.md && tail -n 20 docs/claude/SESSION_LOG.md || true`

Demande : `$ARGUMENTS`

## Mission

À partir de la demande, décider d'un seul **mode d'exécution** — solo, multi-agent
léger, ou ultracode (orchestration multi-agent via l'outil Workflow) — et le mettre
en œuvre. Ne modifier aucun fichier pour rendre le verdict. Ne jamais interpréter ce
skill comme une autorisation de migration, d'écriture Supabase, de déploiement ou de
modification clinique : ultracode est un **mode d'exécution, pas une autorisation**.

Rappels techniques (à appliquer, pas à réexpliquer) :

- **Ultracode** = orchestration multi-agent déterministe via l'outil Workflow
  (fan-out → vérification adversariale → synthèse). Coûteux : jusqu'à des dizaines
  de sous-agents. Opt-in explicite requis (mot-clé `ultracode`, réglage de session,
  ou demande explicite de lancer un Workflow).
- **Multi-agent léger** = quelques sous-agents en parallèle sans la machinerie
  Workflow : réutiliser les briques existantes — sous-agents épinglés (`wn-reviewer`,
  `wn-debugger`, `wn-doc-auditor`, `wn-explorer`, `wn-fable`) ou campagnes
  (`/wn-campaign`, `/wn-campaign-run`). <!-- mention-seule: wn-campaign, wn-campaign-run -->
- **Solo** = exécution directe en un seul contexte. Le moins cher ; défaut.
- Une édition de code passe toujours par le mode Plan + la revue + le circuit de
  merge habituels, que le mode soit solo ou ultracode. Le Workflow n'y déroge pas.

## Grille de décision

Compter les signaux. Un seul verdict.

**Signaux POUR ultracode** (largeur / confiance / échelle) :

- **Fan-out** : la tâche se découpe en ≥ ~5 unités indépendantes couvrables en
  parallèle (fichiers, dimensions de revue, sources, sites d'appel d'une migration).
- **Confiance critique** : chasse aux bugs, revue sécurité, migration, changement
  d'auth, logique ou seuils cliniques — un faux résultat coûte cher, la vérification
  adversariale indépendante paie. (WellNeuro impose déjà une revue adversariale sur
  les PR migration/auth.)
- **Échelle > un contexte** : balayage dépôt-large, grosse migration, audit exhaustif.
- **Exhaustivité demandée** : « audit complet », « exhaustif », « trouve TOUS les… ».
- **Espace de solutions large** (design) : plusieurs approches viables méritant un jury.

**Signaux CONTRE** (→ solo) :

- Trivial, mécanique, mono-fichier, bien cadré, petit.
- Séquentiel, indivisible (ne se parallélise pas).
- Conversationnel, question rapide, lookup d'un seul fait.
- Budget tokens serré sans besoin réel de largeur ni de confiance.

**Verdict :**

| Situation | Mode |
| --- | --- |
| Aucun signal POUR fort | **Solo** |
| Un seul axe borné (largeur modérée OU une passe de vérification indépendante) | **Multi-agent léger** — réutiliser une brique |
| Plusieurs signaux POUR, largeur / confiance / échelle réels | **Ultracode** |

Ne pas sur-orchestrer : si une brique existante (sous-agent, campagne) suffit, la
préférer à un Workflow.

## Overrides forçables

L'utilisateur peut forcer le mode en le nommant : `ultracode`, `leger`, `solo`. Un
override explicite prime sur la grille.

## Mise en œuvre

- **Solo** → traiter la demande en direct, sans sous-agent.
- **Multi-agent léger** → déléguer au sous-agent ou à la campagne adaptés ; donner la
  commande (`/wn-review`, `/wn-debug`, `/wn-campaign …`, ou délégation `wn-*`). <!-- mention-seule: wn-review, wn-debug, wn-campaign -->
- **Ultracode** :
  - **Opt-in présent** (mot-clé `ultracode` dans la demande, réglage de session actif,
    ou demande explicite de Workflow) → appeler l'outil Workflow avec un script
    correspondant à la forme retenue :
    - audit / revue → dimensions → find → vérif adversariale (pipeline) ;
    - recherche → sweep multi-modal → deep-read → synthèse ;
    - migration de code → découvrir les sites → transformer (worktree isolé) → vérifier ;
    - design → panel de N approches → jury → synthèse ;
    - compréhension → lecteurs parallèles → carte structurée.
  - **Opt-in absent** → ne rien lancer ; recommander de réinvoquer avec le mot-clé
    `ultracode`, en indiquant la forme et le coût estimé.
  - Hors mode Plan, si la tâche implique des edits : n'orchestrer que de l'analyse en
    lecture seule, et renvoyer vers le mode Plan pour toute écriture.

## Sortie

1. Contexte détecté (une phrase : nature + taille de la tâche).
2. Verdict : Solo / Multi-agent léger / Ultracode, avec les 2-3 signaux décisifs.
3. Action : commande de la brique (si léger) ; ou lancement du Workflow avec sa forme
   (si ultracode + opt-in) ; ou invitation à opter (si ultracode sans opt-in).
4. Alternative pour réduire le coût (retomber sur léger ou solo).
