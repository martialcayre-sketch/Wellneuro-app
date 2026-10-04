-- LETTRE D'ADRESSAGE — LES REMISES AU PATIENT, ET L'ESPÈCE DE LECTURE
-- ([[D-262]], LOT-01).
--
-- Migration autorisée explicitement par le responsable le 2026-10-03 (« enchaîne
-- le LOT-01 », cadrage `CADRAGE_LETTRE_ADRESSAGE_PATIENT_2026-10-03.md` §3.3).
-- MIGRATION SEULE ([[D-087]]) : aucun code n'écrit encore de remise. La remise au
-- clic « Valider pour diffusion » (LOT-02) ne viendra qu'après l'application
-- constatée par conteneur. Le seul code qui l'accompagne est l'effacement nommé
-- du dossier (`patient/effacement.ts`).
--
-- ── UNE REMISE, C'EST QUOI ─────────────────────────────────────────────────
--
-- La trace qu'UNE lettre d'adressage a été mise à disposition d'UN patient, par
-- UN clic « Valider pour diffusion » (l'approbation) d'un protocole qui s'ouvre
-- sur l'orientation vers le médecin ([[D-257]] §8). Le TEXTE EST RECOPIÉ, et
-- c'est l'écart avec les fiches d'assiette : une version de fiche est immuable,
-- `correspondances_medecin` ne l'est pas. « Figée à la remise » ([[D-262]] §3)
-- veut dire un instantané, avec son empreinte, jamais une relecture de la lettre
-- au moment où le patient l'ouvre.
--
-- ── CE QUE LA BASE REFUSE ──────────────────────────────────────────────────
--
-- Cinq refus par trigger — une route se contourne, et une remise fautive est un
-- document de santé étranger, ou non dû, devant un patient :
--
--  1. L'APPROBATION, ET LE PROTOCOLE QU'ELLE APPROUVE, PORTENT SUR CE DOSSIER.
--  2. LE PROTOCOLE APPROUVÉ S'OUVRE SUR L'ORIENTATION (`actions[0].actionId =
--     'orientation-medecin'`, type `medical_referral`) : la lettre part avec
--     l'action qui la nomme, jamais seule.
--  3. LA LETTRE EST UNE LETTRE D'ADRESSAGE DE CE DOSSIER : sortante, ancrée sur
--     la cotation des signaux (`safety-signals-%`).
--  4. LA LETTRE EST LA LETTRE ACTIVE LA PLUS RÉCENTE : celle de la couverture
--     `adressage` non révoquée de plus haut `ordre`, sur la consultation
--     porteuse COURANTE (même règle que `consultationPorteuse.ts` et que
--     `adressages_signal_alerte_v1`). Jamais de repli sur une lettre active
--     plus ancienne.
--  5. LE TEXTE RECOPIÉ EST CELUI DE LA LETTRE, et son empreinte est la sienne
--     (sha-256 du texte en UTF-8, calculée par la base).
--
-- ── UNE REMISE PAR LETTRE, TANT QU'ELLE RESTE LA DERNIÈRE ──────────────────
--
-- Pour un patient, la remise EN COURS est la dernière au sens d'`ordre`, clé
-- posée par la base sous verrou (même raison que les fiches : `now()` est figé
-- par transaction). Si elle porte déjà CETTE lettre, l'insertion est ANNULÉE
-- sans erreur (le trigger rend NULL) : un clic rejoué ne remet rien. Une lettre
-- plus récente, elle, se remet — et devient la remise en cours.
--
-- ── FIGÉE, MAIS EFFAÇABLE ──────────────────────────────────────────────────
--
-- UPDATE et TRUNCATE refusés. DELETE admis : chaque ligne est une donnée de
-- santé du patient, que l'effacement nommé du dossier supprime. Qu'aucun autre
-- code ne la supprime est tenu par une garde du dépôt.
--
-- ── L'ESPÈCE DE LECTURE `lettre_adressage` ─────────────────────────────────
--
-- `portail_lectures_patient` ferme son espèce par un CHECK : en ajouter une
-- demande une migration. `id_objet` porte l'identifiant de la REMISE.

-- CreateTable
CREATE TABLE "lettres_adressage_remises" (
    "id" TEXT NOT NULL,
    "ordre" BIGSERIAL NOT NULL,
    "id_patient" TEXT NOT NULL,
    "id_approbation" TEXT NOT NULL,
    "id_correspondance" TEXT NOT NULL,
    "texte" TEXT NOT NULL,
    "texte_sha256" TEXT NOT NULL,
    "remise_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lettres_adressage_remises_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lettres_adressage_remises_ordre_key" ON "lettres_adressage_remises"("ordre");

-- CreateIndex
-- « La remise en cours de ce patient » (le trigger, le service patient).
CREATE INDEX "lettres_adressage_remises_patient_ordre_idx" ON "lettres_adressage_remises"("id_patient", "ordre");

-- CreateIndex
-- Vérification des clés étrangères quand l'effacement supprime approbations et
-- correspondances.
CREATE INDEX "lettres_adressage_remises_approbation_idx" ON "lettres_adressage_remises"("id_approbation");
CREATE INDEX "lettres_adressage_remises_correspondance_idx" ON "lettres_adressage_remises"("id_correspondance");

-- AddForeignKey
-- ON DELETE RESTRICT partout : l'effacement d'un dossier est une suppression
-- NOMMÉE, qui passe par les remises avant les approbations, les correspondances
-- et le patient.
ALTER TABLE "lettres_adressage_remises" ADD CONSTRAINT "lettres_adressage_remises_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lettres_adressage_remises" ADD CONSTRAINT "lettres_adressage_remises_id_approbation_fkey" FOREIGN KEY ("id_approbation") REFERENCES "protocol_diffusion_approvals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lettres_adressage_remises" ADD CONSTRAINT "lettres_adressage_remises_id_correspondance_fkey" FOREIGN KEY ("id_correspondance") REFERENCES "correspondances_medecin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── LES CHECK ──────────────────────────────────────────────────────────────

ALTER TABLE "lettres_adressage_remises"
  ADD CONSTRAINT "lettres_adressage_remises_texte_non_vide" CHECK ("texte" ~ '\S'),
  ADD CONSTRAINT "lettres_adressage_remises_texte_sha256" CHECK (
    "texte_sha256" = encode(sha256(convert_to("texte", 'UTF8')), 'hex')
  );

-- ── FIGÉE : NI UPDATE NI TRUNCATE ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.lettres_adressage_remises_figee()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION '% : une remise est figée (% refusé) ; seul l''effacement du dossier la supprime.', TG_TABLE_NAME, TG_OP;
END;
$$;

CREATE TRIGGER lettres_adressage_remises_no_update
  BEFORE UPDATE ON public.lettres_adressage_remises
  FOR EACH ROW EXECUTE FUNCTION public.lettres_adressage_remises_figee();

CREATE TRIGGER lettres_adressage_remises_no_truncate
  BEFORE TRUNCATE ON public.lettres_adressage_remises
  FOR EACH STATEMENT EXECUTE FUNCTION public.lettres_adressage_remises_figee();

-- ── AU MOMENT DE L'INSERTION ───────────────────────────────────────────────
--
-- CONSÉQUENCE POUR LE LOT-02 : une remise identique à la remise en cours rend
-- ZÉRO ligne ; elle s'insère par `createMany` (qui rend un compte) ou en SQL.

CREATE OR REPLACE FUNCTION public.lettres_adressage_remises_avant_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  patient_approbation text;
  patient_protocole text;
  premiere_action jsonb;
  lettre_patient text;
  lettre_sens text;
  lettre_ancrage text;
  lettre_texte text;
  porteuse text;
  lettre_due text;
  en_cours text;
BEGIN
  -- 1. L'approbation et le protocole qu'elle approuve.
  SELECT a.id_patient, d.id_patient,
         CASE WHEN jsonb_typeof(d.payload -> 'actions') = 'array' THEN d.payload -> 'actions' -> 0 END
    INTO patient_approbation, patient_protocole, premiere_action
  FROM public.protocol_diffusion_approvals a
  JOIN public.protocol_drafts d ON d.id = a.protocol_draft_id
  WHERE a.id = NEW.id_approbation;
  IF patient_approbation IS DISTINCT FROM NEW.id_patient
     OR patient_protocole IS DISTINCT FROM NEW.id_patient THEN
    RAISE EXCEPTION 'remise refusée : l''approbation % ou son protocole ne porte pas sur ce dossier.', NEW.id_approbation;
  END IF;

  -- 2. Le protocole s'ouvre sur l'orientation.
  IF premiere_action IS NULL
     OR premiere_action ->> 'actionId' IS DISTINCT FROM 'orientation-medecin'
     OR premiere_action ->> 'type' IS DISTINCT FROM 'medical_referral' THEN
    RAISE EXCEPTION 'remise refusée : le protocole approuvé % ne s''ouvre pas sur l''orientation vers le médecin.', NEW.id_approbation;
  END IF;

  -- 3. La lettre est une lettre d'adressage de ce dossier.
  SELECT c.id_patient, c.sens, c.ancrage_version, c.texte
    INTO lettre_patient, lettre_sens, lettre_ancrage, lettre_texte
  FROM public.correspondances_medecin c
  WHERE c.id = NEW.id_correspondance;
  IF lettre_patient IS DISTINCT FROM NEW.id_patient
     OR lettre_sens IS DISTINCT FROM 'sortant'
     OR lettre_ancrage IS NULL
     OR lettre_ancrage NOT LIKE 'safety-signals-%' THEN
    RAISE EXCEPTION 'remise refusée : % n''est pas une lettre d''adressage de ce dossier.', NEW.id_correspondance;
  END IF;

  -- 5. Le texte recopié est celui de la lettre (l'empreinte est tenue par le CHECK).
  IF lettre_texte IS DISTINCT FROM NEW.texte THEN
    RAISE EXCEPTION 'remise refusée : le texte recopié n''est pas celui de la lettre %.', NEW.id_correspondance;
  END IF;

  -- Un patient à la fois : la lecture de la remise en cours et l'`ordre` suivent.
  PERFORM pg_advisory_xact_lock(hashtext('lettres_adressage_remises:' || NEW.id_patient));

  -- 4. La lettre est active, sur la consultation porteuse courante.
  SELECT k.id INTO porteuse
  FROM public.consultations k
  WHERE k.id_patient = NEW.id_patient
    AND k.statut = 'validee'
    AND k.anamnese IS NOT NULL
  ORDER BY k.date_validation DESC, k.created_at DESC
  LIMIT 1;
  IF NOT EXISTS (
    SELECT 1
    FROM public.adressages_signal_alerte s
    WHERE s.id_correspondance = NEW.id_correspondance
      AND s.id_patient = NEW.id_patient
      AND s.acte = 'adressage'
      AND porteuse IS NOT NULL
      AND s.id_consultation = porteuse
      AND NOT EXISTS (
        SELECT 1 FROM public.adressages_signal_alerte r
        WHERE r.acte = 'revocation' AND r.id_adressage_revoque = s.id
      )
  ) THEN
    RAISE EXCEPTION 'remise refusée : la lettre % ne porte aucune couverture active sur la consultation porteuse.', NEW.id_correspondance;
  END IF;
  -- LA PLUS RÉCENTE, ET ELLE SEULE ([[D-262]], cadrage §3.1) : la couverture
  -- active de plus haut `ordre` désigne la lettre due ; une lettre active plus
  -- ancienne est refusée, comme une fiche hors référence ([[D-251]]).
  SELECT s.id_correspondance INTO lettre_due
  FROM public.adressages_signal_alerte s
  WHERE s.id_patient = NEW.id_patient
    AND s.acte = 'adressage'
    AND porteuse IS NOT NULL
    AND s.id_consultation = porteuse
    AND NOT EXISTS (
      SELECT 1 FROM public.adressages_signal_alerte r
      WHERE r.acte = 'revocation' AND r.id_adressage_revoque = s.id
    )
  ORDER BY s.ordre DESC
  LIMIT 1;
  IF lettre_due IS DISTINCT FROM NEW.id_correspondance THEN
    RAISE EXCEPTION 'remise refusée : la lettre % n''est pas la lettre active la plus récente du dossier.', NEW.id_correspondance;
  END IF;

  -- Idempotence : la remise en cours porte déjà cette lettre.
  SELECT r.id_correspondance INTO en_cours
  FROM public.lettres_adressage_remises r
  WHERE r.id_patient = NEW.id_patient
  ORDER BY r.ordre DESC
  LIMIT 1;
  IF en_cours = NEW.id_correspondance THEN
    RETURN NULL;
  END IF;

  -- EN DERNIER, SOUS LE VERROU. L'instant en UTC, quel que soit le fuseau de
  -- la session : la colonne est sans fuseau, et Prisma la lit comme UTC.
  NEW.remise_le := clock_timestamp() AT TIME ZONE 'UTC';
  NEW.ordre := nextval(pg_get_serial_sequence('public.lettres_adressage_remises', 'ordre'));
  RETURN NEW;
END;
$$;

CREATE TRIGGER lettres_adressage_remises_avant_insertion
  BEFORE INSERT ON public.lettres_adressage_remises
  FOR EACH ROW EXECUTE FUNCTION public.lettres_adressage_remises_avant_insertion();

-- Hygiène d'exécution : ces fonctions ne servent qu'aux triggers.
REVOKE EXECUTE ON FUNCTION public.lettres_adressage_remises_figee() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.lettres_adressage_remises_avant_insertion() FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE EXECUTE ON FUNCTION public.lettres_adressage_remises_figee() FROM anon;
    REVOKE EXECUTE ON FUNCTION public.lettres_adressage_remises_avant_insertion() FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE EXECUTE ON FUNCTION public.lettres_adressage_remises_figee() FROM authenticated;
    REVOKE EXECUTE ON FUNCTION public.lettres_adressage_remises_avant_insertion() FROM authenticated;
  END IF;
END $$;

-- Posture `D-005` : deny-all, aucune policy. L'accès passe par l'application.
ALTER TABLE "public"."lettres_adressage_remises" ENABLE ROW LEVEL SECURITY;

-- ── L'ESPÈCE DE LECTURE ────────────────────────────────────────────────────
--
-- Une seule instruction : la contrainte n'est jamais absente. La nouvelle liste
-- contient l'ancienne.
ALTER TABLE "portail_lectures_patient"
  DROP CONSTRAINT "portail_lectures_patient_espece_check",
  ADD CONSTRAINT "portail_lectures_patient_espece_check"
  CHECK ("espece" IN ('bilan', 'synthese', 'fiche_assiette', 'lettre_adressage'));

-- CE QUE LE VERROU NE COUVRE PAS. Il sérialise les remises d'un patient, pas
-- la consignation ni la révocation d'une lettre, qui ne le prennent pas : une
-- lettre révoquée à l'instant d'une remise peut être remise. À la charge des
-- lots suivants :
--  — LOT-03 : « retirée » se calcule À LA LECTURE (cadrage §3.5), jamais
--    depuis la seule existence de la remise ;
--  — LOT-02 : le refus 4 LÈVE une exception (il ne rend pas zéro ligne) ;
--    l'émetteur choisit la lettre par la même règle et isole l'insertion
--    (point de sauvegarde), pour qu'une lettre devenue inactive entre-temps ne
--    fasse pas échouer la diffusion (cadrage §3.1).
--
-- L'IDEMPOTENCE PORTE SUR LA LETTRE, PAS SUR SON TEXTE : la remise est figée
-- ([[D-262]], cadrage §3.2). Une lettre corrigée après remise n'est pas
-- remise de nouveau ; une nouvelle lettre consignée, si.
--
-- RETOUR ARRIÈRE : par une migration compensatrice relue et approuvée
-- (`release-db`), jamais à la main — `migrate resolve --rolled-back` ne vise
-- que les migrations échouées (précédent BIO-INGEST, P3012). Tant qu'aucune
-- remise ni aucune lecture `lettre_adressage` n'existe : déployer d'abord le
-- code sans l'effacement des remises et sans le modèle `LettreAdressageRemise`,
-- puis supprimer la table et les deux fonctions, et rétablir le CHECK
-- `espece IN ('bilan', 'synthese', 'fiche_assiette')`.
