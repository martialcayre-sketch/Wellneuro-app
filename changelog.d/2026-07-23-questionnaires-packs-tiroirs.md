### « Questionnaires & packs » — le tableau d'abord, les formulaires en tiroirs (SP-TRAJ LOT-05)

- La page héritage « Patients & assignations » devient **« Questionnaires &
  packs »** : le tableau patients est le premier contenu, précédé d'une barre
  d'actions — « Nouveau patient », « Nouvelle consultation », « Nouvelle
  assignation » — dont chaque formulaire s'ouvre dans un **tiroir Radix**
  (fermeture Échap, focus rendu au déclencheur, boutons ≥ 44 px). Fin de
  l'empilement de trois cartes de formulaires en tête de page.
- Conservés tels quels : la suture « Packs suggérés » → PacksPanel (cliquer
  un pack suggéré referme le tiroir pour montrer le panneau), recherche/tri/
  pagination serveur, édition inline, menu « Gérer le dossier » et son
  dialogue de fin de parcours, tableau des assignations et son filtre.
  Aucune route API modifiée, aucune migration.
- Le retour des actions de ligne (lien renvoyé/copié/révoqué…) s'affiche dans
  la ligne de statut `aria-live` de la barre d'actions ; un échec de
  formulaire se dit DANS son tiroir (le voile Radix masquerait un message de
  page). La ligne du tableau gagne un lien direct « Trajectoire »
  (deep-link `?onglet=trajectoire`).
