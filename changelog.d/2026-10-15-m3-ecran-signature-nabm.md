### M-3 : l'écran de signature des correspondances NABM (F54, 2026-10-15)

- La fiche d'analyte du rayon biologie (Bibliothèque) porte une section
  « Correspondances à la nomenclature ». Le praticien tape le code de l'acte
  (quatre chiffres), l'écran rend l'acte lu dans le millésime courant
  (libellé, coefficient B, entente préalable, acte réservé, remboursement
  partiel, inactif ; jamais d'euros), il choisit la nature (acte isolé, groupe
  imposé, groupe au choix) puis signe. Aucun acte n'est proposé : pas de
  recherche par libellé.
- Signataire (e-mail de session) et date sont posés par le serveur ; la
  décision porte l'état vu à l'écran, et un état qui a bougé n'écrit rien
  (patron de la décision des claims). Refus : acte absent du millésime
  courant ou inactif, analyte inconnu ou inactif, nomenclature non importée.
- Retrait de signature après confirmation : la ligne redevient une
  proposition non signée, rien n'est supprimé. Le retrait désigne la
  signature vue par sa date : un onglet périmé n'efface pas une signature
  posée depuis. Ni le retrait ni une nouvelle signature ne sont journalisés
  (aucune table de journal ; migration exclue par le véhicule) — réserve
  écrite à F54 : un journal précède tout branchement des remboursements
  dans la proposition.
- Après chaque geste, le catalogue est relu : le statut de remboursement de
  la fiche suit la dérivation de `remboursable.ts`, inchangée.
- Routes `GET /api/praticien/biologie/nabm/acte`,
  `GET|POST /api/praticien/biologie/nabm/correspondances`, derrière
  `WN_CB_ENABLED`. Aucune migration, aucun schéma modifié. La signature des
  8 analytes de S-7 reste le geste du responsable.
