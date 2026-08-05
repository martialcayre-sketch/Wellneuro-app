# tools/supplements/compositions — transport des compositions vers le pivot

Dernier maillon du rayon compléments : `supplement_product_compositions` est
**vide en production** (140 148 produits, 0 composition), et c'est ce qui laisse
les fiches à l'état de coquilles.

Ce dossier contient **la décision**, pas encore l'écriture :

| Fichier | Rôle |
|---|---|
| `lib/resolution.mjs` | Résout un libellé de composition vers le référentiel, normalise dose et unité. Aucune E/S. |
| `lib/resolution.test.mjs` | Banc `node --test`, câblé au CI et à `npm run check`. |
| `projeter.mjs` | Produit le **rapport de couverture**. N'écrit nulle part, et n'a aucune option pour le faire. |

## Pourquoi l'appariement se fait par libellé

Partout ailleurs dans C4, on apparie par `source_identifiant`, et un invariant
du dépôt dit « jamais par le libellé ». Ici il n'y a pas d'identifiant à suivre :
les cinq colonnes de composition de `declarations.csv` ne portent **que du
texte** — vérifié sur le schéma officiel et sur les 151 Mo du fichier, zéro
occurrence de clé `id` dans les objets embarqués.

L'invariant n'est pas contourné, il est inapplicable. Sa raison, elle, demeure,
et elle est honorée autrement : vocabulaire source **clos et fini** (1 965
libellés distincts pour 580 892 lignes), correspondance **exacte** (jamais un
`contains`, jamais d'approché), et tout ce qui ne se résout pas d'une seule
façon **n'est pas écrit** — il est rapporté.

## Les trois règles de résolution

1. **L'ingrédient direct l'emporte.** « Huile de poisson » est à la fois
   `substance:716` et une forme d'apport rattachée à **sept** ingrédients (DHA,
   EPA, oméga 3, vitamine E…). Suivre la forme ferait déclarer au produit sept
   actifs que le fabricant n'a jamais déclarés — dans la table même qui
   alimentera la sentinelle de cumul. On n'invente pas de composition.
2. **Sinon la forme, si elle n'a qu'un parent.** « Acide L-ascorbique » n'est pas
   un ingrédient : c'est une forme d'apport de la vitamine C. On retient
   l'ingrédient **et** la forme, qui porte le détail clinique.
3. **Toute ambiguïté résiduelle n'est pas écrite.** 69 libellés de forme sur 568
   ont plusieurs parents (« D-pantothénate de calcium » apporte réellement le
   calcium **et** la vitamine B5) et 48 noms d'ingrédients sont homonymes
   (« miel » existe en `substance:696` **et** `form_of_supply:686`). Ces lignes
   sortent au rapport, avec leurs candidats.

Un filtre d'**espace de noms** double ces règles : une ligne `plantes` ne se
résout que vers une plante, y compris à travers le parent d'une forme. Sans lui,
un homonyme entre deux familles ferait déclarer un actif d'une tout autre nature
que celle que la source annonce.

## Dose et unité

La source déclare `quantité_par_djr` — par **dose journalière recommandée**, non
par unité de prise. La colonne s'appelle `dose_par_djr` depuis
`20260731200000_c4_composition_dose`, pour que son prochain lecteur — la
sentinelle de cumul — ne se trompe pas de grandeur.

- `ml` minuscule (19 330 lignes) est normalisé en `mL`. Deux graphies de la même
  unité en base, et la sentinelle comparerait des colonnes qu'elle croit
  distinctes.
- Un **micro-organisme** dosé sans unité est en `UFC`. Seule exception, et ce
  n'est pas une devinette : la colonne `micro_organismes` ne porte aucune clé
  d'unité sur ses 21 805 lignes, et le schéma officiel documente `cfu` pour ce
  champ. Sans cette règle, 21 478 dosages probiotiques seraient jetés.
- **On ne devine jamais rien d'autre.** 65 lignes portent un nombre sans
  grandeur, 18 une unité hors vocabulaire : elles s'écrivent sans dose. Un
  nombre auquel on aurait prêté « mg » serait une dose inventée.

