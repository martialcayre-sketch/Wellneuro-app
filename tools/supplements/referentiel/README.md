# Référentiel d'ingrédients — moisson et ingestion

Peuple `supplement_ingredients` et `supplement_ingredient_formes` depuis le
référentiel officiel **Compl'Alim** (DGAL).

## Pourquoi passer par la source officielle

La relation ingrédient × forme y est **explicite** ; elle n'est jamais déduite du
libellé. Ce n'est pas une commodité, c'est une garde clinique : une lecture
syntaxique de « Hydrogénosélénite de sodium » conclut au **sodium**, alors que le
nutriment est le **sélénium**. Même piège pour « iodure de potassium » (l'iode) et
« D-pantothénate de calcium » (la vitamine B5 — et du calcium, deux ingrédients pour
une ligne).

Couverture mesurée le 2026-07-31 : **100 %** des 883 libellés chimiques, 1 021 espèces
végétales et 61 micro-organismes employés par les 140 148 fiches du catalogue.

## Provenance et licence — à lire avant de rediffuser

| Ressource | Régime |
| --- | --- |
| `declarations.csv` (data.gouv) | Licence Ouverte v2.0 (Etalab) |
| Code du service Compl'Alim | MIT, © 2022 beta.gouv.fr |
| **Référentiel via l'API** | **aucune licence énoncée** |

Le référentiel n'est publié ni sur data.gouv ni dans les fixtures complètes du dépôt
(celles-ci s'arrêtent à 299 entrées par type). Son contenu transcrit des annexes
réglementaires, mais **aucun texte de licence ne le dit**. L'intégration a été décidée
par le praticien le 2026-07-31 en connaissance de cette lacune. À réexaminer si le
régime est un jour publié.

## Usage

```bash
# 1. Moissonner (~20 min, ~4 requêtes/s, reprise possible)
node moisson.mjs ./referentiel

# 2. Vérifier la projection sans rien envoyer
node ingest.mjs --dry-run --source ./referentiel

# 3. Ingérer
export SUPPLEMENTS_INTERNAL_SECRET=…      # jamais en argument de commande
node ingest.mjs --url https://app.wellneuro.fr --source ./referentiel
```

## Politesse envers un service public

`moisson.mjs` s'y tient, et toute modification doit s'y tenir :

- une requête à la fois, jamais de parallélisme ;
- 250 ms entre deux appels ;
- `User-Agent` identifiant par le domaine de l'application, **sans donnée
  personnelle** ;
- pause de 15 s sur `429` ou `5xx` — le service demande de ralentir, on obéit —
  puis **abandon après 8 ralentissements consécutifs** sur le même identifiant :
  une maintenance prolongée ne doit pas faire boucler le script indéfiniment
  contre le service ;
- **reprise sur cache**, jamais relance : un arrêt ne refait pas le travail déjà fait.

L'API ne propose pas d'énumération : on parcourt les identifiants (les trous rendent
404) ; `POST /search/` refuse les termes courts et ne permet pas d'énumérer non plus.

Les identifiants **absents** sont donc mémorisés eux aussi, dans
`ref-<type>.absents` à côté du `.ndjson`. Sans cela la reprise n'en serait pas
une : sur `plants`, parcouru de 1 à 2 200 pour ~1 021 fiches, un arrêt coûterait
~1 179 requêtes refaites — exactement ce que la politesse cherche à éviter.

## Le verrou de l'étape 3 — levé le 2026-07-31

L'ingestion pose plusieurs milliers d'ingrédients `actif = true`. L'atelier de
règles (`/dashboard/regles`) servait **tout** le vocabulaire actif dans un
`<select>` nu : sur un pivot vide c'était sans conséquence, sur le référentiel
entier le praticien n'aurait plus pu désigner son ingrédient. **Le sélecteur
devait précéder l'ingestion ; c'est fait** (PR #499) — recherche servie par le
serveur, bornée à `INGREDIENTS_MAX` (50), et hydratation ciblée par
`ingredientId` pour les formes d'une règle existante.

Deux réserves restent ouvertes, à juger sur la donnée une fois ingérée :

- le tri est alphabétique sur un `contains`, pas un `startsWith` — « calcium »
  fait remonter « Acide … de calcium » avant « Calcium » ;
- aucun E2E ne couvre `/dashboard/regles`. Une passe Playwright n'a de sens
  qu'**après** l'ingestion : sur des tables vides, l'écran affiche en permanence
  « Aucun ingrédient ne correspond ».

## Ce que ces outils n'écrivent pas

Ni règle clinique, ni seuil, ni alerte de sécurité. Le vocabulaire n'est pas le
jugement — et une entrée retirée en amont **n'est pas désactivée** ici : c'est un
geste praticien signé.

Les formes des **plantes** (partie × préparation) et des **micro-organismes**
(souche) ne sont pas engendrées : seules comptent les combinaisons réellement
déclarées, que seul le transport des compositions connaît. Les inventer d'avance
produirait des milliers de formes que personne n'emploie.
