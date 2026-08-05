-- Dose de composition : dire la grandeur, et ouvrir la preuve d'intégrité
-- (campagne C4, transport des compositions — PR A).
--
-- TABLE VIDE. `supplement_product_compositions` compte 0 ligne en production
-- (relevé le 2026-07-31, aux côtés de 140 148 produits et 3 444 ingrédients).
-- Le renommage ci-dessous ne déplace donc aucune donnée. C'est la seule fenêtre
-- où ce geste est gratuit ; elle se referme à la première ligne écrite.
--
-- CE QU'IL EN COÛTE QUAND MÊME, et qu'il faut dire. `vercel-build.sh` lance
-- `migrate deploy` AVANT `next build`, et le déploiement précédent continue de
-- servir pendant tout le build. Or l'ancien `catalogue.ts` sélectionne
-- `dose_par_portion`. Pendant les ~1 à 2 minutes du build, `WN_C4_ENABLED`
-- étant allumé, une ouverture du rayon compléments rend 500 (erreur 42703,
-- colonne inconnue). Un praticien, une poignée de minutes, aucune écriture
-- perdue — mais ce n'est pas rien, et un rollback Vercel du code SEUL ne le
-- réparerait pas : le retour arrière applicatif ne défait pas la migration.
-- Pour revenir en arrière il faut une migration inverse, pas un bouton.
--
-- ── 1. `dose_par_portion` → `dose_par_djr` ──────────────────────────────────
-- La source ne donne pas ce que la colonne annonçait. Compl'Alim déclare
-- `quantité_par_djr` : la quantité par DOSE JOURNALIÈRE RECOMMANDÉE. Un produit
-- à 3 gélules/jour déclare 300 mg par DJR, soit 100 mg par gélule. Les deux
-- grandeurs diffèrent d'un facteur égal au nombre de prises.
--
-- Le prochain lecteur de cette colonne est la sentinelle de cumul (LOT-03), qui
-- rapproche des doses entre produits. Une sentinelle qui croit sommer des
-- portions alors qu'elle somme des DJR ne se trompe pas d'un peu : elle se
-- trompe d'un facteur, et dans le sens rassurant si les prises sont nombreuses.
-- Le nom de la colonne sera sa première source de vérité — celle qu'on ne
-- relit pas.
--
-- Le CHECK `..._dose_unite_check` suit automatiquement le renommage (PostgreSQL
-- réécrit l'expression de la contrainte), son nom reste exact : il n'est donc
-- ni supprimé ni recréé.
--
-- ── 2. `UFC` au vocabulaire d'unités ────────────────────────────────────────
-- Mesuré sur les 141 388 fiches de `declarations.csv` : les 21 805 lignes de
-- micro-organismes portent une quantité (98,5 % d'entre elles) et AUCUNE clé
-- d'unité — l'UFC y est implicite. Or le CHECK apparie dose et unité : sans
-- `UFC` au vocabulaire, ces lignes ne sont écrivables qu'en jetant la dose,
-- et 21 478 dosages probiotiques disparaissent en silence.
--
-- ÉLARGISSEMENT, PAS ASSOUPLISSEMENT : le vocabulaire reste clos, et il reste
-- la garde qui empêche la sentinelle de rapprocher des grandeurs incomparables.
-- On y ajoute une unité que la source emploie réellement ; on n'y ajoute pas
-- `C/j` (18 lignes) ni les unités absentes (65 lignes de substances portent un
-- nombre sans grandeur) — celles-là s'écrivent dose NULL / unité NULL, comme
-- le prévoyait déjà le commentaire du LOT-01 : « unité non mappable à
-- l'import → dose NULL ». Ne jamais deviner une unité.
--
-- `mL` reste la seule graphie admise : la source écrit `ml` en minuscules sur
-- 19 330 lignes, et c'est à l'import de normaliser, pas à la base d'accepter
-- deux orthographes de la même unité.
--
-- ── 3. `composition_source_lignes` sur `supplement_products` ────────────────
-- La colonne que `catalogue.ts` nomme déjà sans qu'elle existe. Elle porte le
-- nombre de lignes ACTIVES déclarées par la source pour la fiche — la preuve
-- positive sans laquelle `lireCompletudeComposition` ne peut jamais rendre
-- `integre`, et donc sans laquelle tout le catalogue resterait `partielle`.
--
-- NULLABLE À DESSEIN : une fiche dont on ignore le compte source n'est pas une
-- fiche à zéro ligne. `NULL` signifie « on ne sait pas » et maintient le
-- fail-closed ; `0` signifie « la source ne déclare aucun actif » — c'est le
-- cas de 406 fiches, et c'est une information, pas une ignorance.
--
-- CETTE MIGRATION N'OUVRE AUCUN VERDICT. Rien n'écrit encore la colonne : elle
-- reste NULL sur les 140 148 fiches, `integre` reste inatteignable, et les
-- trois verdicts positifs (`Compatible`, `Aucun cumul`, `Aucune interaction
-- connue`) restent écrasés par `appliquerCompletude`. Le remplissage est un
-- geste séparé.
--
-- ADDITIVE ET RENOMMANTE, SUR TABLE VIDE. Aucun DROP de colonne, aucun
-- backfill, aucune donnée patient, aucune écriture dans `clinical_rules`,
-- `ingredient_functional_thresholds` ni `supplement_safety_alerts`.

ALTER TABLE "supplement_product_compositions"
  RENAME COLUMN "dose_par_portion" TO "dose_par_djr";

ALTER TABLE "supplement_product_compositions"
  DROP CONSTRAINT "supplement_product_compositions_unite_check";

ALTER TABLE "supplement_product_compositions"
  ADD CONSTRAINT "supplement_product_compositions_unite_check"
    CHECK ("unite" IS NULL OR "unite" IN ('µg', 'mg', 'g', 'mL', 'UI', 'UFC'));

ALTER TABLE "supplement_products"
  ADD COLUMN "composition_source_lignes" INTEGER;

-- Un compte de lignes n'est pas négatif. Le drift check de Prisma ne voit pas
-- les CHECK : sans celui-ci, seule la discipline applicative l'empêcherait.
ALTER TABLE "supplement_products"
  ADD CONSTRAINT "supplement_products_composition_source_lignes_check"
    CHECK ("composition_source_lignes" IS NULL OR "composition_source_lignes" >= 0);
