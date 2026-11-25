# Handoff — autonomie-pieges-restes, partie 16 : sessions concurrentes sur la copie principale (2026-11-25)

## 1. Branche et état Git

- Branche `chore/autonomie-pieges-partie16`, tirée d'`origin/main` après #2332 (partie 15, mergée 0a6e6bb7), puis
  avancée en `--ff-only`, dans le worktree `.claude/worktrees/orch-ci`.
- Commit tardif, juste avant le push (D-518).

## 2. Objectif

Convertir en contrôle le piège « sessions concurrentes sur la copie principale » du lot `autonomie-pieges-restes`
(file D, ordre 35). Une seconde session ouverte dans la copie principale ne savait pas qu'une première y était
déjà ; ses commits pouvaient atterrir sur la branche de l'autre, et `git add -A` y ramasser ses fichiers.

## 3. Décisions prises

- **Avertissement, jamais refus** : le répertoire courant d'un processus `claude` est un indice. Une session lancée
  à la racine puis passée en worktree, ou une session inactive, peut y figurer encore. Un refus bloquerait
  l'intégrateur sur un faux positif.
- **Au démarrage seulement**, par `git-freshness.mjs` (SessionStart), qui existe déjà : `settings.json` (lanceurs
  fermés, banc `settings-gardes`) n'est pas touché. Import dynamique sous `try` : un module absent ou cassé ne
  coûte pas le constat de fraîcheur.
- **Portée** : la session qui démarre dans la copie principale (pas un worktree lié). C'est elle, la seconde
  arrivée, qui doit agir. La première n'est pas prévenue.
- **Détection** : `lsof -a -c claude -d cwd -Fpn`, chemins réels comparés à l'égalité (les worktrees sous
  `.claude/worktrees/` ne comptent pas), chaîne d'ancêtres exclue (`ps -o ppid=`). Seuls les pid sont affichés,
  jamais un chemin.
- **Risque** : P1 (crochet de sécurité, relecture adverse exigée). Revue `wn-reviewer`, puis PR-Agent → 0.
- **Verdicts de la revue adverse `wn-reviewer`** (GO, rien de bloquant) :
  - le banc ne prouvait pas le câblage (alerte jamais écrite : vert) : **corrigé**, module factice à côté d'une
    copie de `git-freshness.mjs`, l'avertissement et le constat de fraîcheur sont tous deux attendus ;
  - le calcul « copie principale » n'était pas testé : **corrigé**, dépôt simple (avertissement) contre
    `git worktree add` (aucun) ;
  - la doc disait « hors délai (2 s) » pour l'ensemble : **corrigé**, « chaque appel borné à 2 s » ;
  - sortie de `lsof` tué au délai acceptée : **corrigé**, `r.error` ou `r.signal` rendent `null` ; non couvert par
    le banc (il faudrait injecter le lanceur), trou assumé ;
  - processus nommé `node` (installation npm), session lancée dans un sous-dossier, Linux sans `lsof` : faux
    négatifs silencieux, **assumés** et écrits dans la règle ;
  - l'intégrateur reçoit aussi l'avertissement : **assumé**, le texte dit que seul l'intégrateur y travaille ;
    le restreindre supposerait de savoir qui est l'intégrateur, ce que le crochet ignore ;
  - aucune injection possible dans le contexte : seuls des pid entiers sont affichés (confirmé par la revue).

## 4. Fichiers modifiés

- `.claude/hooks/sessions-concurrentes.mjs` (neuf) et son banc `.claude/hooks/sessions-concurrentes.test.mjs`
  (neuf, pris par le motif `.claude/hooks/*.test.mjs` du CI et de `check`)
- `.claude/hooks/git-freshness.mjs` (appel au démarrage)
- `.claude/rules/hooks-garde-fous.md` (paragraphe)
- `changelog.d/2026-11-25-autonomie-pieges-partie16.md`, ce handoff

## 5. Validations exécutées

- Bancs `sessions-concurrentes`, `git-freshness`, `settings-gardes` : 61 sur 61.
- Mutations, fichiers rétablis à l'identique : ancêtres ignorés, sous-dossiers comptés, worktree lié non exclu,
  alerte jamais écrite, copie principale inversée (2 cas), import sorti du `try` — chacune rougit. Seule
  « `lsof` tué accepté » reste verte (trou assumé, §3).
- Preuve réelle (lecture seule, `lsof` et `ps`) sur ce Mac : la copie principale rend « 3 autres sessions Claude
  (pid 4377, 7829, 43261) » en moins de 50 ms ; le worktree lié rend `null`.

## 6. Problèmes ouverts

- **Trois processus `claude` ont aujourd'hui pour répertoire la copie principale** (pid 4377, 7829, 43261 au
  relevé de 11 h). Au plus un est l'intégrateur ; les autres sont peut-être des sessions inactives ou passées en
  worktree. À regarder par le responsable.
- Limites assumées : la première session n'est pas prévenue ; un processus nommé autrement que `claude` n'est pas
  vu ; hors macOS ou Linux avec `lsof`, rien.
- Pièges encore à traiter dans le lot :
  - crochets de la copie principale en retard ;
  - `wn-attendre-ci` (tête périmée, e2e lent) ;
  - statut « transféré » (décision requise) ;
  - lint « objet d'erreur brut journalisé ».
- Toujours ouverts depuis les parties 13 et 14 : `sources-check` absent de `GARDES_NODE` ; `wn-integrer.mjs` ne
  vérifie pas lui-même la preuve PR-Agent ; fixture E2E `WN-SRC-0998` ; deux dossiers `wn-repro-imp-*`.

## 7. Prochaine action exacte

1. Verdicts de la revue `wn-reviewer` au §3, T1 complet, commit, push, PR (`--body-file`), `wn-attendre-ci` en fond.
2. PR-Agent → 0, verdict cité pour chaque focus area (garde 26).
3. « prête @<sha> » sur la PR et au registre (boîte `integrateur`), puis plus aucune écriture sur la PR (D-546).
   Note pour l'intégrateur : un crochet est touché, T1 après l'avance de la copie principale.
4. Ensuite, le piège suivant : « crochets de la copie principale en retard ».

## 8. Interdits encore actifs

- Ni migration, ni schéma, ni clinique, ni donnée patient. Pas de `prisma format`.
- Rien d'édité dans `web/src/lib/clinical/`. Aucune écriture en production ; aucun `workflow_dispatch` de
  `release-db`.
- Ne jamais supprimer une ligne des registres. Pas de compaction du journal (gel `D-372` §2).
- `orchestrateur/arret` : seule la parole du responsable le change.
- Aucune adresse de page privée dans le dépôt. Horodater en lisant l'heure système.
