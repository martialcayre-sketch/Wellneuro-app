-- Provenance des entrées du référentiel d'ingrédients (campagne C4, phase 1b).
--
-- ADDITIVE UNIQUEMENT : quatre colonnes NULLABLES et deux index uniques.
-- Aucune colonne existante modifiée, aucun DROP, aucun renommage, aucun
-- backfill. Rollback = abandon des quatre colonnes et des deux index.
--
-- POURQUOI. Le pivot `supplement_ingredients` est vide ; il va être peuplé
-- depuis le référentiel officiel Compl'Alim (couverture mesurée : 100 % des
-- 883 libellés chimiques, 1 021 espèces végétales et 61 micro-organismes
-- employés par les 140 148 fiches du catalogue). Ces colonnes portent la clé
-- de RE-SYNCHRONISATION : l'identifiant officiel de l'entrée source. Sans
-- elles, un réalignement ultérieur devrait deviner l'appariement par le nom —
-- exactement le genre d'heuristique qui a déjà produit une erreur clinique
-- ici (« Hydrogénosélénite de sodium » lu comme du sodium, non du sélénium).
--
-- POURQUOI PAS DANS `code`. `code` est la clé que les règles cliniques
-- manipulent (`clinical_rules.ingredient_id` s'écrit en regard d'un code, et
-- la sentinelle compare des codes d'ingrédients). Il doit rester lisible —
-- « selenium », « vitamine-b12 » — et non « complalim-sub-356 ».
--
-- NULLABLES À DESSEIN. Une entrée créée à la main par le praticien n'a pas de
-- provenance externe. PostgreSQL ne considère pas deux NULL comme égaux :
-- l'index unique ci-dessous n'empêche donc PAS plusieurs lignes sans
-- provenance, et n'impose rien aux entrées existantes. Il garantit seulement
-- qu'un même identifiant officiel n'est pas ingéré deux fois côté INGRÉDIENT —
-- c'est le socle de l'idempotence de la voie d'ingestion. Les identifiants y
-- sont préfixés par leur espace de noms (`substance:`, `plant:`…) : sans cela,
-- une substance 356 et une plante 356 entreraient en collision.
--
-- CÔTÉ FORME, PAS D'UNICITÉ — et c'est délibéré. Une même forme d'apport
-- officielle relève parfois de PLUSIEURS substances : mesuré sur le
-- référentiel, 69 cas, dont « D-pantothénate de calcium » qui apporte la
-- vitamine B5 ET du calcium, ou « Chlorure de calcium » (calcium et chlore).
-- Cette forme apparaît donc légitimement sous plusieurs ingrédients ; un index
-- unique sur (provenance, identifiant) refuserait la seconde et ferait échouer
-- l'ingestion. L'unicité pertinente existe déjà : `[ingredient_id, code]`.
-- Ici, un index NON unique, pour la re-synchronisation et rien d'autre.
--
-- CE QUE CETTE MIGRATION NE FAIT PAS : elle n'écrit aucun ingrédient, aucune
-- forme, aucune règle clinique et aucun seuil. Elle ouvre la place ; le
-- remplissage passe par la route interne, gardée par son secret partagé.

ALTER TABLE "supplement_ingredients"
  ADD COLUMN "source_provenance" TEXT,
  ADD COLUMN "source_identifiant" TEXT;

ALTER TABLE "supplement_ingredient_formes"
  ADD COLUMN "source_provenance" TEXT,
  ADD COLUMN "source_identifiant" TEXT;

CREATE UNIQUE INDEX "supplement_ingredients_source_key"
  ON "supplement_ingredients" ("source_provenance", "source_identifiant");

CREATE INDEX "supplement_ingredient_formes_source_idx"
  ON "supplement_ingredient_formes" ("source_provenance", "source_identifiant");
