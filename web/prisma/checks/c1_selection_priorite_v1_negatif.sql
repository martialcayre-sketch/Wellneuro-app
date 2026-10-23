-- Contrat de la sélection praticien d'une priorité (`D-127`).
--
-- La table promet sept choses, et ce fichier les éprouve TOUTES :
--   1. une sélection valide est ACCEPTÉE, et une SECONDE sélection CHAÎNÉE sur
--      elle aussi — corriger son choix crée une ligne, jamais un `UPDATE` ;
--   2. DEUX RACINES sur la même carte sont REFUSÉES (unicité partielle) : deux
--      clics simultanés n'ouvrent pas deux fils concurrents ;
--   3. DEUX SUCCESSEURS de la même ligne sont REFUSÉS. C'est le resserrement
--      assumé par rapport aux autres chaînes `supersedes_*` du dépôt, qui
--      tolèrent la fourche et la tranchent à la lecture : ici deux sélections
--      concurrentes de la même carte seraient deux praticiens croyant chacun
--      avoir décidé, et la base refuse plutôt que d'élire. C'est aussi LE cas
--      qui distingue l'index livré d'un index faux plausible — une unicité
--      posée sur `(id_patient, decision_card_id, supersedes_selection_id)`
--      passerait 1 et 2 sans broncher et échouerait ici seulement ;
--   4. les CHECK mordent (23514) : motif vide, réduit à des blancs
--      (tabulations comprises) ou au-delà de 2000 ; candidat vide ; auteur
--      vide ou au-delà de 320 ; empreinte de carte qui n'est pas un SHA-256
--      canonique ; ligne qui se supplante elle-même ;
--      Et depuis [[D-279]] (priorité posée par le praticien) : domaine hors
--      liste fermée ; libellé vide, réduit à des blancs ou au-delà de 200 ;
--      ligne `libre:` sans domaine ou sans libellé, ou dont l'identifiant ne
--      reprend pas le domaine ; candidat du moteur qui porterait l'un des deux ;
--      Et depuis [[D-338]] §3 (besoins visés d'une priorité libre) : besoin
--      hors de 1 à 12, élément NULL, doublon, ordre non croissant, tableau à
--      deux dimensions, candidat du moteur qui porterait des besoins visés ;
--      les douze besoins, une visée partielle et l'absence (`{}`, valeur par
--      défaut) sont acceptés, et corriger les seuls besoins visés chaîne ;
--   5. la table porte EXACTEMENT treize colonnes, liste blanche — un
--      `commentaire` ou un `verdict` arrivé sans arbitrage se verrait ici ;
--   6. la clé étrangère vers `patients` est en ON DELETE RESTRICT : la
--      suppression nommée reste celle de `patient/effacement.ts`, jamais une
--      cascade silencieuse ;
--   7. la RLS deny-all est active et sans policy (posture D-005) — la ligne
--      dit « pour ce patient, le praticien a retenu cette priorité, et voici
--      pourquoi », donnée de santé nominative.
--
-- Tout se déroule dans une transaction annulée à la fin : les fixtures posées
-- ci-dessous ne survivent pas au fichier.
BEGIN;

