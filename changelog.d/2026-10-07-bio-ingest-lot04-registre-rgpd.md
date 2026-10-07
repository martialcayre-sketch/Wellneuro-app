### Transmission du compte rendu par le patient : décision et registre RGPD avant la migration (BIO-INGEST LOT-04, 2026-10-07)

- **`D-269`** : le patient peut déposer son compte rendu depuis son portail.
  Le dépôt n'appelle pas l'IA : la lecture reste un geste du praticien. Le
  document porte son origine. Un geste neuf, « Écarter ce document », a un
  motif fermé (`illisible`, `document_non_conforme`) et purge le document
  aussitôt. Le patient voit un statut dérivé (en attente, reçu, validé,
  refusé, illisible), jamais une valeur. Bornes : 3 documents « en attente » ou « reçus »,
  10 dépôts par 24 h. L'accusé `usage_ia` v6 est exigé avant tout dépôt. La
  notification passe par la carte du Fil seule.
- **Registre** (`DOSSIER_RGPD.md`, §2 ter, rubriques 5 et 8) : le patient
  émetteur, le motif de purge `ecarte`, les textes v6 et v13 validés par le
  responsable le 2026-10-07, et les conditions de pose de
  `WN_BIO_PORTAIL_ENABLED`.
- **Précondition `D-266` §15 consignée** : LOT-07 est terminé, BP-10 est en
  production.
- Aucun code, aucune migration dans cette PR.
