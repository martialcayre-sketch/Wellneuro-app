---
description: Sélectionne et exécute la matrice de tests minimale adaptée au diff WellNeuro, puis élargit seulement si nécessaire.
argument-hint: "[quick|full|fichier-ou-zone]"
disable-model-invocation: true
effort: medium
---

# WellNeuro — validation ciblée

!`git diff --stat`
!`cd "$(git rev-parse --show-toplevel)" && git diff --name-only`
!`cd "$(git rev-parse --show-toplevel)" && git status --short --untracked-files=all`

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

**La redirection économise deux fois, et la seconde est la plus grosse.** Elle
évite de réexécuter — et surtout elle empêche une sortie de suite entière
d'entrer dans le contexte, où elle serait relue à **chaque tour suivant** de la
session (mesuré le 2026-08-01 : ~202 000 tokens relus par requête, ~37 tours par
session). Sur un `test:worktree` complet, c'est la différence entre lire 30
lignes une fois et repayer des milliers de lignes trente fois.

Ne jamais faire entrer une sortie complète : rediriger, lire la queue, puis
`grep` sur **le même fichier** pour tout détail supplémentaire.

## Un palier sauté se dit — il ne se compte pas comme vert

Rendre la **commande** et sa **sortie**, pas leur résumé : « vert » n'est pas
une observation tant que le code de retour n'a pas été lu. Ne jamais annoncer
un succès qui n'a pas été observé dans cette session.

Un contrôle qui ne peut pas s'exécuter — outil absent, base indisponible,
palier hors de portée de la machine — est un contrôle **non exécuté**, jamais
un contrôle réussi. Le compter comme vert produit exactement le rapport
rassurant qui a permis de rater ce qu'il annonçait couvrir : le 2026-07-31, le
`selfcheck` d'un dépôt tiers a rendu « all checks passed » alors qu'il avait
sauté l'intégralité de ses tests, faute de l'outil qui les lance.

En pratique, dans la sortie :

- palier exécuté → commande, code de retour, résumé de la sortie ;
- palier sauté → dire lequel, pourquoi, et **ce qui reste donc non vérifié** ;
- E2E non joués (PC, ou run concurrent) → le parcours n'est pas vérifié, quel
  que soit l'état de Vitest.

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
