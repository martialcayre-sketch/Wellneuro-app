### bb : activation de `WN_PORTAIL_TROIS_PLANS` constatée sur un vrai dossier (D-386, H49, 2026-10-28)

- Un dossier de test a reçu une version de protocole enregistrée puis
  diffusée après l'instant retenu (`2026-10-27T00:00:00Z`) ; lecture par
  identifiant en conteneur, en transaction en lecture seule.
- Lecture en ligne par le responsable : les trois plans de chaque action au
  portail, « Jour difficile ? » au plan de secours avec un seul point final,
  et l'aperçu de la sous-vue « Diffusion » identique au portail. Aucune
  anomalie.
- Absence de recul relue avant le constat : aucun déploiement antérieur à
  39131a45 n'a servi la production après l'instant.
- Critère de fin de H49 atteint ; porte 18 levée pour l'ouverture suivante de
  la file C. Registre des drapeaux, fiche H49 (premier fragment de son
  journal) et ligne de la file C mis à jour. Aucun code.
