### Ajouté — le document patient biologie se génère et se consigne (décision F, D-122 §1) (2026-09-03)

- **Générateur `genererDocumentPatientBiologie`** : miroir du courrier médecin
  SANS le médecin — même prédicat d'entrée (`STATUTS_PROPOSES`), même couplage
  rendu↔consignation (le texte consigné est la sortie du rendu patient), mais
  le registre est celui du patient : des phrases qui expliquent (« pourquoi »,
  « ce qui serait analysé », « resterait à votre charge ») sans inquiéter ni
  rien demander. La demande, jamais le résultat.
- **Route sœur** `POST /api/praticien/biologie/proposition/document-patient` :
  texte généré côté serveur (jamais reçu du client), ancre relue dans la
  provenance du bloc rendu (`D-073` §2 — la table l'exige non nulle),
  consignation append-only dans `documents_patient_biologie` (appliquée par
  release-db et constatée par conteneur le 2026-09-03).
- **Le chemin sortant s'inscrit à la carte avec sa garde et son banc** :
  `termeAnxiogene` sur le texte généré, en **refus confirmable**
  (`REGISTRE_ANXIOGENE`, `D-090` — établir ce document est un acte praticien
  explicite ; un faux positif coûte un clic, jamais un document
  indélivrable). Banc de débranchement dans le test de la route, garde réelle
  non mockée.
- **Geste cockpit** dans le panneau de proposition de bilan : « Établir et
  consigner le document patient », offert sur le même prédicat que le
  courrier, avec le second temps confirmable affiché quand le registre est
  signalé. Aucun envoi automatique — remise en consultation.
