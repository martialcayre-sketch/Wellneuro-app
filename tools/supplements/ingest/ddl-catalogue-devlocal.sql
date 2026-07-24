-- C4A — DDL dev-local du catalogue, miroir fidèle de la migration
-- 20260724133000_c4_supplement_product_catalogue (les trois tables + leurs
-- CHECK et index), plus un squelette MINIMAL de supplement_ingredients /
-- supplement_ingredient_formes servant de cibles de FK pour la démonstration
-- de composition. Ne s'applique QUE sur une base éphémère dev-locale.

CREATE TABLE IF NOT EXISTS supplement_ingredients (
  id      text PRIMARY KEY,
  code    text NOT NULL UNIQUE,
  nom_fr  text NOT NULL,
  actif   boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS supplement_ingredient_formes (
  id            text PRIMARY KEY,
  ingredient_id text NOT NULL REFERENCES supplement_ingredients (id),
  code          text NOT NULL,
  label_fr      text NOT NULL,
  actif         boolean NOT NULL DEFAULT true,
  UNIQUE (ingredient_id, code)
);

CREATE TABLE IF NOT EXISTS supplement_products (
  id                          text PRIMARY KEY,
  nom_commercial              text NOT NULL,
  marque                      text NOT NULL,
  marche                      text NOT NULL DEFAULT 'FR',
  version_formulation         integer NOT NULL DEFAULT 1,
  source_provenance           text NOT NULL,
  source_identifiant          text NOT NULL,
  source_url                  text,
  date_derniere_verification  timestamptz,
  statut_fiche                text NOT NULL DEFAULT 'importee',
  niveau_completude           text NOT NULL,
  contenu_sha256              text,
  donnees_manquantes          text[] DEFAULT ARRAY[]::text[],
  incertitudes                text,
  labels                      text[] DEFAULT ARRAY[]::text[],
  allergenes                  text[] DEFAULT ARRAY[]::text[],
  excipients                  text[] DEFAULT ARRAY[]::text[],
  verifie_par                 text,
  verifie_le                  timestamptz,
  actif                       boolean NOT NULL DEFAULT true,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplement_products_statut_fiche_check
    CHECK (statut_fiche IN ('importee', 'verifiee', 'inactive')),
  CONSTRAINT supplement_products_niveau_completude_check
    CHECK (niveau_completude IN ('bien_documentee', 'partielle', 'lacunaire')),
  CONSTRAINT supplement_products_source_provenance_check
    CHECK (source_provenance IN ('complalim', 'dgccrf', 'saisie_praticien')),
  CONSTRAINT supplement_products_contenu_sha256_check
    CHECK (contenu_sha256 IS NULL OR contenu_sha256 ~ '^[a-f0-9]{64}$'),
  CONSTRAINT supplement_products_fiche_verifiee_signee_check
    CHECK (statut_fiche <> 'verifiee' OR (verifie_par IS NOT NULL AND verifie_le IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS supplement_products_source_version_key
  ON supplement_products (source_provenance, source_identifiant, version_formulation);

CREATE TABLE IF NOT EXISTS supplement_product_compositions (
  id               text PRIMARY KEY,
  product_id       text NOT NULL REFERENCES supplement_products (id) ON DELETE RESTRICT,
  ingredient_id    text NOT NULL REFERENCES supplement_ingredients (id) ON DELETE RESTRICT,
  forme_id         text REFERENCES supplement_ingredient_formes (id) ON DELETE RESTRICT,
  dose_par_portion double precision,
  unite            text,
  position         integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplement_product_compositions_dose_unite_check
    CHECK ((dose_par_portion IS NULL) = (unite IS NULL)),
  CONSTRAINT supplement_product_compositions_unite_check
    CHECK (unite IS NULL OR unite IN ('µg', 'mg', 'g', 'mL', 'UI'))
);

CREATE UNIQUE INDEX IF NOT EXISTS supplement_product_compositions_produit_ingredient_forme_key
  ON supplement_product_compositions (product_id, ingredient_id, forme_id);
CREATE UNIQUE INDEX IF NOT EXISTS supplement_product_compositions_produit_ingredient_sans_forme
  ON supplement_product_compositions (product_id, ingredient_id) WHERE forme_id IS NULL;

CREATE TABLE IF NOT EXISTS supplement_product_versions_courantes (
  id                 text PRIMARY KEY,
  source_provenance  text NOT NULL,
  source_identifiant text NOT NULL,
  product_id         text NOT NULL REFERENCES supplement_products (id) ON DELETE RESTRICT,
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS supplement_product_versions_courantes_source_key
  ON supplement_product_versions_courantes (source_provenance, source_identifiant);
CREATE UNIQUE INDEX IF NOT EXISTS supplement_product_versions_courantes_product_id_key
  ON supplement_product_versions_courantes (product_id);
