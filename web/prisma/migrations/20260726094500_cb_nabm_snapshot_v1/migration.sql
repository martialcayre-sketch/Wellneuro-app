-- CB-02a — ce que CB-01 ne savait pas encore stocker.
--
-- Migration ADDITIVE sur des tables VIDES : deux colonnes sur
-- `biology_nabm_actes`, une table de snapshots. Aucun DROP, aucun backfill,
-- aucune colonne existante touchée.
--
-- POURQUOI ELLE EXISTE. La mesure de la source, faite le 2026-07-26 avant
-- d'écrire l'import, a montré que CB-01 laissait tomber deux propriétés que la
-- NABM publie et que le cadrage utilisera :
--
--   `codeIncompatible`  — présent sur 438 des 987 actes, multi-valué sur 201
--       d'entre eux (jusqu'à 17 codes). C'est l'information qui dit que 1208
--       (T.S.H. seule) et 1211 (T.S.H. + T4 libre) ne peuvent PAS figurer sur
--       la même demande. Sans elle, une proposition d'exploration (CB-05)
--       pourrait cumuler deux actes que le payeur rejettera — et le patient
--       l'apprendrait au guichet, pas au cabinet.
--   `regleApplicable`   — présent sur 25 actes, renvoie aux nœuds de règle de
--       la nomenclature (REGLESPECIFIQUE_3, REGLESPECIFIQUE_4).
--
-- Les importer telles quelles coûte deux colonnes ; les découvrir après
-- l'import coûterait cette même migration sur une table peuplée, plus un
-- re-téléchargement.
--
-- VERROU HDS — INCHANGÉ. Aucune colonne de ce lot ne porte de valeur
-- biologique patient ni d'identifiant patient, et aucune ne référence
-- `patients`. Le contrat `prisma/checks/cb_biologie_catalogue_v1.sql` couvre
-- désormais DOUZE tables : la nouvelle y est soumise au même test.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Les deux propriétés manquantes de la nomenclature
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "biology_nabm_actes"
    ADD COLUMN "code_incompatible" TEXT[],
    ADD COLUMN "regle_applicable" TEXT[];

-- Les CHECK ci-dessous ne sont pas prudentiels : chacun encode une mesure des
-- 987 actes de la V105, et non une hypothèse.
--
-- Postgres INTERDIT les sous-requêtes dans un CHECK — impossible d'écrire
-- « tous les éléments vérifient X » avec `unnest`. D'où la forme par
-- `array_to_string` : elle sérialise le tableau et éprouve la chaîne entière
-- d'un seul motif. Piège à connaître : `array_to_string` IGNORE les éléments
-- NULL, si bien qu'un tableau {NULL} produirait la chaîne vide et passerait.
-- C'est `array_position(..., NULL) IS NULL` qui ferme ce trou, pas le motif.
ALTER TABLE "biology_nabm_actes"
    ADD CONSTRAINT "biology_nabm_actes_code_incompatible_check"
        CHECK (
            "code_incompatible" IS NULL
            OR (
                -- Un tableau vide n'est pas « aucune incompatibilité » : c'est
                -- une seconde façon de l'écrire. Une seule représentation, NULL.
                cardinality("code_incompatible") > 0
                AND array_position("code_incompatible", NULL) IS NULL
                -- Mesure : les 966 occurrences renvoient TOUTES à un code
                -- d'acte à quatre chiffres, et toutes se résolvent dans le
                -- ValueSet. Jamais un chapitre, jamais un nœud de règle.
                AND array_to_string("code_incompatible", ',')
                    ~ '^[0-9]{4}(,[0-9]{4})*$'
                -- Le motif seul ne distingue pas {'1234','5678'} de
                -- {'1234,5678'} : sérialisés, les deux donnent la même chaîne.
                -- Les codes étant à largeur fixe, l'arithmétique tranche —
                -- n éléments de 4 chiffres joints par n-1 virgules font
                -- exactement 5n-1 caractères. {'1234,5678'} en fait 9 pour un
                -- seul élément, donc 4 attendus : rejeté.
                AND length(array_to_string("code_incompatible", ','))
                    = 5 * cardinality("code_incompatible") - 1
                -- Mesure : aucun acte ne se déclare incompatible avec lui-même.
                -- Si une version future le faisait, ce serait un défaut de la
                -- source, pas une donnée à propager dans le moteur.
                AND NOT ("code_acte" = ANY("code_incompatible"))
            )
        ),
    ADD CONSTRAINT "biology_nabm_actes_regle_applicable_check"
        CHECK (
            "regle_applicable" IS NULL
            OR (
                cardinality("regle_applicable") > 0
                AND array_position("regle_applicable", NULL) IS NULL
                -- Un nœud de règle porte un NOM en capitales, jamais un code
                -- d'acte. Le motif reste large — la V105 n'expose que
                -- REGLESPECIFIQUE_3 et REGLESPECIFIQUE_4, mais la nomenclature
                -- publie aussi des nœuds CONTINGENCE_* qu'une version future
                -- peut rattacher ici. Ce qu'il interdit vraiment, et c'est le
                -- seul point qui compte : qu'un code d'acte s'y retrouve.
                AND array_to_string("regle_applicable", ',')
                    ~ '^[A-Z][A-Z0-9_]*(,[A-Z][A-Z0-9_]*)*$'
            )
        );

COMMENT ON COLUMN "biology_nabm_actes"."code_incompatible" IS
    'Codes d''actes NABM non cumulables avec celui-ci sur une même demande. Verbatim de la source, jamais dérivé.';
COMMENT ON COLUMN "biology_nabm_actes"."regle_applicable" IS
    'Noms des nœuds de règle de la nomenclature applicables à cet acte (REGLESPECIFIQUE_*).';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Le snapshot de la source — ce que l'audit exigeait sans lui donner de place
