### Biologie : la série des mesures qui font foi, par analyte (BP-03, 2026-10-15)

Code du lot BP-03 (fiche LOT-03), en une PR sans migration ni drapeau neuf,
derrière `isCbResultsEnabled`. Aucune règle clinique, aucun seuil, aucune
qualification de valeur.

- **Sur la fiche du praticien** (« Estimé ↔ mesuré »), au-dessus de la liste
  des saisies qui reste telle quelle : pour chaque analyte, les mesures qui
  font foi dans l'ordre du prélèvement. Chacune porte sa valeur telle qu'en
  base, son unité, le laboratoire lu, l'intervalle et le commentaire du
  laboratoire tels qu'imprimés (« non transcrit » s'il était trop long), et
  trois dates distinctes : prélevé le, entré au dossier le, corrigé le.
- **Position dans le suivi** : « jour n depuis la diffusion du [date] », en
  jours calendaires de Paris, depuis la diffusion en vigueur au prélèvement
  (un prélèvement antérieur à un pivot se date par la diffusion d'alors) ;
  sinon « antérieur à la diffusion » ou « aucune diffusion ».
- **Nombre de points et motifs de non-comparabilité**, comparés à
  l'identique : point unique, unités différentes (graphies comprises),
  laboratoire non identifié, laboratoires différents, contexte de
  prélèvement non renseigné (toujours, jusqu'à BP-05). Jamais d'écart, de
  flèche, de couleur ni de tendance.
- **Les fils annulés n'y entrent pas** (`D-294` §6) ; une révocation les
  fait revenir. Une tête par fil, élue par la règle des corrections.
- **Route** `GET /api/praticien/biologie/resultats` : champ `series` et
  commentaire de la ligne lue (`commentaireLaboratoire`). Module pur
  `serieParAnalyte` ; jours 0 successifs dans `calendrierSuivi`
  (`ouverturesDuCycle`, `joursZeroSuccessifs`), sans changer
  `calendrierDuCycle`. La route et la fiche s'inscrivent au banc des
  lecteurs de commentaires (`D-278` §3).
