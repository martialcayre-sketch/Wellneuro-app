### Fiche-trajectoire 5.0 — la porte d'entrée « Trajectoires » (SP-TRAJ LOT-04)

- Nouvelle page `/dashboard/trajectoires` : la liste des patients **orientée
  trajectoire** — Spirale miniature par patient, épisode en cours
  (« Épisode N · T0 + X j »), dernier jalon mesuré, prochaine échéance
  (premier jalon non mesuré à sa date théorique ; « T0 à confirmer » sans
  cycle — rien d'inventé, A8-2). Chaque ligne ouvre la fiche directement sur
  l'onglet Trajectoire (deep-link du LOT-01). Trois états distincts :
  chargement, erreur (jamais déguisée en cabinet vide), vide.
- **Le constat déclencheur de la campagne est réparé** : l'entrée
  « Fiche-trajectoire » du rail ne mène plus à la page héritage
  « Patients & assignations » — elle ouvre la liste trajectoire, et reste
  allumée sur les fiches. « Questionnaires & packs » conserve
  `/dashboard/patients`. Sur mobile, « Fiches » suit le parcours 5.0 et la
  page héritage reste accessible depuis le menu « Plus ».
- `GET /api/praticien/trajectoires` : trajectoires du cabinet en 3 requêtes
  plates (`chargerTrajectoiresCabinet`, partagé avec le repère cabinet du
  LOT-03) ; le résumé est dérivé côté client par une lib pure
  (`resumerTrajectoire`). Aucune migration.
