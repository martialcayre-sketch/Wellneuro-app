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
  n'y balaie de source. La garde est reproduite puis vérifiée :
  - avant, sur l'arbre d'`origin/main` : 1 test rouge sur 10 ;
  - après, sur l'arbre de la branche : 10 sur 10.
- **Durcissements de la revue `wn-reviewer`** :
  - `dereference` : un client de la source lui-même relié serait sinon
    recopié en lien, et le défaut reviendrait. Une copie qui n'est pas un
    dossier est refusée en clair, soit « indéterminé ».
  - Les gardes « déjà présent dans l'arbre » lisent par `lstatSync` et non
    plus par `existsSync`. Un lien cassé suivi par une PR, à la place du
    client ou d'un dossier parent, leur échappait : `cpSync` abattait alors le
    processus, sans verdict ni nettoyage. Il rend désormais « indéterminé ».
- **Banc** (`scripts/wn-controle-fusion.test.mjs`) : quatre cas neufs.
  - Le client est un vrai dossier dans l'arbre extrait, avec le contenu de la
    source ; la source n'est pas touchée ; `node_modules` reste un lien.
  - Un client de la source relié est copié en vrai dossier.
  - Un lien cassé suivi à `web/src/generated/prisma`, puis à
    `web/src/generated`, rend « indéterminé ».

  Chaque mutation inverse (lien remis, `dereference` retiré, `existsSync`
  remis à l'un ou l'autre endroit) fait rougir son seul cas.
