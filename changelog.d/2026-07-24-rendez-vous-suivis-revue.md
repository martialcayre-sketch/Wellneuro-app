### Corrigé

- **Rendez-vous — les quatre suivis de la revue du LOT-04.** Les paramètres
  `du`/`au` de `GET /api/praticien/rendez-vous` sont désormais interprétés comme
  jours civils de Paris (`bornesJourParis`), plus en heure serveur — seule
  fenêtre du périmètre rendez-vous qui ignorait le fuseau du cabinet. La
  comparaison de `praticienEmail` tolère la casse sur le GET et sur la requête
  rendez-vous du Fil, comme partout ailleurs. Le POST refuse un créneau déjà
  passé (`date_passee`, tolérance 5 min) et ne recrée plus un rendez-vous
  identique déjà planifié (`deja_planifie`, garde anti double-soumission).
