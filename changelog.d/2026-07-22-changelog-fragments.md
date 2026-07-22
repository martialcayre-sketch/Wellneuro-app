### Les entrées de changelog passent par des fragments (2026-07-22)

Le `CHANGELOG.md` a produit un conflit de merge sur **chacune** des cinq PR de
l'audit 5.0 du 2026-07-21, toujours le même : deux PR insèrent leur entrée sous
`## Non publié`, au même endroit du même fichier. Le conflit n'a jamais rien à
voir avec le contenu — c'est un conflit d'insertion, purement mécanique, et il se
reproduira à chaque paire de PR parallèles.

Désormais chaque évolution pose **un fichier dans `changelog.d/`** au lieu
d'éditer le haut de `CHANGELOG.md`. Deux PR ne touchent plus jamais le même
chemin : le conflit disparaît. Un script les replie dans `CHANGELOG.md` au moment
de consolider.

- **`changelog.d/`** — un fragment par entrée, `AAAA-MM-JJ-slug.md`, dont le
  contenu est exactement le bloc `###` qui irait sous `## Non publié`. Le nom de
  fichier n'apparaît pas dans le rendu ; il ne sert qu'à éviter la collision et à
  ordonner.
- **`scripts/changelog-collate.mjs`** — replie les fragments en tête de
  `## Non publié`, le plus récent d'abord, puis les supprime. `--dry-run` montre
  le résultat sans rien écrire. Logique pure et testée
  (`node --test scripts/changelog-collate.test.mjs`, 7 cas).
- **L'historique déjà écrit ne bouge pas.** La convention ne vaut que pour les
  entrées à venir ; `CHANGELOG.md` reste la référence lisible.

Ce que la convention **ne** résout pas, et c'est écrit dans le README du
répertoire : elle supprime le conflit d'insertion, pas un désaccord réel où deux
PR décrivent la même chose. La documentation d'une modification clinique ou de
seuil reste exigée — ici plutôt que dans `CHANGELOG.md` —, et la relecture
humaine reste la garantie.