-- ─────────────────────────────────────────────────────────────────────────────
--
-- L'audit CB-00 §10 demande de « conserver le snapshot brut, sa version et son
-- contenuSha256 ». CB-01 n'a créé que la colonne de l'EMPREINTE : on gardait la
-- preuve d'un contenu qu'on ne gardait pas. Le millésime importé n'était donc
-- plus consultable une fois la source avancée (V101 → V105 en six mois).
--
-- CE QUE CETTE TABLE ARCHIVE, ET CE QU'ELLE N'ARCHIVE PAS. La formulation
-- initiale de ce commentaire promettait de pouvoir « retyper plus tard une
-- propriété laissée de côté ». C'est FAUX, et la revue du 2026-07-26 a eu
-- raison de le relever : `$expand` ne rend que les propriétés qu'on NOMME, si
-- bien qu'une propriété jamais demandée n'est pas davantage dans le snapshot
-- que dans les colonnes. Archiver une propriété de plus exige de l'ajouter à
-- `NABM_PROPRIETES` et de rejouer l'import — le snapshot n'y change rien.
--
-- Ce qu'il apporte réellement, et qui suffit à le justifier :
--   * les 63 concepts QUI NE SONT PAS DES ACTES — 18 chapitres, 33
--     sous-chapitres, 11 nœuds de règle, la racine. Le catalogue peut citer un
--     code parent (« 06-04 ») mais n'a aucune table pour en afficher le
--     libellé : le snapshot est le seul endroit où « 05 HEMATOLOGIE » survit ;
--   * la preuve de provenance qu'impose la LOv2, opposable parce que son
--     empreinte se recalcule en base ;
--   * l'affranchissement d'un nouvel appel réseau pour relire un millésime que
--     la source a depuis remplacé.
--
-- Il n'est pas ré-importable en l'état : la sérialisation canonique convertit
-- les valeurs en chaînes et trie les listes, là où les colonnes conservent
-- l'ordre de la source. C'est une archive de consultation, pas une sauvegarde.
--
-- LE CONTENU EST DU TEXTE, PAS DU JSONB, ET C'EST DÉLIBÉRÉ. `jsonb` réordonne
-- les clés, normalise les nombres et déduplique — les octets stockés ne sont
-- alors plus ceux qui ont été hachés, et `contenu_sha256` n'atteste plus rien
-- de vérifiable. En TEXT, l'empreinte se recalcule EN BASE, et le CHECK
-- ci-dessous le fait à chaque écriture. Le contenu reste interrogeable par un
-- cast (`"contenu"::jsonb -> ...`) le jour où l'on retypera une propriété.
CREATE TABLE "biology_source_snapshots" (
    "id" TEXT NOT NULL,
    "source_provenance" TEXT NOT NULL,
    "version_source" TEXT NOT NULL,
    "url_source" TEXT NOT NULL,
    "licence" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "contenu_sha256" TEXT NOT NULL,
    "nombre_concepts" INTEGER NOT NULL,
    "nombre_actes" INTEGER NOT NULL,
    "importe_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "biology_source_snapshots_pkey" PRIMARY KEY ("id"),
    -- VOLONTAIREMENT PLUS ÉTROIT que le vocabulaire des autres tables du
    -- catalogue, qui admettent aussi 'labo' et 'saisie_praticien'. Recopier
    -- ces trois valeurs ici aurait été un réflexe, et un mauvais : `contenu`
    -- est un blob de texte libre que le verrou HDS ne peut pas inspecter — il
    -- raisonne sur des NOMS de colonnes, et `contenu` n'en déclenche aucun.
    -- Un jour où l'on y déverserait un export de laboratoire, rien n'avertirait
    -- que le catalogue s'est mis à porter de la donnée patient. Restreindre à
    -- la seule source de ce lot fait qu'élargir devient une migration relue,
    -- c'est-à-dire le moment où quelqu'un regarde.
    CONSTRAINT "biology_source_snapshots_source_check"
        CHECK ("source_provenance" IN ('nabm_smt_ans')),
    -- L'empreinte n'est pas déclarative : elle est VÉRIFIÉE. `sha256` et
    -- `convert_to` sont immutables, un CHECK peut donc les appeler. Écrire un
    -- snapshot dont le hash ne correspond pas au contenu est impossible — et
    -- c'est ce qui distingue une traçabilité d'une prétention de traçabilité.
    CONSTRAINT "biology_source_snapshots_sha256_verifie_check"
        CHECK (encode(sha256(convert_to("contenu", 'UTF8')), 'hex') = "contenu_sha256"),
    CONSTRAINT "biology_source_snapshots_nombres_check"
        CHECK ("nombre_concepts" > 0
               AND "nombre_actes" > 0
               AND "nombre_actes" <= "nombre_concepts"),
    -- La licence doit être NOMMÉE. LOv2 impose de mentionner la source et sa
    -- version : un snapshot sans licence citée est inexploitable en aval, et
    -- l'UI n'aurait rien à afficher.
    CONSTRAINT "biology_source_snapshots_licence_check"
        CHECK (length(btrim("licence")) > 0),
    CONSTRAINT "biology_source_snapshots_url_check"
        CHECK ("url_source" ~ '^https://')
);

-- Un seul snapshot par source et par millésime ; les millésimes s'empilent.
CREATE UNIQUE INDEX "biology_source_snapshots_source_version_key"
    ON "biology_source_snapshots" ("source_provenance", "version_source");

ALTER TABLE "biology_source_snapshots" ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE "biology_source_snapshots" IS
    'Snapshot verbatim d''une source de catalogue, par millésime. Contenu en TEXT pour que son empreinte reste vérifiable en base.';
