# tools/supplements/ingest — Voie d'ingestion du catalogue C4A

Client de la route interne `POST /api/internal/supplements/ingest`. Même famille
que `tools/corpus/ingest/` : scripts Node `.mjs` autonomes, données **hors
dépôt**, secret lu depuis l'environnement (jamais en dur, jamais affiché).

Poste les fiches produit normalisées (sortie NDJSON de `../import/parse.mjs`) en
**brouillons** du catalogue (`statut_fiche = 'importee'`, décision n°11 du moteur
d'intention clinique). La route valide, force le statut brouillon et garantit
l'idempotence ; elle n'écrit jamais `verifiee`/`inactive` ni de champ de
vérification.

## Usage

```bash
# Production (POST vers la route) — secret dans l'environnement, jamais en dur
export SUPPLEMENTS_INTERNAL_SECRET=…            # ≥ 32 caractères
node ingest.mjs --url https://app.wellneuro.fr  # lots ≤ 500
node ingest.mjs --dry-run                        # inspection, aucun POST, aucun secret lu

# Preuve dev-locale (Postgres éphémère, réplique directe de la logique serveur)
node ingest-devlocal.mjs \
  --fiches ~/.wellneuro/supplements/normalized/fiches.ndjson \
  --pgurl postgresql://$(whoami)@localhost:55434/wn_supplements_ingest
```

`ingest-devlocal.mjs` applique `ddl-catalogue-devlocal.sql` (miroir fidèle de la
migration `20260724133000_c4_supplement_product_catalogue`, plus un squelette
minimal `supplement_ingredients`/`_formes` comme cibles de FK), importe, prouve
l'idempotence (ré-import → tout `inchangee`) et démontre le versionnage
(dose modifiée → nouvelle `version_formulation` + pointeur déplacé, versions
antérieures conservées). Refuse toute cible non locale.

## Idempotence et versionnage

Chaque fiche porte une empreinte déterministe `contenu_sha256` (attributs
sourcés + composition + doses, insensible à l'ordre des composants). Un pointeur
`supplement_product_versions_courantes` désigne la version courante d'un produit
source. Ré-import à empreinte identique → **no-op**. Empreinte différente →
nouvelle `version_formulation` **et** déplacement du pointeur, dans la même
transaction.

## Point d'interprétation — composition et résolution clinique

Le schéma catalogue lie chaque composant au pivot clinique
`supplement_ingredients` par **FK** (`ingredient_id`). Or la composition
Compl'Alim est **nominative** (noms de plantes/substances, non résolus). La
résolution nominatif → ingrédient est un geste **aval** (LOT-03, moteur de
résolution). En conséquence, `ingest.mjs` importe les fiches Compl'Alim en
brouillon **sans ligne de composition** ; celle-ci est attachée à la résolution.
La route et l'empreinte **supportent** les compositions (chemin
`saisie_praticien` ou imports déjà résolus) — c'est ce que démontre
`ingest-devlocal.mjs`.
