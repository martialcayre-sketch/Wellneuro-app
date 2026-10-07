### BIO-INGEST LOT-04 : transmission du compte rendu par le patient, livrée drapeau éteint (D-269, 2026-10-07)

Code de la transmission, sous `WN_BIO_PORTAIL_ENABLED` **éteint** (page en
404, route en 503, aucun lien) ; la migration
`bio_ingest_transmission_patient_v1` est appliquée et constatée depuis le
2026-10-07.

- **Portail** : page « Transmettre un compte rendu d'analyses » et route
  `api/portail/comptes-rendus`. Le dossier est celui de la session, jamais un
  identifiant du client. Le dépôt n'appelle pas l'IA. Ordre des gardes :
  drapeau, session, accusé `pris_connaissance` de la version courante
  d'`usage_ia` (recueilli sur l'écran), dossier ouvert, plafonds (3 documents
  en attente ou reçus non purgés, 10 dépôts par 24 h à l'horloge de la base,
  rejugés sous verrou), puis seulement le corps — mêmes types, taille et
  réencodage d'image que le dépôt praticien. Le patient voit date et statut
  (en attente, reçu, validé, refusé, illisible), jamais une valeur.
- **Praticien** : « Voir le document » — le regard qui précède la lecture
  (§1), sans rien envoyer : route journalisée (GD-1), type consigné, `nosniff`,
  image sous `sandbox`, sans cache, 410 une fois purgé. « Écarter ce
  document », motif fermé (illisible, pas un compte rendu de ce patient),
  purge immédiate ; le retrait est refusé sur un document transmis ; une
  validation après l'écart est refusée en clair (409). Un fichier déjà écarté
  et redéposé le dit au patient. Carte du Fil « compte rendu transmis », non écartable,
  éteinte par la lecture lancée ou l'écart. Écart et carte restent sous
  `WN_BIO_INGEST_ENABLED`.
- **Textes** : « L'intelligence artificielle dans Wellneuro » v6 (sans accusé
  dans la séquence ; accusé recueilli au dépôt) et « Vos données
  personnelles » v13 (accusé), mot pour mot comme validés le 2026-10-07. **Au
  déploiement, drapeau éteint, chaque patient repasse par « Avant de
  commencer »** pour la v13 (accepté par le responsable).
- **D-269 précisée** : un document purgé sans écart s'affiche « reçu » ; le
  plafond ne compte que les non purgés.
- Aucune logique clinique, aucun seuil.