DO $$
DECLARE
  accepte boolean;
  nb integer;
  i integer;
  colonnes text[];

  -- 64 caractères hexadécimaux minuscules : la forme que rend
  -- `canonicalSha256`, et la seule que le CHECK d'empreinte admet.
  EMPREINTE CONSTANT text := repeat('ab', 32);

  COLONNES_ATTENDUES CONSTANT text[] := ARRAY[
    'besoins_vises', 'candidate_id', 'created_at', 'decision_card_id',
    'decision_card_input_hash', 'domaine_libre', 'id', 'id_patient',
    'libelle_libre', 'rationale', 'selected_at', 'selected_by_email',
    'supersedes_selection_id'
  ];

  -- Identifiant libre bien formé : `libre:<domaine>:<16 hex>`.
  ID_LIBRE CONSTANT text := 'libre:sommeil:0123456789abcdef';

  -- Chaque entrée : une insertion qui DOIT échouer sur un CHECK. Toutes visent
  -- le patient de fixture : le CHECK est alors le SEUL motif de rejet
  -- possible. Si le CHECK visé disparaît, l'insertion est ACCEPTÉE et le cas
  -- le dit — au lieu d'être masqué par une violation de clé étrangère.
  cas CONSTANT text[][] := ARRAY[
    ['motif vide — une priorité choisie sans motif écrit ne se relit pas',
     $q$INSERT INTO decision_priority_selections (id, id_patient, decision_card_id, decision_card_input_hash, candidate_id, rationale, selected_by_email)
        VALUES ('t1', 'PAT_CONTRAT_SELPRIO', 'CARTE_CONTRAT', repeat('ab', 32), 'priority:REGLE_CONTRAT', '', 'praticien@wellneuro.fr')$q$],
    ['motif réduit à des blancs, tabulations comprises',
     $q$INSERT INTO decision_priority_selections (id, id_patient, decision_card_id, decision_card_input_hash, candidate_id, rationale, selected_by_email)
        VALUES ('t2', 'PAT_CONTRAT_SELPRIO', 'CARTE_CONTRAT', repeat('ab', 32), 'priority:REGLE_CONTRAT', E' \t\r\n', 'praticien@wellneuro.fr')$q$],
    ['motif au-delà de 2000 caractères',
     $q$INSERT INTO decision_priority_selections (id, id_patient, decision_card_id, decision_card_input_hash, candidate_id, rationale, selected_by_email)
        VALUES ('t3', 'PAT_CONTRAT_SELPRIO', 'CARTE_CONTRAT', repeat('ab', 32), 'priority:REGLE_CONTRAT', repeat('x', 2001), 'praticien@wellneuro.fr')$q$],
    ['candidat vide',
     $q$INSERT INTO decision_priority_selections (id, id_patient, decision_card_id, decision_card_input_hash, candidate_id, rationale, selected_by_email)
        VALUES ('t4', 'PAT_CONTRAT_SELPRIO', 'CARTE_CONTRAT', repeat('ab', 32), '   ', 'Motif de contrat.', 'praticien@wellneuro.fr')$q$],
    ['auteur vide — une sélection sans auteur lisible n''est pas attribuable',
     $q$INSERT INTO decision_priority_selections (id, id_patient, decision_card_id, decision_card_input_hash, candidate_id, rationale, selected_by_email)
        VALUES ('t5', 'PAT_CONTRAT_SELPRIO', 'CARTE_CONTRAT', repeat('ab', 32), 'priority:REGLE_CONTRAT', 'Motif de contrat.', '')$q$],
    ['auteur au-delà de 320 caractères',
     $q$INSERT INTO decision_priority_selections (id, id_patient, decision_card_id, decision_card_input_hash, candidate_id, rationale, selected_by_email)
        VALUES ('t6', 'PAT_CONTRAT_SELPRIO', 'CARTE_CONTRAT', repeat('ab', 32), 'priority:REGLE_CONTRAT', 'Motif de contrat.', repeat('x', 321))$q$],
    ['empreinte de carte trop courte',
     $q$INSERT INTO decision_priority_selections (id, id_patient, decision_card_id, decision_card_input_hash, candidate_id, rationale, selected_by_email)
        VALUES ('t7', 'PAT_CONTRAT_SELPRIO', 'CARTE_CONTRAT', repeat('ab', 31), 'priority:REGLE_CONTRAT', 'Motif de contrat.', 'praticien@wellneuro.fr')$q$],
    ['empreinte de carte en majuscules — `canonicalSha256` rend du minuscule',
     $q$INSERT INTO decision_priority_selections (id, id_patient, decision_card_id, decision_card_input_hash, candidate_id, rationale, selected_by_email)
        VALUES ('t8', 'PAT_CONTRAT_SELPRIO', 'CARTE_CONTRAT', repeat('AB', 32), 'priority:REGLE_CONTRAT', 'Motif de contrat.', 'praticien@wellneuro.fr')$q$],
    ['empreinte de carte hors hexadécimal',
     $q$INSERT INTO decision_priority_selections (id, id_patient, decision_card_id, decision_card_input_hash, candidate_id, rationale, selected_by_email)
        VALUES ('t9', 'PAT_CONTRAT_SELPRIO', 'CARTE_CONTRAT', repeat('zz', 32), 'priority:REGLE_CONTRAT', 'Motif de contrat.', 'praticien@wellneuro.fr')$q$],
    -- Patron D-124 : une ligne qui se supplante elle-même ne serait JAMAIS
    -- tête de fil — la sélection disparaîtrait sans que rien ne le signale.
    ['une ligne qui se supplante elle-même',
     $q$INSERT INTO decision_priority_selections (id, id_patient, decision_card_id, decision_card_input_hash, candidate_id, rationale, selected_by_email, supersedes_selection_id)
        VALUES ('t10', 'PAT_CONTRAT_SELPRIO', 'CARTE_CONTRAT', repeat('ab', 32), 'priority:REGLE_CONTRAT', 'Motif de contrat.', 'praticien@wellneuro.fr', 't10')$q$],
    -- ── Priorité posée par le praticien ([[D-279]]) ──
    ['domaine hors liste fermée',
     $q$INSERT INTO decision_priority_selections (id, id_patient, decision_card_id, decision_card_input_hash, candidate_id, rationale, selected_by_email, domaine_libre, libelle_libre)
        VALUES ('t11', 'PAT_CONTRAT_SELPRIO', 'CARTE_CONTRAT_L1', repeat('ab', 32), 'libre:anxiete:0123456789abcdef', 'Motif de contrat.', 'praticien@wellneuro.fr', 'anxiete', 'Retrouver un sommeil réparateur')$q$],
    ['libellé vide',
     $q$INSERT INTO decision_priority_selections (id, id_patient, decision_card_id, decision_card_input_hash, candidate_id, rationale, selected_by_email, domaine_libre, libelle_libre)
        VALUES ('t12', 'PAT_CONTRAT_SELPRIO', 'CARTE_CONTRAT_L2', repeat('ab', 32), 'libre:sommeil:0123456789abcdef', 'Motif de contrat.', 'praticien@wellneuro.fr', 'sommeil', '')$q$],
    ['libellé réduit à des blancs, tabulations comprises',
     $q$INSERT INTO decision_priority_selections (id, id_patient, decision_card_id, decision_card_input_hash, candidate_id, rationale, selected_by_email, domaine_libre, libelle_libre)
        VALUES ('t13', 'PAT_CONTRAT_SELPRIO', 'CARTE_CONTRAT_L3', repeat('ab', 32), 'libre:sommeil:0123456789abcdef', 'Motif de contrat.', 'praticien@wellneuro.fr', 'sommeil', E' \t\r\n')$q$],
    ['libellé au-delà de 200 caractères',
     $q$INSERT INTO decision_priority_selections (id, id_patient, decision_card_id, decision_card_input_hash, candidate_id, rationale, selected_by_email, domaine_libre, libelle_libre)
        VALUES ('t14', 'PAT_CONTRAT_SELPRIO', 'CARTE_CONTRAT_L4', repeat('ab', 32), 'libre:sommeil:0123456789abcdef', 'Motif de contrat.', 'praticien@wellneuro.fr', 'sommeil', repeat('x', 201))$q$],
    ['ligne libre sans libellé',
     $q$INSERT INTO decision_priority_selections (id, id_patient, decision_card_id, decision_card_input_hash, candidate_id, rationale, selected_by_email, domaine_libre)
        VALUES ('t15', 'PAT_CONTRAT_SELPRIO', 'CARTE_CONTRAT_L5', repeat('ab', 32), 'libre:sommeil:0123456789abcdef', 'Motif de contrat.', 'praticien@wellneuro.fr', 'sommeil')$q$],
    ['ligne libre sans domaine',
     $q$INSERT INTO decision_priority_selections (id, id_patient, decision_card_id, decision_card_input_hash, candidate_id, rationale, selected_by_email, libelle_libre)
        VALUES ('t16', 'PAT_CONTRAT_SELPRIO', 'CARTE_CONTRAT_L6', repeat('ab', 32), 'libre:sommeil:0123456789abcdef', 'Motif de contrat.', 'praticien@wellneuro.fr', 'Retrouver un sommeil réparateur')$q$],
    ['identifiant libre qui ne reprend pas le domaine de la ligne',
     $q$INSERT INTO decision_priority_selections (id, id_patient, decision_card_id, decision_card_input_hash, candidate_id, rationale, selected_by_email, domaine_libre, libelle_libre)
        VALUES ('t17', 'PAT_CONTRAT_SELPRIO', 'CARTE_CONTRAT_L7', repeat('ab', 32), 'libre:digestion:0123456789abcdef', 'Motif de contrat.', 'praticien@wellneuro.fr', 'sommeil', 'Retrouver un sommeil réparateur')$q$],
    ['identifiant libre sans empreinte hexadécimale de 16 caractères',
     $q$INSERT INTO decision_priority_selections (id, id_patient, decision_card_id, decision_card_input_hash, candidate_id, rationale, selected_by_email, domaine_libre, libelle_libre)
        VALUES ('t18', 'PAT_CONTRAT_SELPRIO', 'CARTE_CONTRAT_L8', repeat('ab', 32), 'libre:sommeil:XYZ', 'Motif de contrat.', 'praticien@wellneuro.fr', 'sommeil', 'Retrouver un sommeil réparateur')$q$],
    ['candidat du moteur qui porterait un libellé libre',
     $q$INSERT INTO decision_priority_selections (id, id_patient, decision_card_id, decision_card_input_hash, candidate_id, rationale, selected_by_email, domaine_libre, libelle_libre)
        VALUES ('t19', 'PAT_CONTRAT_SELPRIO', 'CARTE_CONTRAT_L9', repeat('ab', 32), 'priority:REGLE_CONTRAT', 'Motif de contrat.', 'praticien@wellneuro.fr', 'sommeil', 'Retrouver un sommeil réparateur')$q$],
    -- Chaque moitié de la seconde branche mord seule (revue de la PR #1402).
    ['candidat du moteur qui porterait un libellé libre seul',
     $q$INSERT INTO decision_priority_selections (id, id_patient, decision_card_id, decision_card_input_hash, candidate_id, rationale, selected_by_email, libelle_libre)
        VALUES ('t20', 'PAT_CONTRAT_SELPRIO', 'CARTE_CONTRAT_L10', repeat('ab', 32), 'priority:REGLE_CONTRAT', 'Motif de contrat.', 'praticien@wellneuro.fr', 'Retrouver un sommeil réparateur')$q$],
    ['candidat du moteur qui porterait un domaine libre seul',
     $q$INSERT INTO decision_priority_selections (id, id_patient, decision_card_id, decision_card_input_hash, candidate_id, rationale, selected_by_email, domaine_libre)
        VALUES ('t21', 'PAT_CONTRAT_SELPRIO', 'CARTE_CONTRAT_L11', repeat('ab', 32), 'priority:REGLE_CONTRAT', 'Motif de contrat.', 'praticien@wellneuro.fr', 'sommeil')$q$]
  ];

  -- ── Besoins visés d'une priorité libre ([[D-338]] §3) ──
  -- Chaque entrée nomme en plus le CHECK qui doit mordre : les fixtures portent
  -- une ligne `libre:` complète, et un cas dont la fixture se casserait
  -- passerait sinon en silence par un autre CHECK (revue wn-reviewer de t39 ;
  -- patron du contrat SAF-EI).
  cas_besoins CONSTANT text[][] := ARRAY[
    ['besoin visé 0, hors de 1 à 12',
     $q$INSERT INTO decision_priority_selections (id, id_patient, decision_card_id, decision_card_input_hash, candidate_id, rationale, selected_by_email, domaine_libre, libelle_libre, besoins_vises)
        VALUES ('t22', 'PAT_CONTRAT_SELPRIO', 'CARTE_CONTRAT_B1', repeat('ab', 32), 'libre:sommeil:0123456789abcdef', 'Motif de contrat.', 'praticien@wellneuro.fr', 'sommeil', 'Retrouver un sommeil réparateur', ARRAY[0])$q$,
     'decision_priority_selections_besoins_vises_bornes_check'],
    ['besoin visé 13, hors de 1 à 12',
     $q$INSERT INTO decision_priority_selections (id, id_patient, decision_card_id, decision_card_input_hash, candidate_id, rationale, selected_by_email, domaine_libre, libelle_libre, besoins_vises)
        VALUES ('t23', 'PAT_CONTRAT_SELPRIO', 'CARTE_CONTRAT_B2', repeat('ab', 32), 'libre:sommeil:0123456789abcdef', 'Motif de contrat.', 'praticien@wellneuro.fr', 'sommeil', 'Retrouver un sommeil réparateur', ARRAY[2, 13])$q$,
     'decision_priority_selections_besoins_vises_bornes_check'],
    ['élément NULL parmi les besoins visés',
     $q$INSERT INTO decision_priority_selections (id, id_patient, decision_card_id, decision_card_input_hash, candidate_id, rationale, selected_by_email, domaine_libre, libelle_libre, besoins_vises)
        VALUES ('t24', 'PAT_CONTRAT_SELPRIO', 'CARTE_CONTRAT_B3', repeat('ab', 32), 'libre:sommeil:0123456789abcdef', 'Motif de contrat.', 'praticien@wellneuro.fr', 'sommeil', 'Retrouver un sommeil réparateur', ARRAY[2, NULL]::integer[])$q$,
     'decision_priority_selections_besoins_vises_bornes_check'],
    ['besoin visé en double — deux écritures d''une même visée, deux cartes',
     $q$INSERT INTO decision_priority_selections (id, id_patient, decision_card_id, decision_card_input_hash, candidate_id, rationale, selected_by_email, domaine_libre, libelle_libre, besoins_vises)
        VALUES ('t25', 'PAT_CONTRAT_SELPRIO', 'CARTE_CONTRAT_B4', repeat('ab', 32), 'libre:sommeil:0123456789abcdef', 'Motif de contrat.', 'praticien@wellneuro.fr', 'sommeil', 'Retrouver un sommeil réparateur', ARRAY[6, 6])$q$,
     'decision_priority_selections_besoins_vises_forme_check'],
    ['besoins visés hors de l''ordre croissant',
     $q$INSERT INTO decision_priority_selections (id, id_patient, decision_card_id, decision_card_input_hash, candidate_id, rationale, selected_by_email, domaine_libre, libelle_libre, besoins_vises)
        VALUES ('t26', 'PAT_CONTRAT_SELPRIO', 'CARTE_CONTRAT_B5', repeat('ab', 32), 'libre:sommeil:0123456789abcdef', 'Motif de contrat.', 'praticien@wellneuro.fr', 'sommeil', 'Retrouver un sommeil réparateur', ARRAY[2, 12, 6])$q$,
     'decision_priority_selections_besoins_vises_forme_check'],
    ['besoins visés en tableau à deux dimensions',
     $q$INSERT INTO decision_priority_selections (id, id_patient, decision_card_id, decision_card_input_hash, candidate_id, rationale, selected_by_email, domaine_libre, libelle_libre, besoins_vises)
        VALUES ('t27', 'PAT_CONTRAT_SELPRIO', 'CARTE_CONTRAT_B6', repeat('ab', 32), 'libre:sommeil:0123456789abcdef', 'Motif de contrat.', 'praticien@wellneuro.fr', 'sommeil', 'Retrouver un sommeil réparateur', ARRAY[[2, 6], [7, 10]])$q$,
     'decision_priority_selections_besoins_vises_forme_check'],
    ['besoins visés indicés à partir de 0 — une autre valeur SQL que {2,6}',
     $q$INSERT INTO decision_priority_selections (id, id_patient, decision_card_id, decision_card_input_hash, candidate_id, rationale, selected_by_email, domaine_libre, libelle_libre, besoins_vises)
        VALUES ('t29', 'PAT_CONTRAT_SELPRIO', 'CARTE_CONTRAT_B8', repeat('ab', 32), 'libre:sommeil:0123456789abcdef', 'Motif de contrat.', 'praticien@wellneuro.fr', 'sommeil', 'Retrouver un sommeil réparateur', '[0:1]={2,6}'::integer[])$q$,
     'decision_priority_selections_besoins_vises_forme_check'],
    ['candidat du moteur qui porterait des besoins visés — ses besoins sont ceux de sa règle signée',
     $q$INSERT INTO decision_priority_selections (id, id_patient, decision_card_id, decision_card_input_hash, candidate_id, rationale, selected_by_email, besoins_vises)
        VALUES ('t28', 'PAT_CONTRAT_SELPRIO', 'CARTE_CONTRAT_B7', repeat('ab', 32), 'priority:REGLE_CONTRAT', 'Motif de contrat.', 'praticien@wellneuro.fr', ARRAY[4])$q$,
     'decision_priority_selections_besoins_vises_libre_check']
  ];
  contrainte text;

  -- La liste fermée, valeur par valeur, et la borne du libellé à 200 pile :
  -- une liste amputée ou une borne passée en `< 200` doit rougir ici.
  DOMAINES CONSTANT text[] := ARRAY[
    'fatigue', 'douleurs', 'digestion', 'surpoids',
    'sommeil', 'moral', 'mobilite', 'autre'
  ];
  d text;
BEGIN
  -- ── 0. Fixture — patient fictif autorisé ─────────────────────────────────
  INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at)
  VALUES ('pat_contrat_selprio', 'PAT_CONTRAT_SELPRIO', 'michel.dogne@example.test',
          'Michel', 'Dogné', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP);

  -- ── 1. Cas POSITIFS : la racine, puis la correction chaînée ──────────────
  BEGIN
    INSERT INTO decision_priority_selections
      (id, id_patient, decision_card_id, decision_card_input_hash, candidate_id, rationale, selected_by_email)
    VALUES ('racine', 'PAT_CONTRAT_SELPRIO', 'CARTE_CONTRAT', EMPREINTE,
            'priority:REGLE_CONTRAT', 'Plainte dominante digestive, patient demandeur.',
            'praticien@wellneuro.fr');
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION
        'D-127: une sélection VALIDE a été refusée (SQLSTATE %) — une contrainte est trop serrée, la route échouerait en production.',
        SQLSTATE;
  END;

  -- Changer d'avis est un ACTE, pas une rature : la seconde sélection porte la
  -- même carte et chaîne sur la première.
  BEGIN
    INSERT INTO decision_priority_selections
      (id, id_patient, decision_card_id, decision_card_input_hash, candidate_id, rationale, selected_by_email, supersedes_selection_id)
    VALUES ('corr1', 'PAT_CONTRAT_SELPRIO', 'CARTE_CONTRAT', EMPREINTE,
            'priority:REGLE_CONTRAT_BIS', 'Le sommeil prime après relecture du J7.',
            'praticien@wellneuro.fr', 'racine');
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION
        'D-127: la CORRECTION chaînée d''une sélection a été refusée (SQLSTATE %) — l''unicité est-elle devenue TOTALE ? Le praticien ne pourrait plus changer d''avis.',
        SQLSTATE;
  END;

  -- Une priorité POSÉE PAR LE PRATICIEN ([[D-279]]) est une sélection comme
  -- une autre : acceptée en racine d'une autre carte, et un candidat du moteur
  -- peut lui succéder (les colonnes libres restent alors NULL).
  BEGIN
    INSERT INTO decision_priority_selections
      (id, id_patient, decision_card_id, decision_card_input_hash, candidate_id, rationale, selected_by_email, domaine_libre, libelle_libre)
    VALUES ('libre_racine', 'PAT_CONTRAT_SELPRIO', 'CARTE_CONTRAT_LIBRE', EMPREINTE,
            ID_LIBRE, 'Aucun axe proposé ; le patient place le sommeil en tête.',
            'praticien@wellneuro.fr', 'sommeil', 'Retrouver un sommeil réparateur');
    INSERT INTO decision_priority_selections
      (id, id_patient, decision_card_id, decision_card_input_hash, candidate_id, rationale, selected_by_email, supersedes_selection_id)
    VALUES ('libre_corr', 'PAT_CONTRAT_SELPRIO', 'CARTE_CONTRAT_LIBRE', EMPREINTE,
            'priority:REGLE_CONTRAT', 'Un axe est désormais proposé.',
            'praticien@wellneuro.fr', 'libre_racine');
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION
        'D-279: une priorité LIBRE valide, ou sa correction par un candidat, a été refusée (SQLSTATE %) — une contrainte est trop serrée, la route échouerait en production.',
        SQLSTATE;
  END;

  FOREACH d IN ARRAY DOMAINES LOOP
    BEGIN
      INSERT INTO decision_priority_selections
        (id, id_patient, decision_card_id, decision_card_input_hash, candidate_id, rationale, selected_by_email, domaine_libre, libelle_libre)
      VALUES ('libre_' || d, 'PAT_CONTRAT_SELPRIO', 'CARTE_CONTRAT_DOMAINE_' || d, EMPREINTE,
              'libre:' || d || ':0123456789abcdef', 'Motif de contrat.',
              'praticien@wellneuro.fr', d,
              CASE WHEN d = 'autre' THEN repeat('x', 200) ELSE 'Libellé de contrat' END);
    EXCEPTION
      WHEN others THEN
        RAISE EXCEPTION
          'D-279: le domaine « % » de la liste fermée (ou un libellé de 200 caractères) a été refusé (SQLSTATE %) — la liste a-t-elle été amputée, la borne resserrée ?',
          d, SQLSTATE;
    END;
  END LOOP;

  -- LES BESOINS VISÉS ([[D-338]] §3). L'absence est la valeur par défaut : une
  -- ligne écrite sans la colonne — toutes celles d'avant la migration — porte
  -- `{}`, jamais NULL, et passe les CHECK.
  SELECT count(*) INTO nb
  FROM decision_priority_selections
  WHERE id_patient = 'PAT_CONTRAT_SELPRIO'
    AND besoins_vises IS DISTINCT FROM ARRAY[]::integer[];
  IF nb <> 0 THEN
    RAISE EXCEPTION
      'D-338: % ligne(s) écrite(s) sans besoins visés ne portent pas `{}` — l''absence aurait deux représentations, et la carte deux empreintes.', nb;
  END IF;

  -- Les douze besoins, ceux sans source comprise (arbitrage du 2026-10-22), et
  -- une visée partielle ; puis corriger les SEULS besoins visés chaîne sur la
  -- même priorité — même identifiant, ce n'est pas un pivot.
  BEGIN
    INSERT INTO decision_priority_selections
      (id, id_patient, decision_card_id, decision_card_input_hash, candidate_id, rationale, selected_by_email, domaine_libre, libelle_libre, besoins_vises)
    VALUES ('besoins_tous', 'PAT_CONTRAT_SELPRIO', 'CARTE_CONTRAT_BESOINS_TOUS', EMPREINTE,
            ID_LIBRE, 'Motif de contrat.', 'praticien@wellneuro.fr',
            'sommeil', 'Retrouver un sommeil réparateur', ARRAY[1,2,3,4,5,6,7,8,9,10,11,12]);
    INSERT INTO decision_priority_selections
      (id, id_patient, decision_card_id, decision_card_input_hash, candidate_id, rationale, selected_by_email, domaine_libre, libelle_libre, besoins_vises)
    VALUES ('besoins_racine', 'PAT_CONTRAT_SELPRIO', 'CARTE_CONTRAT_BESOINS', EMPREINTE,
            ID_LIBRE, 'Motif de contrat.', 'praticien@wellneuro.fr',
            'sommeil', 'Retrouver un sommeil réparateur', ARRAY[2, 6, 7, 10, 11, 12]);
    INSERT INTO decision_priority_selections
      (id, id_patient, decision_card_id, decision_card_input_hash, candidate_id, rationale, selected_by_email, domaine_libre, libelle_libre, besoins_vises, supersedes_selection_id)
    VALUES ('besoins_corr', 'PAT_CONTRAT_SELPRIO', 'CARTE_CONTRAT_BESOINS', EMPREINTE,
            ID_LIBRE, 'Le besoin 12 seul reste visé.', 'praticien@wellneuro.fr',
            'sommeil', 'Retrouver un sommeil réparateur', ARRAY[12], 'besoins_racine');
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION
        'D-338: une visée VALIDE (les douze besoins, une visée partielle, ou sa correction chaînée) a été refusée (SQLSTATE %) — une contrainte est trop serrée, la route échouerait en production.',
        SQLSTATE;
  END;

  -- ── 2. DEUX RACINES sur la même carte : refusées ─────────────────────────
  accepte := false;
  BEGIN
    INSERT INTO decision_priority_selections
      (id, id_patient, decision_card_id, decision_card_input_hash, candidate_id, rationale, selected_by_email)
    VALUES ('racine2', 'PAT_CONTRAT_SELPRIO', 'CARTE_CONTRAT', EMPREINTE,
            'priority:REGLE_CONTRAT_TER', 'Second fil concurrent.',
            'praticien@wellneuro.fr');
    accepte := true;
  EXCEPTION
    WHEN unique_violation THEN NULL;
    WHEN others THEN
      RAISE EXCEPTION
        'D-127: la seconde RACINE a été rejetée pour le mauvais motif (SQLSTATE %, attendu 23505 unique_violation)',
        SQLSTATE;
  END;
  IF accepte THEN
    RAISE EXCEPTION
      'D-127: une SECONDE RACINE a été ACCEPTÉE sur la même carte — deux fils concurrents, donc deux praticiens croyant chacun avoir décidé.';
  END IF;

  -- Une racine sur une AUTRE carte reste légitime : la garde est par carte.
  BEGIN
    INSERT INTO decision_priority_selections
      (id, id_patient, decision_card_id, decision_card_input_hash, candidate_id, rationale, selected_by_email)
    VALUES ('racine_autre', 'PAT_CONTRAT_SELPRIO', 'CARTE_CONTRAT_J21', EMPREINTE,
            'priority:REGLE_CONTRAT', 'Nouveau jalon, nouvelle carte.',
            'praticien@wellneuro.fr');
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION
        'D-127: une racine sur une AUTRE carte a été refusée (SQLSTATE %) — la garde de racine déborde son périmètre.',
        SQLSTATE;
  END;

  -- ── 3. DEUX SUCCESSEURS de la même ligne : refusés ───────────────────────
  -- LE cas qui distingue l'index livré d'un index faux plausible : une unicité
  -- posée sur (patient, carte, supersedes) passerait les cas 1 et 2 puis
  -- échouerait ici seulement.
  accepte := false;
  BEGIN
    INSERT INTO decision_priority_selections
      (id, id_patient, decision_card_id, decision_card_input_hash, candidate_id, rationale, selected_by_email, supersedes_selection_id)
    VALUES ('corr1bis', 'PAT_CONTRAT_SELPRIO', 'CARTE_CONTRAT', EMPREINTE,
            'priority:REGLE_CONTRAT_TER', 'Fourche.',
            'praticien@wellneuro.fr', 'racine');
    accepte := true;
  EXCEPTION
    WHEN unique_violation THEN NULL;
    WHEN others THEN
      RAISE EXCEPTION
        'D-127: la FOURCHE a été rejetée pour le mauvais motif (SQLSTATE %, attendu 23505 unique_violation)',
        SQLSTATE;
  END;
  IF accepte THEN
    RAISE EXCEPTION
      'D-127: une FOURCHE a été ACCEPTÉE — le fil d''une carte doit rester strictement linéaire, la lecture n''a aucune règle de départage à appliquer.';
  END IF;

  -- ── 4. Les CHECK mordent ─────────────────────────────────────────────────
  FOR i IN 1 .. array_length(cas, 1) LOOP
    accepte := false;
    BEGIN
      EXECUTE cas[i][2];
      accepte := true;
    EXCEPTION
      WHEN check_violation THEN NULL;
      WHEN others THEN
        RAISE EXCEPTION
          'D-127: « % » rejeté pour le mauvais motif (SQLSTATE %, attendu 23514 check_violation) — le CHECK visé a-t-il disparu ?',
          cas[i][1], SQLSTATE;
    END;
    IF accepte THEN
      RAISE EXCEPTION 'D-127: « % » a été ACCEPTÉ alors qu''il doit être rejeté', cas[i][1];
    END IF;
  END LOOP;

  -- Les besoins visés : chaque CHECK mord sous son PROPRE nom.
  FOR i IN 1 .. array_length(cas_besoins, 1) LOOP
    accepte := false;
    contrainte := NULL;
    BEGIN
      EXECUTE cas_besoins[i][2];
      accepte := true;
    EXCEPTION
      WHEN check_violation THEN
        GET STACKED DIAGNOSTICS contrainte = CONSTRAINT_NAME;
      WHEN others THEN
        RAISE EXCEPTION
          'D-338: « % » rejeté pour le mauvais motif (SQLSTATE %, attendu 23514 check_violation)',
          cas_besoins[i][1], SQLSTATE;
    END;
    IF accepte THEN
      RAISE EXCEPTION 'D-338: « % » a été ACCEPTÉ alors qu''il doit être rejeté', cas_besoins[i][1];
    END IF;
    IF contrainte IS DISTINCT FROM cas_besoins[i][3] THEN
      RAISE EXCEPTION
        'D-338: « % » rejeté par % au lieu de % — la fixture a-t-elle cassé un autre CHECK ?',
        cas_besoins[i][1], contrainte, cas_besoins[i][3];
    END IF;
  END LOOP;

  -- ── 5. Treize colonnes exactes, liste blanche ────────────────────────────
  -- `column_name` est un `sql_identifier`, pas un `text` : sans la conversion,
  -- la comparaison avec `COLONNES_ATTENDUES` ne porte pas sur le même type.
  SELECT array_agg(c.column_name::text ORDER BY c.column_name) INTO colonnes
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'decision_priority_selections';
  IF colonnes IS DISTINCT FROM COLONNES_ATTENDUES THEN
    RAISE EXCEPTION
      'D-127: colonnes inattendues sur decision_priority_selections — attendu %, trouvé %',
      COLONNES_ATTENDUES, colonnes;
  END IF;

  -- Les colonnes porteuses sont NOT NULL : une sélection sans patient, sans
  -- carte, sans empreinte, sans candidat, sans motif ou sans auteur n'est pas
  -- un acte relisible.
  SELECT count(*) INTO nb
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'decision_priority_selections'
    AND is_nullable = 'NO'
    AND column_name IN ('id_patient', 'decision_card_id', 'decision_card_input_hash',
                        'candidate_id', 'rationale', 'selected_by_email');
  IF nb <> 6 THEN
    RAISE EXCEPTION 'D-127: % colonne(s) porteuse(s) NOT NULL au lieu de 6', nb;
  END IF;

  -- Les besoins visés aussi ([[D-338]] §3) : NULL serait une seconde
  -- représentation de l'absence, à côté de `{}`.
  SELECT count(*) INTO nb
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'decision_priority_selections'
    AND column_name = 'besoins_vises' AND is_nullable = 'NO';
  IF nb <> 1 THEN
    RAISE EXCEPTION 'D-338: `besoins_vises` admet NULL — l''absence aurait deux représentations';
  END IF;

  -- La fonction de forme est IMMUTABLE : un CHECK qui appellerait une fonction
  -- VOLATILE pourrait juger deux fois la même ligne différemment.
  SELECT count(*) INTO nb
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'selection_priorite_besoins_croissants'
    AND p.provolatile = 'i';
  IF nb <> 1 THEN
    RAISE EXCEPTION 'D-338: `selection_priorite_besoins_croissants` absente ou non IMMUTABLE';
  END IF;

  -- ── 6. La clé étrangère vers `patients` est en ON DELETE RESTRICT ────────
  SELECT count(*) INTO nb
  FROM pg_constraint con
  JOIN pg_class enfant ON enfant.oid = con.conrelid
  JOIN pg_class ref ON ref.oid = con.confrelid
  WHERE con.contype = 'f'
    AND enfant.relname = 'decision_priority_selections'
    AND ref.relname = 'patients'
    AND con.confdeltype = 'r';
  IF nb <> 1 THEN
    RAISE EXCEPTION
      'D-127: clé étrangère vers patients absente ou hors ON DELETE RESTRICT (% trouvée[s]) — l''effacement IDP2 deviendrait une cascade silencieuse', nb;
  END IF;

  -- ── 7. Deny-all RLS (posture D-005) ──────────────────────────────────────
  SELECT count(*) INTO nb
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'decision_priority_selections'
    AND c.relrowsecurity;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'D-127: RLS désactivée sur decision_priority_selections';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'decision_priority_selections'
  ) THEN
    RAISE EXCEPTION 'D-127: policy inattendue (deny-all attendu)';
  END IF;

  -- ── 8. La FORME des deux gardes, pas seulement leur comportement ─────────
  -- Les cas 2 et 3 disent ce que la base FAIT ; ceci dit ce qu'elle EST. Un
  -- `@@unique` redéclaré au schéma rendrait la garde de racine TOTALE sans que
  -- la dérive schéma ↔ migrations rougisse, puisque l'état serait cohérent —
  -- et plus aucune correction ne passerait.
  SELECT count(*) INTO nb
  FROM pg_index i
  JOIN pg_class ix ON ix.oid = i.indexrelid
  WHERE ix.relname = 'c1_selection_priorite_racine_unique'
    AND i.indrelid = 'public.decision_priority_selections'::regclass
    AND i.indisvalid AND i.indisunique AND i.indpred IS NOT NULL;
  IF nb <> 1 THEN
    RAISE EXCEPTION
      'D-127: `c1_selection_priorite_racine_unique` n''est plus un index UNIQUE À PRÉDICAT — soit l''unicité est devenue totale (plus aucune correction possible), soit le nom de la garde a été donné à autre chose.';
  END IF;

  SELECT count(*) INTO nb
  FROM pg_index i
  JOIN pg_class ix ON ix.oid = i.indexrelid
  WHERE ix.relname = 'c1_selection_priorite_supersedes_unique'
    AND i.indrelid = 'public.decision_priority_selections'::regclass
    AND i.indisvalid AND i.indisunique AND i.indpred IS NULL;
  IF nb <> 1 THEN
    RAISE EXCEPTION
      'D-127: `c1_selection_priorite_supersedes_unique` est absent, invalide ou devenu partiel — la fourche redeviendrait représentable.';
  END IF;

  RAISE NOTICE 'SELECTION PRIORITE: racine acceptée, correction chaînée acceptée, racine d''une autre carte acceptée, priorité libre acceptée et corrigée par un candidat, besoins visés acceptés (douze, partiels, absents, corrigés), seconde racine refusée, fourche refusée, % cas rejetants dont un CHECK de non-réflexivité, % refus de besoins visés chacun sous son propre CHECK, 13 colonnes exactes, 6 NOT NULL et besoins visés NOT NULL, fonction de forme IMMUTABLE, 1 FK RESTRICT, deux gardes sous leur forme attendue, RLS deny-all.',
    array_length(cas, 1), array_length(cas_besoins, 1);
END $$;

ROLLBACK;
