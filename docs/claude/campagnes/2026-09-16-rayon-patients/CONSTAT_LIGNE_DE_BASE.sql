-- LIGNE DE BASE DE LA CAMPAGNE « LE RAYON PATIENTS » — lue le 2026-09-17.
--
-- COMPTAGES SEULS. Aucune colonne nominative n'est lue : ni nom, ni e-mail, ni
-- identifiant de dossier. C'est ce qui rend cette requête rejouable sans
-- précaution particulière, et c'est délibéré.
--
-- SE REJOUE À L'IDENTIQUE, jamais reformulée : une question reformulée mesure
-- autre chose, et la comparaison ne veut plus rien dire. Depuis un conteneur
-- one-off DÉTACHÉ (`scalingo --app wellneuro run -d`, commande aplatie sur une
-- seule ligne, jamais de heredoc).
--
-- RÉSULTAT DU 2026-09-17 01:33 CEST, huit heures après l'application de la
-- migration et AVANT que le code consommateur ne soit passé en ligne :
--   dossiers=29  consultations=36  fiches=22  anamneses=21
--   avec_adresse=0  avec_nir=0  avec_medecin=0
--
-- CE QUE LES 22 ET 21 ÉTABLISSENT : le manque que la campagne a corrigé n'était
-- pas théorique. Ces renseignements existaient, écrits par des patients, et
-- aucune surface praticien ne les lisait.
--
-- CE QUE LES TROIS ZÉROS SONT : la ligne de base, pas un échec. Ils mesurent
-- l'instant d'avant. Leur valeur vient de la REPRISE.

select
  (select count(*) from patients)                                        as dossiers,
  (select count(*) from patients where adresse is not null)              as avec_adresse,
  (select count(*) from patients where nir is not null)                  as avec_nir,
  (select count(*) from patients where medecin_traitant_nom is not null) as avec_medecin,
  (select count(*) from consultations)                                   as consultations,
  (select count(*) from consultations where fiche_signaletique is not null) as fiches,
  (select count(*) from consultations where anamnese is not null)        as anamneses;
