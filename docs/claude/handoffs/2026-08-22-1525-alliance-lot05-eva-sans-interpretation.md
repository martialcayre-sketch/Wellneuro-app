# 2026-08-22 15:25 — Alliance 6.0-A LOT-05 : l'EVA entre par la voie cabinet, sans jamais classer

## Ce qui a changé

- **`D-087` au registre** — la garde « tout instrument du cabinet porte une
  grille complète et couvrante » est **relâchée pour une famille déclarée, et
  pour elle seule** : `sum_no_interpretation`. Les trois familles qui
  concluent (`sum`, `sum_reversed`, `count_threshold`) sont inchangées au
  caractère près ; leurs bancs sont verts sans modification.
- **La contrepartie est une garde inverse, plus stricte** : sur cette famille,
  une bande — une seule, même « neutre », même couvrante — est **refusée** aux
  quatre points d'appel de `validerInstrumentCabinet`. L'item `number` borné
  y est admis, `min`/`max` **déclarés** obligatoires ; il reste refusé
  partout ailleurs.
- **Le moteur n'a pas bougé d'une ligne.** `sum_no_interpretation` existe dans
  `questions.ts` depuis le catalogue Drive (`Q_MOD_01`, `Q_MOD_02`) et rend
  `interpretation: null`. **Aucune migration** : les colonnes Json suffisent.
- **Écran de relecture** : plus de crash sur une grille absente (`.map` gardé
  aux deux endroits que le typage a fait apparaître) ; la relecture affiche
  l'énoncé et ses ancres, déclare « Aucune interprétation : cet instrument
  pilote la conversation, il ne classe pas », publie sous « Relu — publier ».
  L'éditeur **refuse** cette famille au lieu de lui poser une amorce de bande.

## Le piège du lot, et où il était

Ce n'était pas la grille absente, c'était la **grille par défaut**. Trois
sites posent une bande unique « Grille à définir — relecture requise »,
colorée `warning`, quand la grille manque : `scoringParDefaut`, l'amorce de
l'éditeur et l'import. Sur un instrument qui ne classe pas, ce libellé
d'attente est un verdict de fait. La garde nommée `interditTouteBande` vit
dans **`@/lib/echelles-cabinet`** (module feuille, sans Prisma) et non dans
`@/lib/instruments` : la Bibliothèque est un panneau **client**, et importer
`instruments.ts` y aurait embarqué Prisma dans le bundle navigateur — le
module feuille existe déjà pour cette raison, son en-tête le dit.

## À savoir pour la suite

- **Réserve fermée par banc** : `sum_no_interpretation` n'émet ni `missing` ni
  `repondus` (contrairement à `sum`). La complétude d'un recueil de cette
  famille n'est tenue que par la garde d'`api/patient/submit` — assertée, et
  rouge à son débranchement. Tout futur consommateur qui lirait `missing` sur
  un instrument du cabinet doit le savoir.
- **L'entrée d'une EVA se fait par import JSON** (shape complète : items
  `number` bornés + `scoring: { type: 'sum_no_interpretation' }`), pas par
  l'éditeur — celui-ci ne sait écrire que des likert sur échelle nommée et des
  bandes contiguës, il détruirait l'instrument des deux côtés.
- **Non fait, volontairement** : aucune surface de **trajectoire** (les
  passations successives d'une même EVA côte à côte). Le lot pose la voie et
  les gardes ; la restitution reste celle qui existe — valeur, `—` en
  interprétation, badge « Cabinet — scoring non vérifié ».
- L'union discriminée `ScoringCabinet` rend `interpretation` **optionnel** :
  tout nouveau consommateur devra le garder (`?? []`). C'est voulu — le typage
  a trouvé les deux crash latents à notre place.

## Ouvert

- PR du lot non ouverte : c'est la session principale qui la crée après revue.
- **`decisions-check` est ROUGE sur cette branche, et c'est attendu** :
  `D-086` est réservé à la PR en vol #748 (`alliance-6a/lot-01`, ouverte), qui
  ne l'a pas encore mergée. Le garde refuse un **trou** dans la suite —
  « D-086 manque entre D-001 et D-087 ». Deux conséquences opposables :
  **cette PR se merge APRÈS #748**, et son CI ne peut pas être vert avant. La
  seule autre issue serait de prendre `D-086`, c'est-à-dire la collision que
  le garde existe pour empêcher (précédent `D-013`/`D-014`).
