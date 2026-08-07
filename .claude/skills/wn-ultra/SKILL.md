---
description: Détermine le mode d'exécution d'une tâche — solo, multi-agent léger, ou ultracode (Workflow) — et le met en œuvre si l'opt-in est présent.
argument-hint: "[tâche] | ultracode | leger | solo"
disable-model-invocation: true
effort: low
---

# WellNeuro — mode d'exécution

Demande : `$ARGUMENTS`

| Situation | Mode |
|---|---|
| Aucun signal fort de largeur ni de confiance critique | **Solo** (défaut) |
| Un seul axe borné : largeur modérée, ou une passe de vérification indépendante | **Multi-agent léger** — réutiliser une brique existante (`wn-reviewer`, `wn-explorer`, agent natif `Explore`…) |
| Plusieurs signaux : ≥ ~5 unités parallélisables, exhaustivité demandée, échelle > un contexte, enjeu où un faux résultat coûte cher | **Ultracode** (outil Workflow) |

Signaux POUR ultracode : fan-out réel, confiance critique (chasse aux bugs,
revue sécurité, migration), échelle dépôt-large, exhaustivité demandée, espace
de solutions large. Signaux CONTRE (→ solo) : tâche bornée, séquentielle,
conversationnelle, ou bug local même difficile.

- **Ultracode exige un opt-in explicite** (mot-clé `ultracode`, réglage de
  session, ou demande de Workflow). Sans opt-in : ne rien lancer, proposer en
  indiquant la forme et l'ordre de grandeur du coût. Préférer un ultracode
  ponctuel sur une demande précise à un réglage permanent.
- C'est un **mode d'exécution, jamais une autorisation** : édition ⇒ mode
  Plan ; migration, écriture Supabase, déploiement, clinique ⇒ confirmation
  distincte ; le merge suit le régime de `CLAUDE.md`.
- Un override nommé (`ultracode`/`leger`/`solo`) prime sur la grille.
- Fable ≠ Ultracode : Fable répond à la profondeur, Ultracode à la largeur.
  Les combiner est rare et exige les deux simultanément.

Sortie : verdict + les 2-3 signaux décisifs, puis l'action (brique, Workflow,
ou invitation à opter) et l'alternative moins chère.
