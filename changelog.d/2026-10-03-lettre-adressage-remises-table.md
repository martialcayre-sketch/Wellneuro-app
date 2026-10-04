### Lettre d'adressage remise au patient — la table des remises ([[D-262]], LOT-01) (2026-10-03)

- **Migration seule** `20261003210000_lettres_adressage_remises_v1` : table
  `lettres_adressage_remises` en ajout seul (dossier, approbation de diffusion,
  lettre consignée, texte figé et son empreinte, date posée par la base en UTC,
  `ordre` posé par la base). UPDATE et TRUNCATE refusés, RLS deny-all, trois
  clés RESTRICT.
- La base refuse toute remise qui ne serait pas la lettre ACTIVE du dossier
  (couverture `adressage` non révoquée sur la consultation porteuse courante),
  sortante et ancrée sur les signaux d'alerte, sous une approbation du même
  dossier dont le protocole s'ouvre sur l'orientation réservée ; le texte doit
  être celui de la lettre, au caractère près. Une remise identique à la remise
  en cours est sans effet.
- L'espèce de lecture `lettre_adressage` est admise par `portail_lectures_patient`.
- Effacement nommé du dossier ; contrat SQL négatif (quatorze promesses) au CI ;
  garde « qui écrit » : aucun émetteur avant le LOT-02.
- Phrase d'accompagnement côté patient signée le 2026-10-03.
