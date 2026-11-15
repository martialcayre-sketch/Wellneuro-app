### Refonte Lien, PAT-6 (seconde partie) : « Me reconnecter » sous le refus 401 d'un dépôt ou d'un enregistrement, la page restant ouverte (2026-11-14)

Code des choix Q2a et Q3a du prototype PAT-6 ([[D-481]], complément DOC-11 ;
[[D-488]], amendement DOC-11), après la garde serveur du dossier de la page
(DOC-12, #2125).

- Q2a : sur U33 (`DepotDocuments`) et U34 (`TransmissionCompteRendu`), un
  dépôt refusé en 401 ne renvoie plus à l'entrée. La page reste ouverte avec
  le fichier et la catégorie choisis, affiche sous le bouton le message servi
  par la route (« Session expirée. Reconnectez-vous. »), puis T-36 « Me
  reconnecter », vers `/portail/connexion`, dans un nouvel onglet. Le
  chargement et l'accusé de U34 gardent leur renvoi silencieux.
- Q3a : même geste sous le message, quand un enregistrement est refusé en 401
  sur U35 (page de la fiche seule ; la fiche de l'entrée U07 ne change pas),
  U39 (`MesChoix`, dans l'accordéon du choix) et U40 (`SignalerProbleme`).
- Rien n'est renvoyé automatiquement : le patient renvoie lui-même depuis
  l'onglet initial. Les autres refus ne proposent pas T-36. Un renvoi après
  la connexion d'un autre patient est refusé par la garde (T-51), sans
  écriture.
- E2E `portail-reconnexion-transmissions.spec.ts` (U34, U39, U40 ; Sophie
  Nicola et Jennifer Martin) ; U33 et U35 tenus par bancs unitaires, leurs
  drapeaux étant éteints dans l'environnement E2E.

Aucun texte neuf, aucune route, garde, drapeau, migration, règle clinique ni
texte de consentement, de droits ou de sécurité modifié.
