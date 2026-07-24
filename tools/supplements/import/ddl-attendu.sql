-- LOT-02a — DDL ATTENDU du catalogue C4A (hypothèse locale de travail).
--
-- La branche `c4/lot-01-schema-catalogue` n'était pas poussée au moment où cet
-- outillage a été écrit : ce fichier matérialise le schéma déduit de la
-- proposition (§4 « L'entité produit et le pivot ingrédient ») pour permettre
-- la validation dev-locale de l'importeur. ÉCART À RÉCONCILIER avec la
-- migration réelle du LOT-01 dès qu'elle existe — `stage-devlocal.mjs`
-- accepte `--ddl <chemin>` pour pointer la migration officielle à la place.
--
-- Ce DDL ne s'applique QUE sur une base éphémère dev-locale. Jamais en
-- production (décision n°11 : une source externe ne produit que des
-- brouillons, et la production ne se modifie que par migration relue).

CREATE TABLE IF NOT EXISTS supplement_products (
  id                            text PRIMARY KEY,
  source_id                     text NOT NULL UNIQUE, -- 'complalim-<id>'
  id_complalim                  integer,
  teleicare_id                  integer,
  numero_declaration_teleicare  text,

  nom_commercial                text NOT NULL,
  marque                        text,
  gamme                         text,
  responsable                   jsonb,          -- {nom, adresse, siret, vat}
  article_procedure             text,
  decision                      text,
  date_decision                 date,
  date_retrait                  date,
  forme_galenique               text,
  dose_journaliere              text,
  mode_emploi                   text,
  mises_en_garde                text,
  aromes                        jsonb NOT NULL DEFAULT '[]',
  objectifs_effet               jsonb NOT NULL DEFAULT '[]',
  populations_cibles            jsonb NOT NULL DEFAULT '[]',
  facteurs_risques              jsonb NOT NULL DEFAULT '[]',

  -- C4A : provenance et fraîcheur OBLIGATOIRES par produit.
  source_libelle                text NOT NULL,
  source_url                    text NOT NULL,
  source_licence                text NOT NULL,
  source_date_telechargement    date NOT NULL,
  version_formulation           integer NOT NULL DEFAULT 1,

  -- Chaîne import → brouillon → revue → activation. L'outillage d'import ne
  -- pose JAMAIS `verifiee` : seule la revue praticien le fait.
  statut                        text NOT NULL DEFAULT 'importee'
                                CHECK (statut IN ('importee', 'verifiee', 'inactive')),
  niveau_completude             text NOT NULL
                                CHECK (niveau_completude IN ('bien_documentee', 'partielle', 'lacunaire')),
  donnees_manquantes            jsonb NOT NULL DEFAULT '[]',
  incertitudes                  jsonb NOT NULL DEFAULT '[]',
  derniere_verification         timestamptz,    -- posée par la revue praticien uniquement
  verifie_par                   text,

  importe_le                    timestamptz NOT NULL DEFAULT now(),
  created_at                    timestamptz NOT NULL DEFAULT now(),
  updated_at                    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS supplement_products_statut_idx
  ON supplement_products (statut);
CREATE INDEX IF NOT EXISTS supplement_products_niveau_completude_idx
  ON supplement_products (niveau_completude);

-- Composition : le produit se projette sur le pivot clinique (ingrédient)
-- par sa composition. Le lien vers `supplement_ingredients` (schéma V1 du
-- moteur d'intention, intact) sera posé à la réconciliation LOT-01 — ici la
-- composition est conservée nominative, sans FK ingrédient.
CREATE TABLE IF NOT EXISTS supplement_product_compositions (
  id             text PRIMARY KEY,
  product_id     text NOT NULL REFERENCES supplement_products (id) ON DELETE CASCADE,
  type_composant text NOT NULL CHECK (type_composant IN (
    'plante', 'micro_organisme', 'nutriment', 'substance',
    'autre_actif', 'ingredient_inactif', 'additif'
  )),
  nom            text,
  details        jsonb NOT NULL DEFAULT '{}',
  dose_par_djr   numeric,
  unite          text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS supplement_product_compositions_product_idx
  ON supplement_product_compositions (product_id);
