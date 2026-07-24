# tools/supplements — Importeur Compl'Alim → brouillons C4A

Outillage **hors runtime** (aucune dépendance à `web/`), même famille que
`tools/corpus/` : scripts Node `.mjs` autonomes, données et bases de travail
**hors dépôt**, validation en base PostgreSQL **éphémère dev-locale**.

Première tranche du LOT-02a de la campagne C4 « Compléments clean label »
(proposition : `docs/claude/propositions/2026-07-24-rayon-complements-bibliotheque/`).

## Provenance des données

| | |
|---|---|
| Jeu | « Déclarations de compléments alimentaires » |
| Producteur | DGAL / Ministère de l'Agriculture — reprise du jeu DGCCRF (Téléicare, 2016-2025), plateforme Compl'Alim depuis septembre 2025 |
| Page | <https://www.data.gouv.fr/datasets/declarations-de-complements-alimentaires> |
| Fichier | `declarations.csv` (CSV `;`, utf-8-sig, JSON embarqué dans les colonnes de composition) |
| Schéma | `schema_declarations.json` (dépôt `betagouv/complements-alimentaires`) |
| Licence | **Licence Ouverte v2.0 (Etalab)** — réutilisation libre avec mention de la source |
| Fréquence | quotidienne |

Téléchargement — toujours **hors dépôt** (le dépôt ignore d'ailleurs `*.csv`) :

```bash
mkdir -p ~/.wellneuro/supplements/source
curl -sL -o ~/.wellneuro/supplements/source/declarations.csv \
  'https://cellar-c2.services.clever-cloud.com/compl-alim-prod/media/declarations.csv'
curl -sL -o ~/.wellneuro/supplements/source/schema_declarations.json \
  'https://raw.githubusercontent.com/betagouv/complements-alimentaires/main/data/schemas/schema_declarations.json'
```

## Usage

```bash
cd tools/supplements && npm install   # une fois (pg uniquement)

# 1. CSV → fiches normalisées (NDJSON hors dépôt), complétude calculée
node import/parse.mjs [--limit 2000]

# 2. Fiches → brouillons (statut 'importee') dans une base éphémère dev-locale
node import/stage-devlocal.mjs [--pgurl postgresql://$(whoami)@localhost:55433/wn_supplements_dev]
```

`parse.mjs` produit une fiche par déclaration : produit, composition (plantes,
micro-organismes, substances, nutriments, autres actifs, inactifs, additifs),
métadonnées de provenance/fraîcheur, et le calcul **déterministe** du niveau de
complétude (`bien_documentee` / `partielle` / `lacunaire`) avec la **liste
explicite des données manquantes** — dimensions qualitatives de la proposition
§5, jamais de score agrégé.

Base éphémère (motif `initdb`/`pg_ctl`, comme `scripts/wn-test-worktree.sh`) :

```bash
initdb -D /tmp/wn-supp-pg --encoding=UTF8 -U $(whoami)
pg_ctl -D /tmp/wn-supp-pg -o "-p 55433 -k /tmp/wn-supp-pg" -l /tmp/wn-supp-pg/log start
createdb -h localhost -p 55433 wn_supplements_dev
# … travail …
pg_ctl -D /tmp/wn-supp-pg stop && rm -rf /tmp/wn-supp-pg
```

## Garde-fous

- **Brouillons seulement (décision n°11 du moteur d'intention).** Une source
  externe ne produit jamais une écriture directe en base active : chaque fiche
  entre en `statut = 'importee'`, non activable cliniquement. L'outil ne pose
  **jamais** `verifiee` ni `derniere_verification` — seule la revue praticien
  le fait. Aucune alerte de sécurité, aucune règle clinique n'est écrite par ce
  flux.
- **Jamais de production.** `stage-devlocal.mjs` refuse toute cible non locale
  (localhost uniquement). Aucun secret de production n'est requis ni lu. La
  base de production ne se modifie que par migration relue (règle du dépôt).
- **Ré-import non destructif.** Le ré-import ne met à jour que les fiches
  encore en `importee` ; une fiche vérifiée ou inactivée par le praticien
  n'est jamais écrasée.
- **Données hors dépôt.** CSV source, NDJSON normalisé et bases éphémères
  vivent sous `~/.wellneuro/supplements/` et `/tmp` — rien n'entre dans git.

## Écart à réconcilier avec le LOT-01

La migration `c4/lot-01-schema-catalogue` (`SupplementProduct` +
`SupplementProductComposition`) n'était pas poussée à l'écriture de cet outil :
`import/ddl-attendu.sql` matérialise le schéma déduit de la proposition §4 pour
la validation dev-locale. Quand la migration LOT-01 existera, la pointer via
`--ddl` (ou adapter les colonnes) et supprimer `ddl-attendu.sql`. Le lien de la
composition vers le pivot clinique `supplement_ingredients` (schéma V1 du
moteur d'intention) se fera à cette réconciliation.
