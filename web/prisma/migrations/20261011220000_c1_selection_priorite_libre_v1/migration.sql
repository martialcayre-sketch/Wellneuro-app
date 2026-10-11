-- C1 — LA PRIORITÉ POSÉE PAR LE PRATICIEN ([[D-279]], lot 5A de BP-26).
--
-- Arbitrage du responsable des 2026-10-10 et 2026-10-11 : les candidats d'axe
-- calculés RESTENT, et le praticien peut EN PLUS poser lui-même une priorité —
-- un domaine pris dans une liste fermée, la même pour tous, et un libellé qu'il
-- écrit. Sans candidat, le protocole n'est plus impossible. MIGRATION SEULE :
-- le code qui écrit et lit ces colonnes vient après la `release-db` et son
-- constat.
--
-- LA SÉLECTION RESTE UNE LIGNE DE `decision_priority_selections` ([[D-127]]) :
-- même fil append-only, mêmes gardes de racine et de fourche, même motif
-- obligatoire. Seul change ce que `candidate_id` peut désigner :
--   - `priority:<id de règle>` — un candidat du moteur, comme avant ; les deux
--     colonnes neuves restent NULL ;
--   - `libre:<domaine>:<16 hex>` — une priorité du praticien ; les deux
--     colonnes portent le domaine et le libellé, et l'identifiant reprend le
--     domaine. Les 16 caractères hexadécimaux sont le début du SHA-256 du
--     libellé normalisé, dérivé au serveur : changer le libellé change
--     l'identifiant, donc la priorité — c'est un pivot au sens de [[D-255]] ;
--     changer le seul motif ne l'est pas.
--
-- CE QUE LA BASE TIENT :
--   1. `domaine_libre` dans la liste fermée : les sept domaines de « Mes
--      plaintes actuelles » (Q_MOD_03), plus `autre`. Une liste de rangement,
--      ni borne ni seuil ;
--   2. `libelle_libre` non vide (`~ '\S'`, jamais `btrim` à un argument) et
--      borné à 200 caractères — borne TECHNIQUE, celle de la priorité de
--      l'objectif négocié ([[D-167]]) ; c'est l'intitulé que le patient lira ;
--   3. la cohérence : une ligne `libre:` porte les deux colonnes et un
--      identifiant qui reprend son domaine ; toute autre ligne n'en porte
--      aucune. Les 8 lignes de production sont toutes `priority:` (constat par
--      conteneur du 2026-10-11) : le CHECK se valide sur l'existant.

-- AlterTable
ALTER TABLE "decision_priority_selections"
  ADD COLUMN "domaine_libre" TEXT,
  ADD COLUMN "libelle_libre" TEXT;

ALTER TABLE "decision_priority_selections"
  ADD CONSTRAINT "decision_priority_selections_domaine_libre_check"
    CHECK ("domaine_libre" IN ('fatigue', 'douleurs', 'digestion', 'surpoids',
                               'sommeil', 'moral', 'mobilite', 'autre')),
  ADD CONSTRAINT "decision_priority_selections_libelle_libre_check"
    CHECK ("libelle_libre" ~ '\S' AND char_length("libelle_libre") <= 200),
  ADD CONSTRAINT "decision_priority_selections_libre_coherence_check"
    CHECK (
      ("candidate_id" LIKE 'libre:%'
        AND "domaine_libre" IS NOT NULL
        AND "libelle_libre" IS NOT NULL
        AND "candidate_id" ~ ('^libre:' || "domaine_libre" || ':[0-9a-f]{16}$'))
      OR
      ("candidate_id" NOT LIKE 'libre:%'
        AND "domaine_libre" IS NULL
        AND "libelle_libre" IS NULL)
    );
