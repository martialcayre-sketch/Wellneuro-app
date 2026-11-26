### Banc de `scripts/repo-hygiene.sh` (2026-11-25)

La passe cloud de l'orchestrateur joue `repo-hygiene.sh audit-only` chaque
jour (`ORCHESTRATEUR_PASSE.md` §5), et le mode `apply-safe` du même script
déplace des fichiers et réécrit des références par `sed -i`. Aucun banc ne
le couvrait. `scripts/repo-hygiene.test.mjs` le joue sur un dépôt git
jetable, avec cinq tests. Le premier vérifie qu'`audit-only` ne touche ni
à l'arbre (à l'octet, dossiers compris, hors du dossier de sortie ignoré),
ni à l'état git, ni à HEAD, ni aux références, ni à ce qui est hors de
`--root`, et qu'il produit son rapport (doublons stricts et quasi-doublons,
scripts dormants). Les deux suivants : une commande inconnue, ou une
option inconnue d'`apply-safe`, rend 2 sans rien écrire. Le quatrième :
`--dry-run` annonce les déplacements sans déplacer ni modifier un seul
fichier. Le dernier est une contre-épreuve : `apply-safe` déplace les
fichiers suivis par `git mv` et les fichiers non suivis par `mv`, épargne
le contexte nommément gardé et réécrit chaque occurrence, sans jamais
toucher un témoin placé hors de `--root`. Le banc est inscrit à
`bancs-outillage-check` et à l'étape d'outillage du CI. Le comportement du
script est inchangé.
