---
description: Sélectionne et exécute la matrice de tests minimale adaptée au diff WellNeuro, puis élargit seulement si nécessaire.
argument-hint: "[quick|full|fichier-ou-zone]"
disable-model-invocation: true
effort: medium
---

# WellNeuro — validation ciblée

!`git diff --stat`
!`git diff --name-only`
!`git status --short`

Argument : `$ARGUMENTS`

## Trois paliers

Choisir le palier d'après le diff, puis n'élargir que sur échec ou sur risque avéré.

| Palier | Commande (depuis `web/`) | Durée | Quand |
|---|---|---|---|
| **T1** | `npm run check` | ~10 s | après chaque édition — type-check + Vitest + anti-secrets sur l'index |
| **T2** | `npm run test:worktree -- --fast` | ~1 min 20 | avant tout commit touchant UI ou API — inclut les E2E |
| **T3** | `npm run test:worktree` | ~5 min | avant une PR portant migration, scoring ou logique clinique |

T1 ne prouve rien sur les parcours : il n'exécute pas Playwright. Un changement
d'UI annoncé vert sans T2 est une affirmation non vérifiée.

## Écrire la sortie une fois, la relire autant qu'il faut

**Ne jamais relancer une suite pour en relire la sortie.** Rediriger vers un
fichier, puis lire ce fichier — y compris pour un détail aperçu trop tard :

```bash
npx vitest run <fichiers> --reporter=dot > /tmp/vitest.txt 2>&1; echo "exit=$?"
tail -30 /tmp/vitest.txt          # puis grep/Read sur LE MÊME fichier
```

`--reporter=dot` supprime l'énumération des tests verts ; le détail des échecs
reste intégral dans le fichier. Le 2026-07-20, six exécutions complètes du même
fichier de test se sont enchaînées avec `| tail -N` croissant (6→12→20→25→30→45)
faute de cette redirection.

## Règles

1. Classer les fichiers modifiés : docs, UI, API, scoring, Prisma, scripts.
2. Commencer par le palier le moins coûteux.
3. Utiliser les scripts déjà présents dans `package.json` et `scripts/`.
4. Ne jamais créer de donnée patient réelle.
5. Ne jamais lancer migration, seed production, écriture Supabase ou déploiement.
   La base éphémère locale de `test:worktree` ne compte pas : jetable, isolée,
   100 % fictive.
6. Vérifier l'état de la base de PRODUCTION par l'outil MCP Supabase
   (`execute_sql`, lecture seule, autorisée sans interruption), jamais par
   `psql` ni par une commande Bash.

Rendre : commandes, résultats, échecs, cause probable, prochain test utile et go/no-go.
