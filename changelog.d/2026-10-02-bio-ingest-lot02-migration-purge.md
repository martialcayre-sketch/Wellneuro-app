### BIO-INGEST LOT-02 : migration de la purge du compte rendu et de l'heure lue (2026-10-02)

- **Migration `bio_ingest_purge_compte_rendu_v1`** ([[D-257]]), demandée
  explicitement par le responsable. **Migration seule** ([[D-087]]) : aucun
  code ne purge encore. Elle s'applique par `release-db` approuvé, puis se
  constate par conteneur.
- **Le document déposé devient effaçable, et seulement lui.** `contenu` peut
  passer à NULL. La purge est datée (`purge_le`, posée par la base en UTC) et
  motivée (`motif_purge`). Le motif est vérifié par la base, pas déclaré :
  - `lignes_decidees` exige que l'extraction courante soit terminée et n'ait
    plus aucune ligne proposée ;
  - `echeance` exige un dépôt de 30 jours révolus.
- **Ce que la base garantit** :
  - pas de purge pendant une extraction en cours ;
  - aucune autre colonne ne change ;
  - un document purgé ne change plus ;
  - aucun import ne s'ouvre sur un document purgé.
  L'empreinte reste.
- **Heure lue** (`lignes_biologiques_candidates.heure_lue`, `false` par
  défaut, figée avec le reste de la ligne). Elle distingue une heure imprimée
  « 00:00 » d'une heure absente. Tant que l'extraction ne l'écrit pas, le
  comportement reste celui d'avant : l'heure est exigée.
- **Document patient « Vos données personnelles » v12**, avec accusé : le
  compte rendu est supprimé dès que chaque valeur relevée lors de sa dernière
  lecture est décidée, et au plus tard 30 jours après son dépôt. Il n'est plus « conservé dans votre
  dossier ».
- **Contrats SQL** :
  - nouveau contrat `bio_ingest_purge_v1_negatif.sql` (12 promesses, 32 mutants
    tués sur 32) ;
  - contrat du staging ajusté (gel hors purge, colonnes, 7 fonctions).
- Le drapeau `WN_BIO_INGEST_ENABLED` reste éteint. Pour le poser, il faut
  désormais :
  - la purge en œuvre (code consommateur, `web/cron.json`) ;
  - un premier passage du cron constaté.
