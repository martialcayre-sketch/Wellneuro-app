-- WellNeuro — suivi de 20260723100000 / 20260723120000 (journal des décisions
-- de revue des claims, Atelier v2, voie rapide). Un CINQUIÈME type d'acte :
-- tirage_caduc — la CLÔTURE NEUTRE d'un tirage devenu caduc.
--
-- Constat (2026-07-25) : un tirage échantillonne un lot d'éligibles FIGÉ. Si,
-- entre le tirage et sa conclusion, le lot diverge — des claims échantillonnés
-- validés/rejetés en revue individuelle, ou une nouvelle ingestion —, la
-- signature (decision_lot) devient impossible (etat_divergent, égalité exacte
-- exigée) ET un nouveau tirage est refusé tant que le précédent n'a pas d'issue
-- (anti tirage-shopping). Le tirage se retrouve DEADLOCK : ni signable, ni
-- relançable. Seule sortie jusqu'ici : basculer la source « en revue
-- individuelle » — un DÉFAUT journalisé qui n'a pas eu lieu (et qui fige la
-- prudence d'échantillon à 30 %). tirage_caduc conclut le tirage SANS mentir :
-- aucun statut de claim ne change, aucun défaut n'est allégué.
--
-- La caducité est VÉRIFIÉE côté serveur (lib deciderLot/cloreTirageCaduc :
-- lot éligible courant ≠ éligibles figés) — la clôture d'un tirage encore
-- vivant est refusée, la revue de l'échantillon ne se contourne pas.

-- 1. Élargit l'allowlist des types d'acte au type de clôture neutre.
ALTER TABLE public.rag_corpus_claim_decisions
  DROP CONSTRAINT rag_claim_decisions_type_acte,
  ADD CONSTRAINT rag_claim_decisions_type_acte CHECK (
    type_acte IN (
      'decision_individuelle', 'tirage_echantillon', 'decision_lot',
      'bascule_individuelle', 'tirage_caduc'
    )
  );

-- 2. Pièces d'une clôture caduc — présences ET absences, comme les autres
--    actes : source et tirage référencés, aucune décision (rien n'est décidé),
--    aucun questionnaire (rien n'est restitué). L'echantillon (instantané
--    d'audit : éligibles figés vs lot courant) reste optionnel.
ALTER TABLE public.rag_corpus_claim_decisions
  ADD CONSTRAINT rag_claim_decisions_caduc_complet CHECK (
    type_acte <> 'tirage_caduc'
    OR (source_id IS NOT NULL AND tirage_id IS NOT NULL
        AND decision IS NULL AND questionnaire IS NULL)
  );

-- 3. tirage_caduc est une ISSUE au même titre que decision_lot et
--    bascule_individuelle : un tirage en a AU PLUS UNE, toutes confondues.
--    L'index unique partiel d'issue s'étend au nouveau type — une clôture caduc
--    concurrente d'une signature ou d'une bascule laisse UNE issue, jamais deux.
DROP INDEX rag_claim_decisions_issue_unique;
CREATE UNIQUE INDEX rag_claim_decisions_issue_unique
  ON public.rag_corpus_claim_decisions (tirage_id)
  WHERE type_acte IN ('decision_lot', 'bascule_individuelle', 'tirage_caduc');

-- Le trigger d'insertion (rag_claim_decisions_avant_insertion) n'a pas à
-- changer : sa branche tirage_id valide déjà que la clôture référence un vrai
-- tirage_echantillon de la même source ; sa branche decision_lot ne se
-- déclenche pas pour tirage_caduc.
