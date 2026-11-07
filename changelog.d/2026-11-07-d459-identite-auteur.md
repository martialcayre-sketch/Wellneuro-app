### BIO-PARCOURS : D-459, identité d'auteur des versions de protocole et des validations pour diffusion (BP-14, 2026-11-07)

PR de décision seule de la file C (place 8), sans code ni migration.

- `docs/decisions/D-459.md` (acceptée par le responsable) : deux
  colonnes facultatives, `creePar` sur la version et `validePar` sur
  l'approbation, posées par le serveur depuis l'e-mail de session ; nulles
  depuis le portail ; `approvedBy` inchangé. Reprise de l'historique par la
  migration, à partir du praticien du dossier, pour les versions relues et
  les approbations ; la migration refuse de s'appliquer si elle trouve plus
  d'un praticien. La date d'application sépare l'auteur déduit de l'auteur
  consigné. Ni affichage ni drapeau ; effacement inchangé, tenu par un banc.
- Registre RGPD (rubrique 5) : une phrase sur les deux colonnes.
- Fiche LOT-14, campagne et journal de F10 mis à jour.
- Suite : la migration seule, la release-db constatée, puis le code et ses
  bancs.
