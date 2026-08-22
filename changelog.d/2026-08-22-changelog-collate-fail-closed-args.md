### `changelog-collate.mjs` refuse les arguments inconnus — le mode destructeur n'est plus le défaut (2026-08-22)

Le CLI ne connaissait qu'un argument (`--dry-run`) ; tout le reste —
`--check`, `--verify`, une faute de frappe — tombait dans le mode APPLIQUER,
qui écrit `CHANGELOG.md` puis **supprime** les fragments, sans confirmation.
Une revue l'a déclenché le 2026-08-22 en croyant vérifier : 407 fragments
consommés dans un worktree (restaurés par `git restore`, rien de committé).

- L'analyse d'arguments devient une fonction pure exportée (`analyserArgs`),
  fail-closed : un argv inconnu jette, le CLI sort en code 2 avec l'usage —
  comme un drapeau inconnu ferme.
- Quatre cas au banc, sur la fonction pure — spawner le CLI réel jouerait
  contre le vrai dépôt, exactement le risque que ce garde ferme.
- Comportements légitimes inchangés : sans argument le script applique,
  `--dry-run` simule.
