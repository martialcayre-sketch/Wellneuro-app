### Données : la colonne NIR est retirée de la base (t03, D-284 (g))

- Migration `patients_retrait_nir_v1` appliquée en production le 2026-10-20
  par release-db, puis constatée par conteneur : colonne et contrainte de
  forme absentes, aucun dossier touché (0 numéro enregistré). Le registre
  RGPD, les commentaires de la route des dossiers et la note du constat de
  ligne de base du rayon patients le disent désormais.
