### H89, PR (a) : contrôle sur l'arbre fusionné et signal de chevauchement (D-373 §4, 2026-10-28)

- Nouveau contrôle en lecture seule, `node scripts/wn-controle-fusion.mjs <N>
  [--source <dossier>]`. Il ne fait ni checkout, ni merge, ni push ; seule
  `origin/main` bouge, par `git fetch`.
  - Il ne joue que si `main` a bougé depuis la base de la PR (l'ancêtre
    commun, la lecture la plus stricte). Il ne lit pas le CI de `main` : une
    PR qui répare `main` passe sans `main` vert.
  - L'arbre fusionné vient de `git merge-tree --write-tree`. Un conflit est
    un défaut, et un conflit que GitHub voit aussi (`mergeable` à faux), car
    `merge-tree` applique `merge=union` et GitHub non.
  - L'empreinte d'environnement (verrou installé, schéma du client Prisma)
    est vérifiée avant de relier `node_modules` ; un écart rend
    « indéterminé ».
  - Les gardes de la liste explicite tournent sur l'arbre extrait par
    `git archive` dans un dossier temporaire indexé : numérotation, matrice,
    invariants du CI, bancs `*.guard.test.*` et douze bancs de balayage.
  - Un rouge ne suffit pas. Il est rejoué seul sur l'arbre fusionné : s'il
    repasse au vert, il est instable et rend « indéterminé ». Il est ensuite
    rejoué sur `main` seul. Le défaut tient dans trois cas : vert sur `main`,
    absent de `main`, ou un test ou une violation de plus que sur `main`.
    Sinon il est préexistant, non imputable.
  - Codes : `0` sain ou non requis, `1` défaut, `2` indéterminé, `3` usage.
    Les verdicts déterminés sont mis en cache par couple (`main`, tête) et par
    version du script. La ligne `CONTROLE` porte `requis`, `cache`, `rouges`,
    `preexistants` et la durée, pour la mesure des trente passages.
- Nouveau signal, `node scripts/wn-chevauchement.mjs <N>`. Il liste les PR
  ouvertes qui touchent les mêmes fichiers de code et résume à part les
  documents (`*.md`) communs. Il sort toujours en `0`, lecture impossible
  comprise.
- Deux bancs, enregistrés dans `bancs-outillage-check`. Celui du contrôle
  monte un vrai dépôt Git, avec une origine et une tête poussée seulement en
  `refs/pull/N/head` depuis un autre clone, pendant que `main` avance. Il
  exige aussi que tout banc Vitest qui balaie une arborescence soit un
  `guard` ou figure dans la liste.
- `wn-merge` n'appelle pas encore ces scripts : c'est la PR (b) de H89.
  Aucune décision nouvelle, aucune migration, aucun chemin clinique.
