# LOT-01 — Schéma du catalogue C4A (SupplementProduct + composition)

> **Statut : revu adversarialement (wn-reviewer, 2026-07-24), corrections
> intégrées, en attente d'autorisation de pose.** L'écriture de
> `web/prisma/schema.prisma` et de `web/prisma/migrations/` est protégée par le
> mur « demande » des hooks ; l'autorisation n'a pas été accordée dans la session
> du 2026-07-24. Ce document porte le contenu exact à appliquer.
>
> **Verdict de revue : GO conditionnel.** Bloquant B-1 (index partiel sur table
> native vs drift check CI) à trancher par un run réel avant pose — voir
> § « Point B-1 » ; recommandations R-1 (empreinte de formulation), R-2 (version
> courante), R-3 à R-7 intégrées ci-dessous.
>
> Référence : proposition mergée (#329),
> `docs/claude/propositions/2026-07-24-rayon-complements-bibliotheque/PROPOSITION_RAYON_COMPLEMENTS.md` §4.

## Principe

Trois tables **additives uniquement** (produits, compositions, pointeur de
version courante) — aucune table existante modifiée en SQL, aucun DROP, aucun
backfill (l'absence de ligne = aucun produit au catalogue, état actuel).
**L'ingrédient reste le pivot clinique** : règles, seuils et alertes ne bougent
pas ; le produit commercial s'y projette par sa composition.
Côté Prisma, seuls des champs de relation inverses (sans effet SQL) s'ajoutent à
`SupplementIngredient` et `SupplementIngredientForme`.

Une reformulation ne modifie jamais une fiche : elle crée une nouvelle ligne
(`versionFormulation` incrémentée) — même motif append-only que `versionRegle`.
**Honnêteté du contrat (R-3)** : cet append-only est garanti par l'application
(l'import ne fait jamais d'UPDATE de composition), pas par la base — même
posture que `clinical_rules.version_regle`, sans trigger. La ligne produit
reste mutable pour son workflow (statut, actif, vérification).

Le statut de fiche est un workflow interne (`importee` → `verifiee`,
`inactive`), contraint par CHECK ; l'outil d'import (LOT-02a) ne pose jamais
`verifiee` — ce statut exige `verifie_par` + `verifie_le` (CHECK `fiche_verifiee_signee`,
même motif que `valide_signe` des claims corpus).

**Idempotence des ré-imports (R-1)** : `contenuSha256` porte l'empreinte
déterministe de la formulation (composition normalisée + doses + attributs
sourcés — algorithme défini au LOT-02a). L'importeur compare l'empreinte de la
version courante : inchangée → aucune écriture ; changée → nouvelle
`versionFormulation`. Sans elle, la veille quotidienne (outil n°6) créerait une
version par passe ou écraserait l'historique. Même motif que `content_sha256`
des claims corpus.

**Version courante (R-2)** : une table pointeur `supplement_product_versions_courantes`
désigne LA formulation courante d'un produit source — unicité native sur
`(source_provenance, source_identifiant)`, sans index partiel. L'import déplace
le pointeur dans la même transaction que l'insertion d'une nouvelle version.
Le catalogue et la sentinelle ne lisent que via ce pointeur : deux versions ne
peuvent pas être « courantes » à la fois.

**Contexte source (LOT-00, PR #330)** : dans l'open data Compl'Alim, les
nutriments (vitamines/minéraux) ne portent jamais de dosage — seules les
plantes sont dosées. `dose_par_portion` sera donc largement NULL à l'import ;
les doses entrent à la vérification praticien. La dimension « Données
manquantes » assume ce vide honnêtement.

## Modèles Prisma (à insérer après `ProtocolReviewFlag`, avant la section TRUST)

```prisma
// Catalogue de produits commerciaux C4A (campagne C4 « Compléments clean
// label », LOT-01, décision praticien du 2026-07-24 : catalogue
// DGCCRF/Compl'Alim complet importé en brouillons). Référentiel documentaire,
// aucune donnée patient. Le produit est une matérialisation commerciale qui
// se projette sur le pivot clinique SupplementIngredient via sa composition ;
// les règles, seuils et alertes restent au niveau ingrédient (V1 intacte).
// Reformulation = nouvelle ligne (version_formulation), jamais d'édition en
// place. L'import de masse ne pose jamais statut_fiche = 'verifiee'
// (décision n°11 du moteur d'intention : une source externe produit des
// brouillons, la vérification est un geste praticien signé).

model SupplementProduct {
  id                       String    @id @default(cuid())
  nomCommercial            String    @map("nom_commercial")
  marque                   String    @map("marque")
  marche                   String    @default("FR") @map("marche")
  versionFormulation       Int       @default(1) @map("version_formulation")
  sourceProvenance         String    @map("source_provenance")
  sourceIdentifiant        String    @map("source_identifiant")
  sourceUrl                String?   @map("source_url")
  dateDerniereVerification DateTime? @map("date_derniere_verification")
  statutFiche              String    @default("importee") @map("statut_fiche")
  niveauCompletude         String    @map("niveau_completude")
  contenuSha256            String?   @map("contenu_sha256")
  donneesManquantes        String[]  @default([]) @map("donnees_manquantes")
  incertitudes             String?   @map("incertitudes")
  labels                   String[]  @default([]) @map("labels")
  allergenes               String[]  @default([]) @map("allergenes")
  excipients               String[]  @default([]) @map("excipients")
  verifiePar               String?   @map("verifie_par")
  verifieLe                DateTime? @map("verifie_le")
  actif                    Boolean   @default(true) @map("actif")
  createdAt                DateTime  @default(now()) @map("created_at")
  updatedAt                DateTime  @updatedAt @map("updated_at")

  compositions SupplementProductComposition[]

  @@unique([sourceProvenance, sourceIdentifiant, versionFormulation], map: "supplement_products_source_version_key")
  @@index([marque, nomCommercial], map: "supplement_products_marque_nom_idx")
  @@index([statutFiche, actif], map: "supplement_products_statut_idx")
  @@map("supplement_products")
}

model SupplementProductComposition {
  id             String   @id @default(cuid())
  productId      String   @map("product_id")
  ingredientId   String   @map("ingredient_id")
  formeId        String?  @map("forme_id")
  doseParPortion Float?   @map("dose_par_portion")
  unite          String?  @map("unite")
  position       Int      @default(0) @map("position")
  createdAt      DateTime @default(now()) @map("created_at")

  product    SupplementProduct          @relation(fields: [productId], references: [id])
  ingredient SupplementIngredient       @relation(fields: [ingredientId], references: [id])
  forme      SupplementIngredientForme? @relation(fields: [formeId], references: [id])

  @@unique([productId, ingredientId, formeId], map: "supplement_product_compositions_produit_ingredient_forme_key")
  @@index([ingredientId], map: "supplement_product_compositions_ingredient_idx")
  @@map("supplement_product_compositions")
}

model SupplementProductVersionCourante {
  id                String   @id @default(cuid())
  sourceProvenance  String   @map("source_provenance")
  sourceIdentifiant String   @map("source_identifiant")
  productId         String   @unique @map("product_id")
  updatedAt         DateTime @updatedAt @map("updated_at")

  product SupplementProduct @relation(fields: [productId], references: [id])

  @@unique([sourceProvenance, sourceIdentifiant], map: "supplement_product_versions_courantes_source_key")
  @@map("supplement_product_versions_courantes")
}
```

Relations inverses à ajouter (sans effet SQL) :

- `SupplementIngredient` : `compositions SupplementProductComposition[]`
- `SupplementIngredientForme` : `compositions SupplementProductComposition[]`
- `SupplementProduct` : `versionCourante SupplementProductVersionCourante?`

## Migration SQL — `web/prisma/migrations/20260724120000_c4_supplement_product_catalogue/migration.sql`

```sql
-- Catalogue de produits commerciaux C4A (campagne C4 « Compléments clean
-- label », LOT-01). Décision praticien du 2026-07-24 : catalogue
-- DGCCRF/Compl'Alim complet, importé en brouillons, vérification praticien
-- pour activation.
--
-- ADDITIVE UNIQUEMENT : deux tables nouvelles, aucune table existante
-- modifiée, aucun DROP, aucun renommage, aucun backfill — l'absence de ligne
-- signifie « aucun produit au catalogue », état actuel. Rollback = abandon
-- des deux tables.
--
-- CE QUE CES TABLES NE DÉCLENCHENT PAS : aucun lien clinique automatique.
-- Le pivot clinique reste supplement_ingredients : les règles
-- (clinical_rules), seuils (ingredient_functional_thresholds) et alertes
-- (supplement_safety_alerts) ne référencent jamais un produit. Une source
-- externe (import Compl'Alim) ne peut créer que des fiches en statut
-- 'importee' ; le passage à 'verifiee' est un geste praticien signé
-- (verifie_par + verifie_le obligatoires, CHECK fiche_verifiee_signee).
-- Reformulation = nouvelle ligne (version_formulation), jamais d'UPDATE de
-- la composition d'une fiche vérifiée.

-- CreateTable
CREATE TABLE "supplement_products" (
    "id" TEXT NOT NULL,
    "nom_commercial" TEXT NOT NULL,
    "marque" TEXT NOT NULL,
    "marche" TEXT NOT NULL DEFAULT 'FR',
    "version_formulation" INTEGER NOT NULL DEFAULT 1,
    "source_provenance" TEXT NOT NULL,
    "source_identifiant" TEXT NOT NULL,
    "source_url" TEXT,
    "date_derniere_verification" TIMESTAMP(3),
    "statut_fiche" TEXT NOT NULL DEFAULT 'importee',
    "niveau_completude" TEXT NOT NULL,
    "contenu_sha256" TEXT,
    "donnees_manquantes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "incertitudes" TEXT,
    "labels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allergenes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "excipients" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "verifie_par" TEXT,
    "verifie_le" TIMESTAMP(3),
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplement_products_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "supplement_products_statut_fiche_check"
        CHECK ("statut_fiche" IN ('importee', 'verifiee', 'inactive')),
    CONSTRAINT "supplement_products_niveau_completude_check"
        CHECK ("niveau_completude" IN ('bien_documentee', 'partielle', 'lacunaire')),
    -- R-5 : provenance à vocabulaire fermé (idempotence de l'import). Une
    -- nouvelle source = une migration additive élargissant ce CHECK.
    CONSTRAINT "supplement_products_source_provenance_check"
        CHECK ("source_provenance" IN ('complalim', 'dgccrf', 'saisie_praticien')),
    -- R-1 : empreinte de formulation (idempotence des ré-imports), même
    -- format que content_sha256 des claims corpus.
    CONSTRAINT "supplement_products_contenu_sha256_check"
        CHECK ("contenu_sha256" IS NULL OR "contenu_sha256" ~ '^[a-f0-9]{64}$'),
    -- Une fiche vérifiée porte obligatoirement signataire et date (même
    -- motif que valide_signe sur rag_corpus_claims).
    CONSTRAINT "supplement_products_fiche_verifiee_signee_check"
        CHECK ("statut_fiche" <> 'verifiee'
               OR ("verifie_par" IS NOT NULL AND "verifie_le" IS NOT NULL))
);

-- CreateTable
CREATE TABLE "supplement_product_compositions" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "ingredient_id" TEXT NOT NULL,
    "forme_id" TEXT,
    "dose_par_portion" DOUBLE PRECISION,
    "unite" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplement_product_compositions_pkey" PRIMARY KEY ("id"),
    -- Une dose renseignée porte son unité (et réciproquement) : jamais un
    -- nombre nu ni une unité orpheline.
    CONSTRAINT "supplement_product_compositions_dose_unite_check"
        CHECK (("dose_par_portion" IS NULL) = ("unite" IS NULL)),
    -- R-4 : vocabulaire d'unités canonique — la sentinelle de cumul compare
    -- des doses entre produits, des unités hétérogènes rendraient tout
    -- rapprochement faux. L'importeur normalise (µ/μ compris, leçon du banc
    -- corpus) ; unité non mappable → dose NULL + entrée donnees_manquantes.
    CONSTRAINT "supplement_product_compositions_unite_check"
        CHECK ("unite" IS NULL OR "unite" IN ('µg', 'mg', 'g', 'mL', 'UI'))
);

-- Table pointeur « version courante » (R-2) : désigne LA formulation courante
-- d'un produit source, par unicité native — sans index partiel. L'import
-- déplace le pointeur dans la même transaction que l'insertion d'une nouvelle
-- version ; catalogue et sentinelle ne lisent que via ce pointeur.
CREATE TABLE "supplement_product_versions_courantes" (
    "id" TEXT NOT NULL,
    "source_provenance" TEXT NOT NULL,
    "source_identifiant" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplement_product_versions_courantes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "supplement_products_source_version_key"
    ON "supplement_products"("source_provenance", "source_identifiant", "version_formulation");

-- CreateIndex
CREATE INDEX "supplement_products_marque_nom_idx"
    ON "supplement_products"("marque", "nom_commercial");

-- CreateIndex
CREATE INDEX "supplement_products_statut_idx"
    ON "supplement_products"("statut_fiche", "actif");

-- CreateIndex — l'unicité (produit, ingrédient, forme) tolère les doublons à
-- forme NULL (sémantique Postgres) ; l'index partiel ci-dessous ferme ce trou.
CREATE UNIQUE INDEX "supplement_product_compositions_produit_ingredient_forme_key"
    ON "supplement_product_compositions"("product_id", "ingredient_id", "forme_id");

CREATE UNIQUE INDEX "supplement_product_compositions_produit_ingredient_sans_forme"
    ON "supplement_product_compositions"("product_id", "ingredient_id")
    WHERE "forme_id" IS NULL;

-- CreateIndex
CREATE INDEX "supplement_product_compositions_ingredient_idx"
    ON "supplement_product_compositions"("ingredient_id");

-- CreateIndex — unicité du pointeur : un produit source n'a qu'une version
-- courante, une version n'est courante que d'un produit source.
CREATE UNIQUE INDEX "supplement_product_versions_courantes_source_key"
    ON "supplement_product_versions_courantes"("source_provenance", "source_identifiant");

CREATE UNIQUE INDEX "supplement_product_versions_courantes_product_id_key"
    ON "supplement_product_versions_courantes"("product_id");

-- AddForeignKey
ALTER TABLE "supplement_product_versions_courantes"
    ADD CONSTRAINT "supplement_product_versions_courantes_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "supplement_products"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplement_product_compositions"
    ADD CONSTRAINT "supplement_product_compositions_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "supplement_products"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplement_product_compositions"
    ADD CONSTRAINT "supplement_product_compositions_ingredient_id_fkey"
    FOREIGN KEY ("ingredient_id") REFERENCES "supplement_ingredients"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey — RESTRICT et non SET NULL (écart assumé avec
-- clinical_rules.forme_preferee_id, R-7) : dans une règle clinique, perdre la
-- forme préférée dégrade une préférence ; dans une composition de catalogue,
-- perdre la forme falsifierait la fiche d'un produit réel. On protège
-- l'intégrité du catalogue.
ALTER TABLE "supplement_product_compositions"
    ADD CONSTRAINT "supplement_product_compositions_forme_id_fkey"
    FOREIGN KEY ("forme_id") REFERENCES "supplement_ingredient_formes"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Sécurité : deny-all RLS par défaut (aucune policy volontairement ; l'app
-- accède via Prisma en connexion Postgres directe qui contourne RLS),
-- cohérent avec cabinet_instruments et les tables du moteur d'intention.
ALTER TABLE "public"."supplement_products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."supplement_product_compositions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."supplement_product_versions_courantes" ENABLE ROW LEVEL SECURITY;
```

## Point B-1 — index partiel vs drift check CI (bloquant de revue)

L'index partiel `supplement_product_compositions_produit_ingredient_sans_forme`
(fermeture du trou NULL de l'unicité 3-colonnes) n'est pas exprimable dans
`schema.prisma`, sur une table native — sans précédent dans le dépôt. Le gate
CI (`prisma migrate diff --exit-code`) pourrait vouloir le supprimer → rouge.

**Arbitrage retenu (option A de la revue, avec repli B)** : trancher par un run
réel avant pose. Un banc d'essai isolé (hors chemins protégés) applique
schéma + migration sur un PostgreSQL éphémère et joue le diff exact du CI :

- **diff silencieux** → RAS, l'index partiel reste, commenter le constat dans
  le SQL ;
- **diff bruyant** → repli B : déclarer `public.supplement_products`,
  `public.supplement_product_compositions` et
  `public.supplement_product_versions_courantes` dans `tables.external` de
  `web/prisma.config.ts` (même motif que les tables `rag_*`), en acceptant la
  perte du drift check sur ces trois tables.

Résultat du banc : **non exécuté au 2026-07-24** — le banc est monté (schéma
patché + migration + réplique fidèle du `prisma migrate diff` du CI sur
PostgreSQL éphémère), mais `prisma migrate` relève lui-même du palier
« demande » des hooks, y compris contre une base éphémère (faux positif assumé
par la doctrine du dépôt — le scan porte sur la commande brute). Le banc
s'exécute donc au même moment que la pose, sous la même autorisation, AVANT le
commit de la migration.

## Questions ouvertes (revue R-6)

- Désactiver un ingrédient (`actif = false`) ne déclenche aucune FK : une
  composition peut pointer un ingrédient inactif. LOT-02a/LOT-03 doivent
  décider : signalement dans « Données manquantes » de la fiche, ou vigilance
  dédiée. À trancher au LOT-03.

## Fichier de contrôle CI — `web/prisma/checks/c4_supplement_catalogue_v1.sql`

À poser avec la migration (motif `c5_ciqual_reference_v1.sql`) : vérifie la
présence des index (dont le partiel s'il survit à B-1), des CHECK
(`statut_fiche`, `niveau_completude`, `source_provenance`, `contenu_sha256`,
`dose_unite`, `unite`, `fiche_verifiee_signee`), du RLS activé sur les trois
tables, et des quatre FK. Échec = sortie non vide.

## Tests exigés à la pose (revue)

- Idempotence d'import : deux passes du même dump ⇒ aucune nouvelle version
  (dépend de l'empreinte R-1, testé côté LOT-02a).
- Double insertion `(produit, ingrédient, forme = NULL)` rejetée (valide
  l'index partiel — le comportement que B-1 met en jeu).
- Pointeur de version courante : promouvoir une v2 déplace le pointeur, jamais
  deux pointeurs pour un même produit source.

## Validation prévue à la pose

1. Revue adversariale `wn-reviewer` — **faite le 2026-07-24** (GO conditionnel,
   corrections intégrées à ce document).
2. Banc B-1 (drift) — verdict requis AVANT la pose.
3. `npx prisma generate` + `npm run check` (T1).
4. `npm run test:worktree` (passe complète, étape « Dérive schéma ↔ migrations »
   incluse) — migration appliquée **et drift check vert**, pas seulement
   applicable.
5. Après merge : vérification de la base de production (`execute_sql`,
   agrégat `_prisma_migrations` par nom + présence des trois tables + RLS).
