-- WellNeuro — suivi de 20260723100000 / 20260725100000 (journal des décisions
-- de revue des claims). Un SIXIÈME type d'acte : etiquetage — J3-12c ([[D-321]],
-- amende [[D-312]] §5 ; arbitrage du responsable du 2026-10-17, « type d'acte
-- neuf »).
--
-- Un claim déjà VALIDE reçoit ses clés de lien — les besoins qu'il sert (1 à 12)
-- et la rubrique de la chaîne d'usage où il s'emploie (les dix rubriques des
-- fiches d'usage, [[D-314]] §8) — SANS être re-signé : ni statut, ni
-- signataire, ni date ne changent. L'acte se journalise sous SON type, pour
-- qu'un compte des signatures ne compte jamais un étiquetage (option écartée :
-- l'inscrire en decision_individuelle VALIDE → VALIDE).
--
-- AUCUNE donnée n'est touchée : la migration élargit une liste fermée et ajoute
-- une contrainte qui ne vise que le type neuf — aucune ligne existante ne la
-- porte. Ni table, ni colonne, ni index : `schema.prisma` est inchangé (les
-- CHECK n'y sont pas modélisés).

-- 1. Élargit la liste fermée des types d'acte.
ALTER TABLE public.rag_corpus_claim_decisions
  DROP CONSTRAINT rag_claim_decisions_type_acte,
  ADD CONSTRAINT rag_claim_decisions_type_acte CHECK (
    type_acte IN (
      'decision_individuelle', 'tirage_echantillon', 'decision_lot',
      'bascule_individuelle', 'tirage_caduc', 'etiquetage'
    )
  );

-- 2. Pièces d'un étiquetage — présences ET absences, comme les autres actes.
--    UN claim par acte (geste individuel, jamais un lot), qui se nomme (`id`,
--    `claimId`) ; aucune décision
--    (rien n'est décidé : `rag_claim_decisions_decide` l'impose déjà, le type
--    n'étant pas dans sa liste) ; ni tirage, ni échantillon, ni questionnaire.
--    L'élément porte ses deux clés : `besoins`, liste NON VIDE d'entiers de 1 à
--    12 ; `rubrique`, une des dix rubriques des fiches d'usage — la même liste
--    que `fiches_usage_v1` ferme pour le texte (`RUBRIQUES_FICHE_USAGE`, un banc
--    du dépôt refuse que les deux divergent).
ALTER TABLE public.rag_corpus_claim_decisions
  ADD CONSTRAINT rag_claim_decisions_etiquetage_complet CHECK (
    type_acte <> 'etiquetage'
    -- COALESCE : une clé ABSENTE rend NULL (`jsonb_typeof`, `->>`), et un
    -- CHECK à NULL PASSE — sans lui, un élément sans besoins ni rubrique
    -- était admis (constaté par le contrat négatif du lot).
    OR COALESCE((
      tirage_id IS NULL AND echantillon IS NULL AND questionnaire IS NULL
      AND jsonb_array_length(claims) = 1
      AND jsonb_typeof(claims -> 0 -> 'id') = 'string'
      AND (claims -> 0 ->> 'id') <> ''
      AND jsonb_typeof(claims -> 0 -> 'claimId') = 'string'
      AND (claims -> 0 ->> 'claimId') <> ''
      AND jsonb_typeof(claims -> 0 -> 'besoins') = 'array'
      AND jsonb_array_length(claims -> 0 -> 'besoins') > 0
      AND NOT jsonb_path_exists(
        claims,
        -- `strict` : en mode `lax` (le défaut), le filtre déplie un tableau
        -- imbriqué, et `[[]]` ou `[[3]]` passaient (revue wn-reviewer du lot).
        'strict $[0].besoins[*] ? (@.type() != "number" || @ < 1 || @ > 12 || @ != @.floor())',
        -- `silent` : en `strict`, une clé absente lèverait une ERREUR au lieu
        -- d'un refus ; l'absence est jugée plus haut (`jsonb_typeof`).
        '{}', true
      )
      AND (claims -> 0 ->> 'rubrique') IN (
        'question', 'population', 'preanalytique_contexte', 'resultats_consequences',
        'interpretations', 'options', 'precautions', 'surveillance_arret',
        'limites', 'argument_preference'
      )
    ), false)
  );

-- Que le claim nommé EXISTE et soit VALIDE est tenu par la route (lib
-- `deciderClaim`, même transaction), comme pour une décision individuelle :
-- le journal ne lit pas la table des claims.
--
-- Le trigger d'insertion (rag_claim_decisions_avant_insertion) n'a pas à
-- changer : ses branches visent tirage_id et decision_lot, absents d'un
-- étiquetage. Le trigger d'ajout seul (rag_claim_decisions_no_dml) tient
-- l'étiquetage comme les autres actes : ce qui est consigné ne se réécrit pas.
