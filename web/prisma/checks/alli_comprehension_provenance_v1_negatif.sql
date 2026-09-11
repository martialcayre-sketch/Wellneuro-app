-- Contrat de la PROVENANCE du texte publié dans « Ce que j'ai compris de vous »
-- (Alliance 6.0-B, 2026-09-11). Pendant du contrat de la provenance de
-- l'objectif négocié : ce qui a été prouvé là-bas ne se re-prouve pas ici.
--
-- PAS DE LISTE BLANCHE DE COLONNES ICI. Celle de `syntheses_comprehension` vit
-- chez le contrat qui a CRÉÉ la table — `alli_dossier_deux_voix_v1_negatif.sql`
-- — et les quatre colonnes neuves y ont été ajoutées. Une table a UNE liste ;
-- une seconde divergerait (leçon du 2026-09-10).
--
-- La provenance promet quatre choses, et ce fichier les éprouve TOUTES :
--   1. l'écriture SANS provenance reste acceptée — c'est le cas normal, et de
--      loin le plus fréquent : un praticien qui écrit de sa main laisse les
--      quatre colonnes à NULL, et NULL veut dire « ses mots », pas « on ne sait
--      pas » (`DC-24`) ;
--   2. la taxonomie de `source` est FERMÉE — une provenance qu'on peut écrire
--      en toutes lettres n'est plus une provenance, c'est un commentaire ;
--   3. source et identifiant vont ensemble, DANS LES DEUX SENS — une source
--      sans identifiant ne se retrouve pas, un identifiant sans source ne dit
--      pas de quoi il est l'identifiant ;
--   4. une ligne qui nomme une source IA porte son modèle ET sa version de
--      consigne, non vides — c'est la PROMESSE FAITE AU PATIENT dans la v2 de
--      « L'intelligence artificielle dans Wellneuro » ; et réciproquement, un
--      modèle SANS source serait un contresens : il raconterait qu'une machine
--      est passée là où le praticien a tout écrit.
--
-- CE QUE CE CONTRAT NE PROUVE PAS, ET QUI APPARTIENT À LA ROUTE. Que
-- `source_id` désigne un tirage EXISTANT, du MÊME dossier, produit sous la
-- consigne courante : la référence est SOUPLE, sans FK, et la base ne lit pas
-- l'autre table. Et il ne prouve surtout pas que le praticien a RÉELLEMENT
-- utilisé ce tirage — le verrou de publication garantit que les deux textes
-- diffèrent, ce qui rend la constatation par comparaison (`D-167` §6)
-- impossible ici. C'est la limite assumée du dispositif, écrite pour que
-- personne ne lise ces colonnes comme une preuve qu'elles ne sont pas.
--
-- Fixtures posées et transaction annulée : rien ne persiste.

BEGIN;

DO $$
DECLARE
  refuse boolean;
  cas CONSTANT text[][] := ARRAY[
    ['source hors taxonomie (« synthese_ia » n''est pas une valeur admise ici)',
     $q$INSERT INTO syntheses_comprehension (id, id_patient, praticien_email, texte, source, source_id, version_consigne, modele)
        VALUES ('p1', 'PAT_CONTRAT_PROV', 'praticien@wellneuro.fr', 'Ce que j''ai compris', 'synthese_ia', 'compr_1', 'comprehension-v1', 'claude-sonnet-4-6')$q$],
    ['source en toutes lettres (une provenance libre n''est plus une provenance)',
     $q$INSERT INTO syntheses_comprehension (id, id_patient, praticien_email, texte, source, source_id, version_consigne, modele)
        VALUES ('p2', 'PAT_CONTRAT_PROV', 'praticien@wellneuro.fr', 'Ce que j''ai compris', 'repris du résumé proposé', 'compr_1', 'comprehension-v1', 'claude-sonnet-4-6')$q$],
    ['source sans identifiant (elle ne se retrouve pas)',
     $q$INSERT INTO syntheses_comprehension (id, id_patient, praticien_email, texte, source, version_consigne, modele)
        VALUES ('p3', 'PAT_CONTRAT_PROV', 'praticien@wellneuro.fr', 'Ce que j''ai compris', 'proposition_ia', 'comprehension-v1', 'claude-sonnet-4-6')$q$],
    ['identifiant sans source (de quoi est-il l''identifiant ?)',
     $q$INSERT INTO syntheses_comprehension (id, id_patient, praticien_email, texte, source_id)
        VALUES ('p4', 'PAT_CONTRAT_PROV', 'praticien@wellneuro.fr', 'Ce que j''ai compris', 'compr_1')$q$],
    ['source IA sans version de consigne (la promesse au patient devient fausse)',
     $q$INSERT INTO syntheses_comprehension (id, id_patient, praticien_email, texte, source, source_id, modele)
        VALUES ('p5', 'PAT_CONTRAT_PROV', 'praticien@wellneuro.fr', 'Ce que j''ai compris', 'proposition_ia', 'compr_1', 'claude-sonnet-4-6')$q$],
    ['source IA sans modèle (même promesse, même faux)',
     $q$INSERT INTO syntheses_comprehension (id, id_patient, praticien_email, texte, source, source_id, version_consigne)
        VALUES ('p6', 'PAT_CONTRAT_PROV', 'praticien@wellneuro.fr', 'Ce que j''ai compris', 'proposition_ia', 'compr_1', 'comprehension-v1')$q$],
    ['version de consigne VIDE (le IS NOT NULL seul l''aurait laissée passer)',
     $q$INSERT INTO syntheses_comprehension (id, id_patient, praticien_email, texte, source, source_id, version_consigne, modele)
        VALUES ('p7', 'PAT_CONTRAT_PROV', 'praticien@wellneuro.fr', 'Ce que j''ai compris', 'proposition_ia', 'compr_1', '', 'claude-sonnet-4-6')$q$],
    ['modèle fait d''une tabulation (btrim/1 ne l''aurait pas vu)',
     $q$INSERT INTO syntheses_comprehension (id, id_patient, praticien_email, texte, source, source_id, version_consigne, modele)
        VALUES ('p8', 'PAT_CONTRAT_PROV', 'praticien@wellneuro.fr', 'Ce que j''ai compris', 'proposition_ia', 'compr_1', 'comprehension-v1', E'\t')$q$],
    ['modèle ORPHELIN — nommé sans source, il raconte qu''une machine est passée là où le praticien a tout écrit',
     $q$INSERT INTO syntheses_comprehension (id, id_patient, praticien_email, texte, modele)
        VALUES ('p9', 'PAT_CONTRAT_PROV', 'praticien@wellneuro.fr', 'Ce que j''ai compris', 'claude-sonnet-4-6')$q$],
    ['version de consigne ORPHELINE (même contresens)',
     $q$INSERT INTO syntheses_comprehension (id, id_patient, praticien_email, texte, version_consigne)
        VALUES ('p10', 'PAT_CONTRAT_PROV', 'praticien@wellneuro.fr', 'Ce que j''ai compris', 'comprehension-v1')$q$]
  ];
