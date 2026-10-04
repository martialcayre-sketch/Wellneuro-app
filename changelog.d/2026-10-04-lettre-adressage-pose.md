### Lettre d'adressage remise au patient — pose du drapeau ([[D-262]]) (2026-10-04)

- `WN_LETTRE_ADRESSAGE_PATIENT` est posé en production sur ordre du
  responsable : `env-get` à `true`, conteneurs web recréés, one-off à `"true"`,
  sonde anonyme du portail à 401 au lieu de 503.
- Le constat par le comportement reste à faire sur le dossier de test `PAT011`
  (clic « Valider pour diffusion », portail, impression, une seule remise
  relue par conteneur). Aucun code ne change.
