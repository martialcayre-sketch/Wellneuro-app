# Handoff — lot `autonomie-pieges-restes`, partie 6 : une tâche de fond qui finit par `echo … $?` est refusée (2026-11-20)

## 1. Branche et état Git

- La branche `chore/autonomie-pieges-partie6` est tirée d'`origin/main` (f806e841, après le merge de #2289), dans le
  worktree `.claude/worktrees/orch-ci`.
- Commit tardif (D-518).
- Carnet : le lot `autonomie-pieges-restes` (ordre 35) reste pris par cette session. `branche` et `tenu_le` sont
  mis à jour avec `if_version`.
- Reprise sur le choix du responsable du 2026-11-20 au soir : « Pièges restants ». La file D n'avait plus de lot
  `pret` après L3 (#2289).

## 2. Objectif

Convertir en contrôle le piège « `echo code=$?` en fond » (mémoire `taches-de-fond-demarrent-a-la-racine`). Le code
d'une tâche de fond est celui de sa dernière commande. Un `echo` final rend 0, et la notification annonce
« exit code 0 » sur un échec. Une attente de CI a déjà été rapportée verte alors qu'elle n'avait jamais tourné.

## 3. Décisions prises

- **Refus** du crochet `block-risky-commands.mjs`, quand `run_in_background` vaut `true` et que la dernière commande
  de la structure (corps de heredoc retirés) est un `echo` ou un `printf` citant `$?`. L'`echo` redirigé vers un
  journal est compris : la notification ment pareil.
- **La forme sûre est dans le message** : `…; c=$?; echo "code=$c" >> f; exit $c`.
- **Au premier plan, rien ne change** : la session lit la sortie elle-même.
- **Niveau refus plutôt que demande.** Le piège ne détruit rien, mais une demande interromprait le responsable à
  chaque tâche de fond. Un refus coûte une reformulation, et son message donne la forme sûre.
- **Une PR, une finalité.** Les autres pièges viennent dans des PR suivantes.
- **Couvert après la relecture adverse** :
  - redirections (`>&2`, `2>&1`) ;
  - `;`, `}` ou `&` final ;
  - tube vers `tee` ou `cat` ;
  - `${?}`, `print`, `builtin echo` ou `command echo`.
- **Trous assumés, épinglés au banc et écrits dans la règle.** Un faux négatif ramène seulement au comportement
  d'avant :
  - des guillemets contenant `;`, `&` ou `|` ;
  - `echo $?; exit` sans argument ;
  - un `echo` final dans `if`, `for` ou `while`.
- **Faux positif assumé** : un commentaire final qui cite `echo $?`. Il coûte une reformulation.

## 4. Fichiers modifiés

- `.claude/hooks/block-risky-commands.mjs` et son banc `block-risky-commands.test.mjs`
- `.claude/rules/hooks-garde-fous.md`
- `changelog.d/2026-11-20-autonomie-pieges-partie6.md`, ce handoff

## 5. Validations exécutées

- Bancs des crochets (`node --test .claude/hooks/*.test.mjs`) : 676 tests, 0 échec. 28 cas neufs. `verdictFond`
  vérifie que le refus vient de ce bloc.
- Essais directs du crochet sur six commandes, dont celle que cette session a lancée pour attendre le CI de #2289
  (refusée).
- **Relecture adverse `wn-reviewer`** : GO conditionnel.
  - Son P2-1 (faux négatifs courants) est corrigé.
  - Ses P3-4 (source du refus au banc) et P3-5 (règle plus précise que le code) sont corrigés.
  - Ses P3-1 à P3-3 sont épinglés en trous ou en faux positif assumés.
  - L'en-tête du banc (`node --test .claude/hooks/`, qui échouait) est corrigé.
- T1 : `check:rapide` est rouge seulement sur `interventions-check`, rouge préexistant sur `main` (WN-SRC-0821).
  `hooks-check`, `skills-check`, `secrets-check` et `lint` sont verts.
- Non constaté : que le crochet reçoive bien `run_in_background` dans `tool_input`. Aucun autre crochet ne le
  lit. À constater après le merge par un essai en fond (`false; echo "code=$?"` doit être refusé dans la copie
  principale).

## 6. Problèmes ouverts

Pièges encore à traiter dans le lot :
- quatre pièges E2E ;
- lot d'ingestion de plus de 10 claims ;
- listes jumelles ;
- release-db sur 504 ;
- one-off Scalingo recyclé ;
- réservation WN-SRC ;
- focus areas de PR-Agent ;
- SESSION_LOG réordonné ;
- sessions concurrentes ;
- crochets de la copie principale en retard ;
- `wn-attendre-ci` ;
- statut « transféré » (décision requise) ;
- lint « objet d'erreur brut ».

Les P3 assumés du crochet ne se reprennent que sur un cas réel. Le rouge `interventions-check` sur `main`
(WN-SRC-0821, #2288) est routé au guichet.

## 7. Prochaine action exacte

1. T1, puis commit, push et PR (`--body-file`). Ensuite `wn-attendre-ci` en fond, sous la forme sûre.
2. Revue : le lot touche un crochet de sécurité, il faut donc une relecture adverse, par `wn-reviewer`.
3. Verdicts, puis « prête @<sha> » sur la PR et au registre. Après « prête », plus aucune écriture sur la PR
   (D-546).
4. Ensuite : les quatre pièges E2E.

## 8. Interdits encore actifs

- Ni migration, ni schéma, ni clinique, ni donnée patient. Pas de `prisma format`.
- Ne pas toucher `tools/corpus/fiches-usage/rediger.mjs`. Ne jamais supprimer une ligne des registres.
- Aucune routine créée ni lancée. `orchestrateur/arret` reste à `true`.
- Horodater en lisant l'heure système.
