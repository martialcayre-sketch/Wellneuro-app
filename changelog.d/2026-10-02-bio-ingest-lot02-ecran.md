### BIO-INGEST LOT-02 : écran d'import d'un compte rendu (D-256 A3/A4) (2026-10-02)

- **Panneau « Importer un compte rendu de laboratoire »** sous la saisie du
  bilan, dans « Estimé et mesuré ». Il est visible seulement si
  `WN_BIO_INGEST_ENABLED` est posé (nouveau `bioIngestEnabled` du
  `CbFeatureProvider`). Le drapeau reste **éteint**.
- **Quatre gestes, tous du praticien** :
  - déposer le PDF ;
  - lancer la lecture, avec la mention de l'envoi entier à Anthropic ;
  - décider chaque ligne : valider, écarter avec un motif, ou laisser pour plus
    tard ;
  - retirer un dépôt erroné, en deux temps.
- **Rien n'entre au dossier sans « Valider ».** L'envoi est en tout ou rien ;
  les refus du serveur s'affichent sous chaque ligne.
- **Validation d'une ligne :**
  - la valeur et l'horodatage lus sont pré-remplis et corrigeables ;
  - une valeur lue non chiffrée ne se valide pas ;
  - une unité lue différente de celle du catalogue est signalée et bloquée,
    sans conversion ([[D-157]]) ;
  - **une heure non lue est exigée** : le champ reste vide plutôt que de
    proposer un minuit que personne n'a lu ;
  - les mesures du même analyte déjà au dossier le même jour sont signalées.
- **Lecture asynchrone.** Un compte rendu de 3 pages prend environ 36 s
  (mesure du 2026-10-02), au-delà des 30 s du routeur Scalingo.
  - La route d'extraction rend désormais **202** dès l'ouverture de l'import.
  - L'appel se poursuit dans `after()`.
  - L'écran relit le compte rendu toutes les 3 s jusqu'à l'issue.
  - Une lecture abandonnée (processus mort) se signale « interrompue » après
    la péremption, et se relance.
- Aucune valeur n'est qualifiée (`DC-27`). Aucune migration.
