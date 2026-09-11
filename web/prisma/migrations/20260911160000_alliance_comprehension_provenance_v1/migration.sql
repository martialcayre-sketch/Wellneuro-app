-- Alliance 6.0-B — D'OÙ VIENT LE TEXTE PUBLIÉ dans « Ce que j'ai compris de
-- vous ». Pendant de la provenance de l'objectif négocié (2026-09-10), pour la
-- seule surface qui en manquait.
--
-- Migration confirmée explicitement par le responsable le 2026-09-11 (« enchaîne
-- tous les lots »). Gate humain : revue + go avant merge, puis `release-db`
-- approuvée et CONSTATÉE par conteneur — `D-087`. Aucun code consommateur ne
-- part avec elle.
--
-- ADDITIVE UNIQUEMENT : quatre colonnes nullables, quatre contraintes. Aucun
-- DROP, aucun renommage, aucun backfill, aucune colonne existante modifiée.
-- L'unique ligne de production les porte toutes à NULL et satisfait les quatre.
--
-- « PARTI DE », ET NON « CITÉ MOT POUR MOT ». C'est la différence de fond avec
-- `enonce_source` sur `objectifs_negocies`, et elle est structurelle : le
-- verrou de publication REFUSE de publier un texte identique au tirage. Le
-- texte publié diffère donc TOUJOURS de sa source, par construction. `source`
-- ne dit pas « ceci est la phrase du modèle » — il dit « le praticien est parti
-- de ce tirage-là pour écrire la sienne ».
--
-- CE QUE LE SERVEUR VÉRIFIE, ET CE QU'IL NE VÉRIFIE PAS — écrit ici pour que
-- personne ne lise ces colonnes comme une preuve qu'elles ne sont pas.
--
--   Il VÉRIFIE l'appartenance : que `source_id` désigne un tirage EXISTANT, du
--   MÊME dossier, produit sous la consigne courante. Le navigateur ne peut donc
--   pas nommer une source qui n'existe pas, ni celle d'un autre patient.
--
--   Il NE VÉRIFIE PAS l'usage. La provenance de l'objectif se CONSTATE par
--   comparaison de textes (`provenanceVerifiee.ts`, `D-167` §6) ; ici cette
--   méthode est impossible, puisque le verrou garantit que les deux textes
--   diffèrent. Un praticien qui tire une proposition, l'écarte, puis écrit de sa
--   main, verra sa ligne marquée comme partie de ce tirage. C'est la limite
--   assumée du dispositif — et mesurer une « ressemblance » pour la lever
--   poserait un seuil sans provenance (`DC-19`/`DC-20`), ce qui serait pire.
--
-- AUCUNE COLONNE DE SCORE, SEUIL, BANDE NI RANG. La liste blanche de colonnes
-- de cette table vit chez le contrat qui l'a créée —
-- `prisma/checks/alli_dossier_deux_voix_v1_negatif.sql` — et c'est LÀ qu'elle
-- est mise à jour, pas dans une seconde liste qui divergerait (leçon du
-- 2026-09-10).

ALTER TABLE "syntheses_comprehension"
  ADD COLUMN "source" TEXT,
  ADD COLUMN "source_id" TEXT,
  ADD COLUMN "version_consigne" TEXT,
  ADD COLUMN "modele" TEXT;

-- UNE SEULE VALEUR ADMISE, et une taxonomie fermée plutôt qu'un texte libre :
-- une provenance qu'on peut écrire en toutes lettres n'est plus une provenance,
-- c'est un commentaire. Même patron que `alli_objectif_priorite_source_valide`.
ALTER TABLE "syntheses_comprehension"
  ADD CONSTRAINT "alli_comprehension_source_valide"
    CHECK ("source" IS NULL OR "source" IN ('proposition_ia'));

-- LES DEUX VONT ENSEMBLE, DANS LES DEUX SENS. Une source sans identifiant ne se
-- retrouve pas ; un identifiant sans source ne dit pas de quoi il est
-- l'identifiant. L'égalité de deux tests `IS NULL` dit « ou les deux, ou aucun »
-- sans laisser de troisième cas.
ALTER TABLE "syntheses_comprehension"
  ADD CONSTRAINT "alli_comprehension_source_complete"
    CHECK (("source" IS NULL) = ("source_id" IS NULL));

-- CE QUI REND LA PHRASE DU DOCUMENT PATIENT VRAIE. La v2 de « L'intelligence
-- artificielle dans Wellneuro » dit au patient : « Le modèle utilisé et la
-- version du procédé sont enregistrés à chaque fois, ce qui permet de retracer
-- l'origine de chaque texte. » Une ligne qui nomme une source IA sans dire sous
-- quel modèle ni quelle consigne rendrait cette phrase fausse.
--
-- `IS NOT NULL` **ET** `btrim(…) <> ''` : sans le second, la chaîne vide
-- passerait et la promesse serait tenue en apparence seulement. `btrim/2` et
-- non `btrim/1`, qui ne retire que l'espace ASCII — une tabulation passerait.
ALTER TABLE "syntheses_comprehension"
  ADD CONSTRAINT "alli_comprehension_source_rejouable"
    CHECK (
      "source" IS NULL
      OR (
        "version_consigne" IS NOT NULL AND btrim("version_consigne", E' \t\r\n') <> ''
        AND "modele" IS NOT NULL AND btrim("modele", E' \t\r\n') <> ''
      )
    );

-- PAS DE MÉTADONNÉE ORPHELINE. Le miroir de la contrainte ci-dessus : un nom de
-- modèle sur une ligne SANS source raconterait qu'une machine est passée par là
-- alors que le praticien a tout écrit. C'est exactement le contresens que ces
-- colonnes existent pour empêcher.
ALTER TABLE "syntheses_comprehension"
  ADD CONSTRAINT "alli_comprehension_source_sans_orphelin"
    CHECK (
      "source" IS NOT NULL
      OR ("version_consigne" IS NULL AND "modele" IS NULL)
    );
