### Ajouté

- **Agenda du sommeil — suivi du cabinet** : nouveau panneau « Agendas du sommeil en
  cours » dans l'aside du Fil du jour. Il montre, par assignation ouverte, des faits
  datés — nuits distinctes notées, jour dans la fenêtre de 21, date de la dernière nuit
  reçue — et classe chaque agenda en cinq états (à clôturer, silencieux, jamais
  commencé, nuit du jour manquante, à jour). Jamais un score de décrochage ni le
  vocabulaire de la Météo d'adhésion : le module `lib/agenda-sommeil/suivi` est ajouté
  aux modules interdits côté patient (garde structurelle). La route
  `GET /api/praticien/agenda-sommeil/suivi` est une liste de cabinet : scoping
  praticien, pas de journal d'accès dossier (patron météo-adhésion). La fenêtre est
  désormais calculable depuis les seules dates (`calculerFenetreDepuisDates`), sans
  charger les réponses — même arithmétique, une seule source de vérité.
