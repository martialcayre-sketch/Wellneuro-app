### Outillage — le pointage ne stocke plus ce qui se recalcule, et cesse de conflicter

- **`next_action` devient un tableau de lignes.** Il tenait sur **une seule
  ligne** de 6 023 caractères : deux branches qui le modifiaient conflictaient à
  tous les coups, sans fusion possible. Découpage mécanique aux frontières de
  phrase (31 lignes), réversible au caractère près — joindre par un espace
  redonne la chaîne d'origine. Preuve du gain : deux branches modifiant des
  passages différents **conflictent** dans l'ancienne forme et **fusionnent
  proprement** dans la nouvelle. Les lecteurs acceptent les deux formes, aucune
  migration coordonnée n'est requise.
- **Le bloc `git` sort de `.wn/state.json`.** Il ne pouvait pas être vrai :
  `--appliquer` s'exécute *avant* le commit, donc `dirty` valait toujours `true`
  — démenti par ce commit —, et `branch`/`last_commit` nommaient la dernière
  session à avoir lancé la commande, parfois le worktree d'une autre. Le LOT-01
  (#575) avait identifié le piège et l'avait contourné en repoussant le geste
  après le merge ; il est supprimé à la source. `analyserPointage` et ses quatre
  cas disparaissent avec lui : sans stockage, il n'y a plus de dérive à
  signaler. `wn-etat-reel.mjs` perd ses deux comparaisons `git.*` et garde
  `validation.last_checked_at`.
- **Une seule voie d'écriture, atomique.** `wn-campaign.mjs` portait sa propre
  copie de `readMachineState`/`writeMachineState` avec un `writeFileSync`
  direct : la garantie d'atomicité posée la veille ne couvrait pas l'écrivain le
  plus fréquent du fichier. Il importe désormais `wn-state.mjs`.
- **`reparer()` est exporté et couvert** (5 cas : bloc `git` retiré, état déjà
  sans bloc, `updated_at`, champs de campagne intacts, idempotence). La fonction
  qui écrivait ces champs n'était testée par rien.

Correction au diagnostic initial : les conflits venaient de `next_action`, pas
des champs `git.*`. Et la revue Copilot mettait en cause
`wn-github-orchestrator.mjs` — à tort : il construit son bloc `git` en direct
depuis `git status` et n'a jamais lu le fichier de pointage pour cela.