BEGIN
  -- ── 0. Fixture — patient fictif autorisé (identité de fixture du dépôt) ──
  INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at)
  VALUES ('pat_contrat_prov', 'PAT_CONTRAT_PROV', 'michel.dogne@example.test',
          'Michel', 'Dogné', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP);

  -- ── 1. Cas POSITIFS ──────────────────────────────────────────────────────
  BEGIN
    -- LE CAS NORMAL, ET DE LOIN LE PLUS FRÉQUENT : un praticien qui écrit de sa
    -- main. Les quatre colonnes restent NULL, et c'est ce que veut dire « ses
    -- mots ». Si une contrainte rendait la provenance obligatoire, ce cas
    -- tomberait — et toute la surface existante avec lui.
    INSERT INTO syntheses_comprehension (id, id_patient, praticien_email, texte)
    VALUES ('prov_1', 'PAT_CONTRAT_PROV', 'praticien@wellneuro.fr',
            'Vous décrivez un sommeil qui ne répare pas.');

    -- LA PROVENANCE COMPLÈTE. Les quatre colonnes ensemble, sous la seule
    -- valeur de source admise.
    INSERT INTO syntheses_comprehension (
      id, id_patient, praticien_email, texte, source, source_id, version_consigne, modele
    )
    VALUES ('prov_2', 'PAT_CONTRAT_PROV', 'praticien@wellneuro.fr',
            'Vous décrivez un sommeil qui ne répare pas, et un rythme régulier malgré tout.',
            'proposition_ia', 'compr_tirage_1', 'comprehension-v1', 'claude-sonnet-4-6');

    -- UNE RÉVISION QUI REPREND À LA MAIN PERD LA MARQUE. La provenance est
    -- portée par la VERSION, pas par la chaîne : une version supplantée pouvait
    -- venir d'un tirage, celle qui la remplace peut n'en venir d'aucun. Même
    -- règle que pour l'objectif (`D-167` §6).
    INSERT INTO syntheses_comprehension (
      id, id_patient, praticien_email, texte, supersedes_synthese_id
    )
    VALUES ('prov_3', 'PAT_CONTRAT_PROV', 'praticien@wellneuro.fr',
            'Je reprends tout, avec mes mots.', 'prov_2');
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION
        'PROVENANCE COMPRÉHENSION: une écriture VALIDE a été refusée (SQLSTATE %) — une contrainte est trop serrée.',
        SQLSTATE;
  END;

  -- ── 2. Les CHECK mordent ─────────────────────────────────────────────────
  FOR i IN 1 .. array_length(cas, 1) LOOP
    refuse := false;
    BEGIN
      EXECUTE cas[i][2];
    EXCEPTION
      WHEN check_violation THEN
        refuse := true;
      WHEN others THEN
        RAISE EXCEPTION
          'PROVENANCE COMPRÉHENSION test négatif: « % » rejeté pour le mauvais motif (SQLSTATE %, attendu 23514) — le CHECK visé a-t-il disparu ?',
          cas[i][1], SQLSTATE;
    END;
    IF NOT refuse THEN
      RAISE EXCEPTION
        'PROVENANCE COMPRÉHENSION test négatif: « % » a été ACCEPTÉ — le CHECK correspondant manque.',
        cas[i][1];
    END IF;
  END LOOP;

  RAISE NOTICE 'OK — contrat de la provenance de la compréhension vérifié.';
END $$;

ROLLBACK;
