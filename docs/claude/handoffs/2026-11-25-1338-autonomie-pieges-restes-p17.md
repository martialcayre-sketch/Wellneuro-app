# Handoff — autonomie-pieges-restes, partie 17 : crochets de la copie principale en retard (2026-11-25)

## 1. Branche et état Git

- Branche `chore/autonomie-pieges-partie17`, tirée d'`origin/main` après #2336 (partie 16, mergée be465de2), puis
  avancée deux fois en `--ff-only` (aucun chevauchement), dans le worktree `.claude/worktrees/orch-ci`.
- Commit tardif, juste avant le push (D-518).

## 2. Objectif

Convertir en contrôle le piège « crochets de la copie principale en retard » du lot `autonomie-pieges-restes`
(file D, ordre 35). Les lanceurs de `settings.json` exécutent les gardes sous `$CLAUDE_PROJECT_DIR`, la racine de
lancement, qui ne change ni après `/cd` ni après `EnterWorktree`. Une session passée en worktree garde donc les
crochets, réglages et agents de la copie principale. Si celle-ci n'a pas un changement de crochets de `main`, les
gardes en vigueur sont antérieurs à `main`, et le garde de fraîcheur (qui juge la branche du répertoire courant) ne le
voyait pas.

## 3. Décisions prises

- **Avertissement, jamais refus** : la session n'y est pour rien, et le remède est l'avance de la copie principale
  par l'intégrateur (`D-373` §2).
- **Au démarrage, après le fetch**, par `git-freshness.mjs` (SessionStart), import dynamique sous `try`, même
  régime que la partie 16 : `settings.json` et le chemin PreToolUse inchangés.
- **Ce qui compte comme retard** : un fichier de `.claude/hooks/`, `.claude/settings.json` ou `.claude/agents/` changé
  par `origin/main` depuis sa base commune avec la tête de la copie des crochets ET différent sur le disque de cette
  copie. Silence quand la copie des crochets est celle du répertoire courant : le constat de fraîcheur la juge déjà.
- **Risque** : P1 (crochet de sécurité). Revue `wn-reviewer`, puis PR-Agent → 0.
- **Verdicts de la revue adverse `wn-reviewer`** (GO sous réserve) :
  1. l'avertissement ne peut pas sortir dans le lot même qui fait `EnterWorktree` (au premier démarrage, le
     `cwd` est la copie principale) : **corrigé dans la doc** (règle, fragment, en-tête du module), avec le moment
     exact où il parle (`/clear`, `/compact`, reprise dans le worktree). Au premier démarrage, le constat de
     fraîcheur de la copie principale dit déjà son retard. Le `PostToolUse` sur `EnterWorktree` qui couvrirait ce
     lot touche `settings.json` : **routé** au §6, pas fait ici ;
  2. faux positif après un squash-merge (la base reste l'ancienne) : **corrigé**, intersection avec l'arbre de
     travail contre `origin/main` ; scène « squash » au banc ;
  3. HEAD jugé au lieu du disque : **corrigé** par la même intersection ; scène « modification locale » ;
  4. trous du banc : **corrigés**. Remote nu avec `origin/main` avancé par le seul fetch du crochet (prouve
     « après le fetch »), scènes divergente, imbriquée, `settings.json`, agents, sans `origin/main`, lien
     symbolique. La phrase « huit mutations sur huit » du fragment est remplacée par la liste au §5 ;
  5. hygiène du banc : **corrigé**, variables `GIT_*` retirées de l'environnement, marqueurs de fraîcheur
     supprimés après chaque scène.
  - Question de la revue sur le `cwd` passé à SessionStart après `EnterWorktree` : constaté dans cette session,
    dont la reprise après compaction a vu le crochet juger le worktree (HEAD du worktree dans le message).

## 4. Fichiers modifiés

- `.claude/hooks/crochets-en-retard.mjs` (neuf) et son banc `.claude/hooks/crochets-en-retard.test.mjs` (neuf, pris
  par le motif `.claude/hooks/*.test.mjs` du CI et de `check`)
- `.claude/hooks/git-freshness.mjs` (appel au démarrage, après le fetch)
- `.claude/rules/hooks-garde-fous.md` (paragraphe)
- `changelog.d/2026-11-25-autonomie-pieges-partie17.md`, ce handoff

## 5. Validations exécutées

- Bancs `crochets-en-retard`, `sessions-concurrentes`, `git-freshness`, `settings-gardes` : 75 sur 75.
- Mutations, fichiers rétablis à l'identique, chacune rougit : même copie non exclue, tête au lieu de la base, tout
  fichier compté, liste vide avertie, aucune troncature, agents oubliés, disque ignoré, chemins non résolus, appel
  avant le fetch, alerte jamais écrite, import sorti du `try`. « Tête non exigée » reste verte : mutation
  équivalente (une tête nulle lève dans le message, l'exception rend `null`).
- Preuve réelle en lecture seule sur ce Mac : la copie principale (à jour, 7694b3af) rend `null` en 19 ms ; le
  worktree lui-même rend `null`.
- T1 complet (`cd web && npm run check`) : code 0 avant les corrections de la revue, et code 0 rejoué après, avant
  le commit.

## 6. Problèmes ouverts

- **Routé** : un crochet `PostToolUse` sur `EnterWorktree` couvrirait le lot même qui entre dans le worktree. Il
  touche `settings.json` (lanceurs fermés, banc `settings-gardes`) : à décider comme partie distincte du lot si
  le responsable le veut.
- Limites assumées : une avance de `main` en cours de session ne se voit qu'au démarrage suivant ; une copie
  antérieure à ce module se tait.
- Toujours ouvert depuis la partie 16 : trois processus `claude` dans la copie principale au relevé de 11 h, à
  regarder par le responsable ; test E2E intermittent `e2e/portail-rail-lateral.spec.ts:128` (série refonte-lien).
- Pièges encore à traiter dans le lot :
  - `wn-attendre-ci` (tête périmée, e2e lent) ;
  - statut « transféré » (décision requise) ;
  - lint « objet d'erreur brut journalisé ».
- Toujours ouverts depuis les parties 13 et 14 : `sources-check` absent de `GARDES_NODE` ; `wn-integrer.mjs` ne
  vérifie pas lui-même la preuve PR-Agent ; fixture E2E `WN-SRC-0998` ; deux dossiers `wn-repro-imp-*`.

## 7. Prochaine action exacte

1. T1 complet, commit, push, PR (`--body-file`), `wn-attendre-ci` en fond.
2. PR-Agent → 0, verdict cité pour chaque focus area (garde 26).
3. « prête @<sha> » sur la PR et au registre (boîte `integrateur`), puis plus aucune écriture sur la PR (D-546).
   Note pour l'intégrateur : un crochet est touché, T1 après l'avance de la copie principale.
4. Ensuite, le piège suivant : « `wn-attendre-ci` (tête périmée, e2e lent) ».

## 8. Interdits encore actifs

- Ni migration, ni schéma, ni clinique, ni donnée patient. Pas de `prisma format`.
- Rien d'édité dans `web/src/lib/clinical/`. Aucune écriture en production ; aucun `workflow_dispatch` de
  `release-db`.
- Ne jamais supprimer une ligne des registres. Pas de compaction du journal (gel `D-372` §2).
- `orchestrateur/arret` : seule la parole du responsable le change.
- Aucune adresse de page privée dans le dépôt. Horodater en lisant l'heure système.
