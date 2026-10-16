### Biologie : la proposition de bilan lit les remboursements signés, et le dit au patient sans dire qui paie (lettre f, F54, D-316, 2026-10-17)

Lettre f (file A, rang 2), sans migration. M-3c est clos : cinq
correspondances signées et le constat « aucun acte » de l'homocystéine (V105)
sont en base. Jusqu'ici la proposition de bilan ne les lisait pas : toutes ses
analyses sortaient « non évalué », alors que la fiche d'analyte de la
Bibliothèque disait déjà le vrai état.

- **Proposition** (`propositionService.ts`) : la carte des remboursements
  est passée au moteur, dérivée par `deriverRemboursement` comme la fiche
  d'analyte — correspondance signée vers un acte actif du millésime courant,
  sinon constat « aucun acte » du millésime courant, sinon « non évalué ».
  Une seule lecture des analytes (validation médicale et remboursement).
- **Document patient** (`documentPatient.ts`) : « Remboursement par
  l'assurance maladie non vérifié à ce jour », « Remboursé seulement s'il
  est demandé avec d'autres examens », « Non remboursé par l'assurance
  maladie » ; rien pour une analyse remboursable. « (resterait à votre
  charge) » est retiré.
- **Courrier au médecin** (`courrier.ts`) : D-309 §2-§3 avancés —
  « Remboursement non évalué » et « Hors nomenclature » seul, sans « (à la
  charge du patient) ». Code d'acte par ligne et §4 restent au rang 4.
- **Une fois par document** (`mentionsRemboursement`, `remboursable.ts`) :
  les mentions nomment les analyses distinctes, après les lignes. Ligne à
  ligne, le banc du courrier montait à 8 759 caractères, au-delà de la borne
  de consignation (8 000) ; au catalogue réel, pire cas réaliste 7 348
  (courrier) et 7 691 (document patient).
- **Cockpit** (`PropositionBilanPanel.tsx`) : chaque analyse porte son état,
  aux libellés de la fiche d'analyte (désormais dans la feuille pure
  `libellesRemboursement.ts`) ; la limite « non évalué » nomme les analyses
  restantes des lignes proposées et disparaît quand il n'y en a plus.
- **Bancs** : quatre états, carte (signée, constat courant, constat périmé,
  acte inactif, proposition non signée, sans nomenclature), limite, longueur
  recalibrée sur 35 analyses distinctes et son jumeau patient ; contre-épreuve,
  onze mutations rougissent.
