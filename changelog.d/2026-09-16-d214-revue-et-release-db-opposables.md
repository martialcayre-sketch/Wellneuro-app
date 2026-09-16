### Les deux gestes que le vert ne montre pas deviennent opposables — `D-214` (2026-09-16)

Le registre grave ce que la règle posée le même jour met en service : **un
commentaire de revue n'est pas un check**, et **une migration mergée n'est pas
une migration appliquée**. L'entrée ne réarbitre rien — `D-087` et
`docs/DEPLOIEMENT_RELEASE_DB.md` restent la source, `D-120` est rappelé — et
n'exécute rien de neuf : `.claude/rules/pr-revue-et-release-db.md`, l'étape 6
bloquante de `/wn-merge` et les deux renvois corrigés vers le conteneur one-off
sont en service depuis `ad6c8057`.

Ce qu'elle ajoute est la **trace décidée** : pourquoi la règle existe (quatre PR
mergées sur CI vert le 2026-09-16, six constats laissés, quatre réels dont deux
défauts en production, aucun visible au CI), ce qu'elle rend obligatoire (trois
verdicts, aucun commentaire sans l'un d'eux), et ce qu'elle ne couvre pas.

Elle consigne aussi son **épreuve sur elle-même** : appliquée à la PR qui la
posait, la règle a rendu quatre constats retenus, dont deux visant le texte
qu'elle venait d'écrire — une étape de merge devenue **circulaire** (aucune PR de
migration n'aurait plus pu être mergée), un renvoi qui **avouait son impuissance**
au lieu de la fermer —, plus une lecture d'API tronquée à 30 commentaires aux
deux endroits. Et deux faits constatés en chemin, écrits dans la règle : Copilot
**revoit une fois, à l'ouverture** (le `POST` REST sur `requested_reviewers` ne
l'enregistre pas), et `wn-attendre-ci` enchaîné à un `push` rend `0` **sur la
tête précédente**.

Le fichier de règle cite désormais sa décision, comme le registre cite ses
fichiers.
