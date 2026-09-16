# Handoff — 2026-09-16 — `D-214` : la règle du jour reçoit son entrée au registre

Suite directe du merge `ad6c8057`. Le responsable a répondu « oui » à la seule
question restée ouverte : faut-il enregistrer la règle comme décision.

## Branche et état Git

`wn-d214-registre-2026-09-16`, branchée sur `origin/main` (`ad6c8057`). Diff
purement documentaire — registre, fragment, clôture, plus une ligne dans le
fichier de règle pour qu'il cite sa décision.

## Ce que porte le lot

| Fichier | Rôle |
|---|---|
| `docs/DECISIONS.md` | **`D-214`**, en tête de section active |
| `.claude/rules/pr-revue-et-release-db.md` | Une ligne : le fichier cite la décision qui le pose, et redit qu'il ne réarbitre ni `D-087` ni `D-120` |
| `changelog.d/`, `SESSION_LOG.md`, ce handoff | Clôture, écrite sur la branche vivante |

## Ce que `D-214` grave, et ce qu'elle ne fait pas

Elle grave **le pourquoi** (quatre PR mergées sur CI vert le 2026-09-16 ; six
constats laissés, quatre réels, dont deux défauts en production ; aucun visible
au CI), **l'obligation** (trois verdicts, aucun commentaire sans l'un d'eux ;
`release-db` en sept étapes constatées, avec sa fenêtre de panne et ses cinq
pièges), et **son épreuve sur elle-même** — quatre constats Copilot retenus sur
la PR qui la posait, dont deux visant le texte qu'elle venait d'écrire.

Elle **n'exécute rien de neuf** : la règle, l'étape 6 bloquante de `/wn-merge` et
les deux renvois corrigés vers le conteneur one-off sont en service depuis
`ad6c8057`. Elle ne réarbitre ni [[D-087]] ni [[D-120]], et
`docs/DEPLOIEMENT_RELEASE_DB.md` reste la source de la procédure.

## Le point de vigilance de ce lot

**Le numéro se prend au merge.** `D-214` était libre au moment de l'écriture
(registre à 213, sans trou). Sept collisions ont été constatées en deux jours
cette semaine : re-jouer `node scripts/lib/decisions-numerotation.mjs` juste
avant de merger, et passer le `--subject` qui porte le **bon** numéro — éditer le
titre de la PR ne changerait rien au sujet du squash.

## Prochaine action

PR `--base main`, `wn-attendre-ci` hors tube et **hors enchaînement avec le
push** (il a rendu `0` sur la tête précédente aujourd'hui), lecture de la revue
avec un verdict par commentaire, puis merge avec `--subject`.
