### BioFlow : la file durable des lectures — migration seule (D-282, G3 lot 2, 2026-10-13)

- **Migration seule, aucun code consommateur** : la table
  `travaux_extraction_biologique` est créée vide, rien ne l'écrit ni ne la
  lit avant la `release-db` et son constat. La lecture d'un compte rendu ne
  change pas.
- **Ce que la base tient** : statut fermé et sa cohérence (réservation, fin,
  motif d'échec pris dans une liste fermée) ; la lecture ne s'ouvre qu'à son
  tour, jamais à la demande, pour que l'attente dans la file ne mange pas
  ses 5 minutes ; deux tentatives au plus ; un seul travail ouvert par compte
  rendu (unicité partielle) ; import courant du même patient et du même compte
  rendu ; identité figée, travail terminé figé ; clés `RESTRICT` ; RLS
  deny-all.
- **Effacement** : l'effacement d'un dossier supprime ses travaux avant ses
  imports et ses comptes rendus. Table déclarée au registre RGPD (rubrique 5)
  avant sa création.
- **Contrat** : `g3_travaux_extraction_biologique_v1_negatif.sql`, joué au CI.
- **Suite** : processus de fond et bascule de la route sous drapeau éteint
  (lot 3).