Plus de la moitié des lignes de la source — `nutriments` et
`autres_ingredients_actifs`, 301 428 au total — sont des **chaînes nues** sans
quantité possible. Les vitamines et minéraux d'un produit arrivent donc
**toujours** sans dose : c'est structurel, et c'est le plafond de la sentinelle.

## Usage

```bash
# 1. Le référentiel, s'il n'est pas déjà en cache (~25 min, reprise sur cache)
cd tools/supplements/referentiel && node moisson.mjs ./referentiel

# 2. Les fiches normalisées, si elles ne sont pas déjà sur disque
cd tools/supplements && node import/parse.mjs

# 3. Le rapport — aucune écriture
cd tools/supplements/compositions
node projeter.mjs --rapport /tmp/couverture.md
node projeter.mjs --limite 5000 --exemples 50    # passe rapide
```

Options : `--fiches <ndjson>` (défaut
`~/.wellneuro/supplements/normalized/fiches.ndjson`), `--referentiel <dossier>`
(défaut `../referentiel/referentiel`), `--rapport <md>`, `--limite <n>`,
`--exemples <n>`.

L'outil résout contre **la même projection** que celle qui a peuplé la base :
`referentiel/lib/projection.mjs`, importée par les deux. Deux copies
divergeraient au premier ajustement, et le rapport porterait alors sur un
référentiel qui n'existe pas.

## Couverture mesurée — 2026-07-31

Sur les 140 148 fiches (141 388 lignes, 1 240 doublons d'identifiant écartés) :

| Catégorie | Lignes | Résolues | Ambiguës |
|---|--:|--:|--:|
| `plantes` | 238 811 | 238 271 (99,8 %) | 540 |
| `nutriments` | 193 199 | 174 400 (90,3 %) | 18 799 |
| `autres_ingredients_actifs` | 105 847 | 95 971 (90,7 %) | 9 876 |
| `micro_organismes` | 21 321 | 21 321 (100 %) | 0 |
| `substances` | 16 591 | 15 937 (96,1 %) | 654 |
| **total** | **575 769** | **545 900 (94,8 %)** | 29 869 |

**Aucun libellé n'est inconnu du référentiel.** Le résiduel est entièrement
constitué de **101 libellés ambigus**, liste finie et arbitrable à la main.

- Fiches dont toutes les lignes actives se résolvent : **118 007 (84,2 %)** — la
  seule population qui pourra un jour prétendre à `integre`.
- Fiches dont toutes les lignes dosables portent dose + unité : **103 087
  (73,6 %)** — le plafond de la sentinelle de cumul.
- Lignes écrivables : 545 900, dont **275 575 avec une dose (50,5 %)**.
- Formes dérivées à créer : **14 102** (plantes) et **5 806** (souches).
- Refus de dose : 300 111 `aucune_dose` (structurel), 65 `unite_absente`,
  18 `unite_hors_vocabulaire`.

En tête des ambiguïtés : « D-pantothénate de calcium » (6 979 lignes, calcium
**et** vitamine B5), « Sélénite de sodium » (2 701, sélénium **et** sodium),
« Iodure de potassium » (2 061, iode **et** potassium). Ce sont exactement les
exemples qui justifiaient « ne jamais lire le libellé » — le résolveur les refuse
au lieu de se tromper.

## Ce que cet outil ne fait pas

Il n'écrit rien, n'ouvre aucune connexion, ne lit aucun secret. Le transport
proprement dit — création des formes dérivées, envoi des compositions,
`composition_source_lignes` — est un lot séparé, qui demande un go explicite.

Il ne crée pas non plus les **formes dérivées** (partie × préparation d'une
plante, souche d'un micro-organisme) : il les **compte**. Le référentiel ne les
engendre pas — seules comptent les combinaisons réellement déclarées, et les
inventer d'avance produirait des milliers de formes que personne n'emploie.

## Provenance et licence

`declarations.csv` est publié sous **Licence Ouverte v2.0 (Etalab)**. Le
référentiel moissonné via l'API, lui, n'est publié sous **aucune licence
énoncée** : son cache est en `.gitignore` et ne doit jamais être committé — voir
`tools/supplements/referentiel/README.md`.
