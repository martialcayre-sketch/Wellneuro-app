-- CC-8, journal de lecture du protocole ([[D-315]], lettre p ; fiche H60).
--
-- Une espèce de plus dans `portail_lectures_patient` : `protocole`. La ligne
-- dira « ce patient a ouvert le détail de cette version diffusée de son
-- protocole » ; `id_objet` portera l'identifiant de la diffusion approuvée en
-- vigueur (`ProtocolDiffusionApproval.id`), une ligne par version ([[D-315]]
-- §1-2). Ni l'affichage de l'accueil ni la connexion ne s'y écrivent.
--
-- CE QUE CETTE MIGRATION NE FAIT PAS : aucune colonne, aucune date (la date
-- de première lecture est la migration suivante, celle de ai, [[D-297]] §6 —
-- [[D-315]] §7) ; aucune ligne écrite. Le code qui écrit l'espèce part dans
-- une seconde PR, après la release-db constatée ([[D-087]]).
--
-- Une seule instruction : la contrainte n'est jamais absente, même un
-- instant. La nouvelle liste contient l'ancienne : les lignes existantes
-- (`bilan`, `synthese`, `fiche_assiette`, `lettre_adressage`) la satisfont.
ALTER TABLE "portail_lectures_patient"
  DROP CONSTRAINT "portail_lectures_patient_espece_check",
  ADD CONSTRAINT "portail_lectures_patient_espece_check"
  CHECK ("espece" IN ('bilan', 'synthese', 'fiche_assiette', 'lettre_adressage', 'protocole'));

-- RETOUR ARRIÈRE : par une migration compensatrice relue et approuvée
-- (`release-db`), jamais à la main. Tant qu'aucune lecture `protocole`
-- n'existe : déployer d'abord le code sans l'espèce, puis rétablir le CHECK
-- `espece IN ('bilan', 'synthese', 'fiche_assiette', 'lettre_adressage')`.
-- Une fois des lectures écrites, le retour exige d'abord une décision sur
-- elles : le CHECK rétabli refuserait de valider la table.
