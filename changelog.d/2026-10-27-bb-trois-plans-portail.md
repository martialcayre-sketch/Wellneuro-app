### bb, lot 2 : le détail du protocole lit les trois plans de chaque action, et « Jour difficile ? » propose le plan de secours, sous `WN_PORTAIL_TROIS_PLANS` éteint (D-384 §2-§4, D-386, H49)

- La route `api/portail/protocole` sert `troisPlans` — le plan idéal et le
  plan de secours des actions fermes hors pause — hors de la vue signée
  `c1-patient-protocol-view-v2`, inchangée, seulement quand
  `WN_PORTAIL_TROIS_PLANS` vaut `true` et que la version servie a été créée
  sous la garde étendue : colonne `protocol_drafts.created_at` strictement
  postérieure à `2026-10-27T00:00:00.000Z`. Le `createdAt` du contenu, hérité,
  n'est jamais lu ; date absente ou illisible, ou plan vide : refus.
- Le détail du protocole lit alors, pour ces actions, « Selon votre journée : »
  puis « Si tout va bien », « Au quotidien », « Si c’est plus dur », chacun
  devant son plan (texte de D-384 §2, relu par un banc) ; « Jour difficile ? »
  propose le plan de secours de la première action ferme hors pause.
- Drapeau neuf et éteint : fermé, ou version antérieure, le portail sert le
  protocole exactement comme avant. Sans migration. Le nom du drapeau,
  l'instant et la forme sont écrits dans D-386 (lot 2) et
  `docs/FEATURE_FLAGS.md`.
