### Contrôle de fusion : le client Prisma généré est copié dans l'arbre extrait, et la garde des importeurs de la bibliothèque n'y rougit plus (autonomie-pieges-restes, partie 11, 2026-11-22)

Signalé par l'intégrateur au merge de #2301 :
`web/src/lib/bibliotheque-options/importeurs.guard.test.ts` rougissait sur
`main` dans quatre contrôles de fusion d'affilée (#2296 à #2299), et passait
rejouée seule. On croyait à un délai sous charge. Ce n'en était pas un.

- **Cause** : `scripts/wn-controle-fusion.mjs` posait
  `web/src/generated/prisma` dans l'arbre extrait en lien symbolique vers la
  copie source. La garde (D-480 §8) suit les liens comme le bundler, et le
  client se résolvait donc hors de l'arbre (`../…`), sans être balayé.
  L'assertion anti-vacuité « le client Prisma généré est atteint » rougissait
  en moins d'une seconde, rejouée seule comprise. Sur un vrai checkout, le
  client est un vrai dossier, d'où le vert du CI et du rejeu à la main.
- **Pourquoi ce n'était pas qu'un bruit** : le test qui rougissait est celui
  qui refuse un nouveau lecteur de la bibliothèque. Rouge à l'identique sur
  `main`, il était classé « préexistant, non imputable ». Une PR qui aurait
  ajouté un lecteur aurait rougi sous la même signature et passé le contrôle.
  Le CI, qui joue la garde sur un vrai checkout, restait la seule barrière.
- **Correctif** : le client est copié dans l'arbre extrait (`cpSync`,
  `COPYFILE_FICLONE`, soit un clone APFS ou un reflink quand le système le
  permet, et une copie sinon). `node_modules` reste relié, puisque aucun banc
  n'y suit d'import. Reproduit puis vérifié sur l'arbre d'`origin/main` :
  - avant : 1 test rouge sur 10 ;
  - après : 10 sur 10.
- **Banc** (`scripts/wn-controle-fusion.test.mjs`) : un cas neuf vérifie, dans
  l'arbre extrait, que le client est un vrai dossier, qu'il a le contenu de la
  source et que la source n'est pas touchée, et que `node_modules` est
  toujours un lien. Remettre le lien symbolique fait rougir ce cas seul.
