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
| `transporter.mjs` | **Le transport.** Même résolution que `projeter.mjs`, mais met en forme le payload et l'envoie à `/api/internal/supplements/compositions`. `--dry-run` par défaut — voir « Transporter réellement » plus bas. |
| `transporter.test.mjs` | Banc `node --test`, câblé au CI **et** à `npm run check` : découpage en lots, arrêt de série sur un lot refusé, absence de connexion en dry-run, refus d'un envoi sans secret, garde deux clés sur la cible, anti-dérive des deux bornes de lot. |

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

## Ce que `projeter.mjs` ne fait pas

Il n'écrit rien, n'ouvre aucune connexion, ne lit aucun secret. C'est
`transporter.mjs`, ci-dessous, qui fait l'envoi — et seulement sur demande
explicite (`--envoyer`).

Il ne crée pas non plus les **formes dérivées** (partie × préparation d'une
plante, souche d'un micro-organisme) : il les **compte**. Le référentiel ne les
engendre pas — seules comptent les combinaisons réellement déclarées, et les
inventer d'avance produirait des milliers de formes que personne n'emploie.
`transporter.mjs` ne les crée pas non plus : c'est un lot séparé, hors
périmètre de celui-ci.

## Transporter réellement — `transporter.mjs`

Le frère mince de `projeter.mjs` : même lecture, même index, même résolution
(`lib/resolution.mjs`, inchangé). Ce qu'il ajoute : la mise en forme du payload
attendu par `parseCompositionsPayload`
(`web/src/lib/supplement-library/compositions.ts`), le découpage en lots d'au
plus `SUPPLEMENTS_MAX_BATCH_SIZE` (500) produits, et l'envoi à
`/api/internal/supplements/compositions`.

### Mesurer — `--dry-run`, le défaut

```bash
cd tools/supplements/compositions
node transporter.mjs                              # pleine échelle, aucun envoi
node transporter.mjs --limite 5000 --exemples 50   # passe rapide
```

Sans `--envoyer`, **aucune connexion réseau n'est ouverte** — pas d'option pour
le faire par erreur. La sortie imprime le chiffre qui compte : combien de
fiches passeraient de « coquille » à « composition connue » (au moins une ligne
résolue), la couverture par catégorie, et un échantillon des libellés inconnus
les plus fréquents.

Elle imprime aussi les **doublons intra-fiche, séparés en deux nombres** :
identiques (même ingrédient, même forme, même dose, même unité) et divergents
(dose ou unité différente). La distinction n'est pas cosmétique — elle décide du
dénominateur. Un doublon identique n'emporte aucune information et **sort** de
`sourceLignes` ; un doublon divergent emporte une dose que rien ne réécrira et
**y reste**, pour que la fiche demeure « partielle » plutôt que de servir
« Compatible » sur une quantité sous-évaluée. La contrainte
`@@unique([productId, ingredientId, formeId])` impose d'écarter la ligne dans
les deux cas ; c'est le dénominateur, et lui seul, qui dit la vérité à l'écran.

### Envoyer réellement

```bash
SUPPLEMENTS_INTERNAL_SECRET=<secret> \
SUPPLEMENTS_TRANSPORT_HOTE=app.wellneuro.fr \
  node transporter.mjs --envoyer --url https://app.wellneuro.fr
```

**`SUPPLEMENTS_INTERNAL_SECRET` — même variable que `referentiel/ingest.mjs` et
`ingest/ingest.mjs` : une voie d'ingestion interne, un secret.** Jamais en
argument de ligne de commande (visible des autres processus sur la machine),
jamais affiché. `--envoyer` sans ce secret, ou sans `--url`, est un **refus
nommé sur stderr avec `exit 1`** — jamais un envoi silencieux, jamais un
dry-run silencieux.

### La garde deux clés — `SUPPLEMENTS_TRANSPORT_HOTE`

`--url` seul ne garde rien : une lettre de différence et ce sont 138 728
produits écrits en production sans qu'un mot l'ait annoncé. `--envoyer` exige
donc `SUPPLEMENTS_TRANSPORT_HOTE` dans l'environnement, qui doit **nommer
l'hôte de `--url`** ; sinon refus nommé sur stderr et `exit 1`, avant toute
lecture de fichier et sans qu'aucune connexion s'ouvre. Trois refus distincts :
`--url` illisible, variable absente, variable discordante.

**La contre-clé est dans l'ENVIRONNEMENT, et c'est là toute la garde.** Une
première version demandait un second argument (`--hote`) : deux clés sur la même
ligne de commande, dont la seconde se dérive de la première par un copier-coller.
Elle n'attrapait qu'une faute de frappe, jamais une erreur de cible — celui qui
écrit `--url https://app.wellneuro.fr` en croyant viser le staging écrit
`--hote app.wellneuro.fr` juste après, et les deux clés concordent.

Même motif que `--base` dans `web/prisma/importNabm.ts`, y compris le détail qui
le fait tenir : l'argument y est confronté à une **variable d'environnement**
(`MIGRATE_DATABASE_URL`), pas à un second argument. La variable se pose avec le
secret, dans le shell de la cible, une fois — pas au moment où l'on tape la
commande. Il n'y a **aucune allowlist de domaine**, qui n'aurait interdit que
les cibles qu'on n'a pas encore eu besoin d'ajouter : ce qui garde, c'est la
**concordance de deux clés posées à deux moments différents**.

### Version de formulation

`--version-formulation` est **facultatif et sans défaut**. Omis — le cas
nominal —, le champ n'est pas envoyé et le serveur écrit sur la version
**courante** du produit, celle que désigne le pointeur
`supplement_product_versions_courantes`. Ne le poser que pour une reprise visant
sciemment une version précise.

Un défaut en dur (`1`) écrirait, après la première réingestion d'une fiche, sur
une ligne que le catalogue ne sert plus : l'écriture réussit, le bilan la compte,
la fiche reste une coquille à l'écran. Échec silencieux, sans ligne fautive.

**Le critère du catalogue en pose DEUX, pas une.** `construireWhere`
(`catalogue.ts`) exige le pointeur **et** `statutFiche != 'inactive'` — une
fiche inactive n'est servie par aucun écran. Le serveur applique donc les deux :
une composition proposée sur une fiche inactive est **sautée et nommée** dans
`produitsIncomplets`, jamais comptée en `produitsEcrits`. Une version antérieure
n'appliquait que le pointeur et affirmait pourtant reprendre « exactement le
critère » ; `transporter.test.mjs` relit désormais les deux fichiers et rougit
si l'un bouge sans l'autre.

### Ce que l'envoi laisse derrière lui

**Cet envoi ÉCRIT en base — en production si l'URL passée en pointe une.**
Chaque produit s'écrit dans sa propre transaction ; un lot refusé (HTTP non-2xx)
**arrête la série** et nomme le lot, son rang et la raison rendue par la route —
il ne se saute jamais. L'écriture est idempotente et append-only côté serveur
(voir `ingestCompositions`) : rejouer le même lot après correction ne duplique
rien.

Un lot interrompu **ne rend aucun inventaire** de ce qu'il avait commité avant de
s'arrêter, et n'en promet pas : le stderr affiche le cumul des lots **acceptés**
(`cumulLotsPrecedents`), puis dit le geste — corriger la cause, **rejouer depuis
le début**. L'idempotence rend cet inventaire inutile ; un produit déjà écrit
revient en `produitsInchanges`.

**Ce que le rejeu répare, et ce qu'il ne répare pas.** Sur des lignes
identiques, le rejeu corrige `composition_source_lignes` s'il diverge, et le
compte à part (`produitsDenominateurCorrige`) — c'est une colonne scalaire du
produit, pas une ligne de composition, la corriger ne viole aucun append-only.
Sans ce chemin, un **dénominateur écrit faux serait définitif** : le rejeu
revenait en `produitsInchanges` sans y toucher, et l'append-only interdisait de
reprendre les lignes. Ce qu'il ne répare pas : des **lignes** divergentes, qui
restent une reformulation et se déposent sous une nouvelle
`versionFormulation`.

## Provenance et licence

`declarations.csv` est publié sous **Licence Ouverte v2.0 (Etalab)**. Le
référentiel moissonné via l'API, lui, n'est publié sous **aucune licence
énoncée** : son cache est en `.gitignore` et ne doit jamais être committé — voir
`tools/supplements/referentiel/README.md`.
