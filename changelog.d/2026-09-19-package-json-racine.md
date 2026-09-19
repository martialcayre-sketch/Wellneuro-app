### Les paliers de validation se lancent depuis la racine du dépôt (2026-09-19)

`npm run check` et `npm run test:worktree` n'étaient définis que dans
`web/package.json`. Lancés depuis la racine du dépôt — le répertoire courant
habituel d'une session en worktree —, ils rendaient 254 avec « missing script ».
Un `package.json` racine les réexpédie désormais.

**Le motif n'est pas le confort, c'est un faux vert.** Une tâche de fond a
rapporté ce 254 comme « exit code 0 », et le palier a été cru passé alors qu'il
n'avait jamais démarré. La règle « T2 se lance depuis `web/` » était écrite
depuis des semaines ; elle a mordu trois fois en deux jours, dont une à
l'intérieur même du handoff qui la décrivait. Une règle oubliée deux fois ne se
réécrit pas une troisième : elle devient exécutable.

**Ce fichier ne déclare aucune dépendance, et un banc refuse qu'il en reçoive.**
Une seule ferait naître un `package-lock.json` à la racine au premier
`npm install` — et Next.js infère sa racine de traçage depuis le lockfile le plus
proche, donc le build changerait de périmètre sans que rien ne le dise. Le banc
garde aussi que chaque script réexpédié existe à destination, et que la commande
est **exactement** la réexpédition : un réexpéditeur qui diverge de son homologue
ferait croire qu'on a lancé le palier alors qu'on en a lancé un autre.

**Le déploiement n'est pas touché**, et cela a été vérifié avant d'écrire :
Scalingo porte `PROJECT_DIR=web` et descend donc dans `web/` avant toute
détection de buildpack ; le CI travaille en `working-directory: web` à chaque
étape ; aucun `package-lock.json` n'existe à la racine.
