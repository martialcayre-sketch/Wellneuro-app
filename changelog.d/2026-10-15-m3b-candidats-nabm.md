### M-3b : les candidats NABM affichés pré-remplis, signés en un clic (F54, 2026-10-15)

- La liste des candidats analyte → acte, préparée le 2026-10-15 dans les
  libellés de la nomenclature et relue en production (catalogue seul,
  millésime V105), entre au code : `web/src/lib/biology-library/candidatsNabm.ts`,
  module pur. Les 85 analytes du catalogue y figurent, chacun avec sa
  situation : libellé explicite (28), acte de groupe (20), à juger (9), aucun
  acte (20), valeur calculée (7), regroupement (1). Chaque candidat porte son
  code d'acte, la nature proposée et son motif.
- La section « Correspondances à la nomenclature » de la fiche d'analyte
  affiche les candidats encore à signer : acte lu par le serveur au
  millésime courant, motif, mention « À juger » le cas échéant, nature
  présélectionnée (modifiable), bouton « Signer cette proposition ». La
  signature passe par la route existante de M-3 : signataire et date posés
  par le serveur, acte revérifié présent et actif.
- Un candidat absent ou inactif au millésime courant n'est pas montré ; un
  couple qui a déjà une ligne en base (signée ou proposition) n'est pas
  reproposé. Rien n'est écrit avant la signature.
- Analytes sans acte, valeurs calculées, regroupement : une mention
  d'information, sans signature. Le constat signé « aucun acte » relève de
  M-3c.
- Aucune migration, aucun schéma modifié ; remboursements toujours dérivés
  des seules lignes signées (`remboursable.ts`, inchangé).
