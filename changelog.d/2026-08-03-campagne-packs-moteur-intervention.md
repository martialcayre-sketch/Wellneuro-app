### Documentation

- Ajout de la campagne `2026-08-03-packs-moteur-d-intervention-et-corpus-consommable`
  (dossier `docs/claude/campagnes/2026-08-03-packs-moteur-d-intervention-et-corpus-consommable`) :
  huit lots cadrés à partir de l'état réel du dépôt et de la base, mesuré le
  2026-08-03 et consigné dans `AUDIT_ETAT_REEL.md`. Le cadrage corrige la
  demande initiale sur trois points — la certification des questionnaires est
  close depuis `#528` (score-check vert sur 64) ; le moteur d'orientation existe
  déjà (`orientationEngine.ts`, route fail-closed) mais sa table de règles est
  vide et **aucun écran ne l'appelle** ; et l'assouplissement du fail-closed sur
  les claims non validés est inutile, le déficit de la couche intervention étant
  de 327 claims et non de 2982. Inventaire des 48 sources d'intervention NNPP2
  (fiches de synthèse, ordonnances commentées, protocoles, 979 claims dont 54 %
  prescriptifs) ajouté en annexe. LOT-04 marqué sans migration Prisma ; LOT-01,
  LOT-04 et LOT-05 marqués revue adversariale obligatoire. Aucun code ni
  migration dans cette campagne de cadrage.
