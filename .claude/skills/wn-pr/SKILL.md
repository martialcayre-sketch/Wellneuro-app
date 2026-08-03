---
description: Prépare une branche, un commit et une description de PR WellNeuro à partir du diff. Aucun push ni création de PR sans argument `apply`.
argument-hint: "[apply] [titre]"
disable-model-invocation: true
effort: medium
---

# WellNeuro — préparation de PR

!`git status --short`
!`git diff --stat`
!`git log -n 5 --oneline`

Arguments : `$ARGUMENTS`

Toujours :

- vérifier que le diff appartient à une seule finalité ;
- exécuter ou rappeler les tests nécessaires ;
- proposer un titre conventionnel ;
- rédiger résumé, périmètre, validations, risques et test manuel ;
- exclure secrets et données patient réelles.

Sans `apply` : ne créer ni branche, ni commit, ni push, ni PR.

Avec `apply` : branche et commit locaux autorisés. Le push, la création ou le merge d’une PR nécessitent encore une demande explicite claire.

**Modèle et réflexion selon le diff.** Si les fichiers du diff relèvent d'une
classe à risque du tableau de `/wn-lot` (Scoring/clinique, Prisma/migration,
Auth), rédiger la section « risques » via `Agent(subagent_type: "wn-reviewer")`
avec le mot-clé `think hard`/`think harder` dans le prompt, plutôt qu'en
session — la description d'une PR de migration mérite le même effort que sa
revue.

## Attendre le CI sans le sonder en boucle

Un seul appel, en tâche de fond :

```bash
node scripts/wn-attendre-ci.mjs <N>
```

Ne pas enchaîner `gh pr checks` / `gh pr view` manuellement : le 2026-07-20 la
session a produit 81 appels de sondage pour l'information que cet appel rend en
un seul.

Et ne pas revenir à la boucle `until … bucket=="pending"` qu'il remplace : elle
confondait « aucun check en attente » avec « aucun check du tout », et rendait
donc la main sur deux checks Vercel verts quand `verify` n'avait jamais été créé
(PR #550, le 2026-08-03). Le script sort en **`2`** dans ce cas et nomme toutes
les causes applicables ; **`0` est le seul code qui autorise à annoncer une PR
prête** — les cinq autres, `4` et `5` compris, disent chacun à sa façon qu'on ne
peut pas l'affirmer. Codes de sortie et périmètre : `CLAUDE.md`, section
« Attendre le CI d'une PR ».

Avant d’annoncer qu’une PR est prête à merger, **lire son CI** : `npm test`
n’exécute pas les E2E, une suite Vitest verte ne dit rien des parcours.

Une fois la PR ouverte, la suite du cycle (CI, régime de merge courant, exception
migration/auth, merge et nettoyage) est du ressort de `/wn-merge`, pas de ce
skill.

## Corps de PR

Rédiger le corps dans un fichier et le passer par `--body-file`. Le garde-fou
Bash inspecte la commande brute pour les motifs destructifs ; un corps de PR
long, cité en ligne, est une source inutile de collisions.
