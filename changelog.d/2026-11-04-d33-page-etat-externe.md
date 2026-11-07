### Ajouté

- **Page d'état hors de l'hébergeur, annoncée aux patients (d33, file D).**
  Une sonde Better Stack interroge `https://app.wellneuro.fr/login` toutes les
  3 minutes depuis l'Europe ; sa page d'état `https://wellneuro.betteruptime.com`
  reste lisible quand Scalingo ne répond plus (sans abonnement, aucune adresse
  recueillie chez le tiers ; indexable, interface du prestataire en anglais). Son adresse entre dans les trois e-mails que le
  patient garde ou reçoit en dernier — `acces_portail@3`,
  `acces_portail_lien@2`, `lien_magique@2` —, par un paragraphe qui nomme le
  tiers ; le reste des textes est inchangé au caractère près (banc du
  registre). Textes validés par le responsable le 2026-11-04.
- L'unité du seuil `p95_response_time` des alertes Scalingo est vérifiée :
  millisecondes, le seuil vaut 5 s.
