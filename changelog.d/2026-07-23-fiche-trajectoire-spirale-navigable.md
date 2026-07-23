### Fiche-trajectoire 5.0 — la Spirale devient navigable (SP-TRAJ LOT-01)

- L'onglet Trajectoire de la fiche praticien prend l'ossature de la maquette
  « WellNeuro 5.0 — La Spirale » : en-tête d'identité « {Prénom Nom} —
  épisode N » (contrat d'épisode partagé), un badge par épisode (T0, momentum
  quand il est mesuré), et une **Spirale data-driven** (`SpiraleEpisodes`) —
  un arc concentrique par jalon confirmé, cliquable et navigable au clavier,
  qui pilote la même sélection de repère que les boutons texte de l'index et
  donc la même relecture datée (asOf, lecture seule). Zéro repère → aucune
  Spirale ; sans cycle confirmé, l'identité seule — aucun épisode affirmé.
- Deep-link `?onglet=` sur la fiche (`/dashboard/patients/{id}?onglet=trajectoire`),
  validé côté serveur — toute valeur inconnue est ignorée (ouverture sur le
  poste de pilotage). Préparation de la future page « Trajectoires » (LOT-04).
- Campagne SP-TRAJ enregistrée (`docs/claude/campagnes/2026-07-23-spirale-fiche-trajectoire/`),
  plan approuvé le 2026-07-23 : LOT-01 → LOT-06.
