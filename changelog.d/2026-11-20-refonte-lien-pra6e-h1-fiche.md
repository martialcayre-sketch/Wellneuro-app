### Refonte Lien, PRA-6e : le nom du dossier est le h1 de la fiche, et la cascade remonte d'un niveau (2026-11-20)

Arbitrage du responsable du 2026-11-19 (question `20261117-1423-d`, « Le nom du
dossier en h1 »), sur le constat PRA-6 §3.5 : la fiche (P04 à P30) était le
seul écran praticien sans `h1`. Aucun texte neuf, aucun style changé, ni
route, ni garde, ni drapeau, ni schéma, ni règle clinique.

- **Le nom du dossier passe de `h2` à `h1`**, avec les mêmes classes : rien ne
  bouge à l'écran.
- **Toute la cascade rendue dans la fiche remonte d'un niveau**, sans saut :
  le titre de la zone focale passe en `h2`, les panneaux des phases et des
  onglets (cockpit, Trajectoire, Biologie, Alimentation, Correspondance,
  besoins, bibliothèque des options sous un constat confirmé) et leurs
  sous-parties d'un niveau chacun. Ces composants ne sont montés que dans la
  fiche.
- **Deux composants partagés** gardent leur rendu ailleurs : la fiche
  administrative reçoit `h3` de la fiche (le rayon Patients garde son défaut),
  la lecture d'un état passé reçoit `niveauTitre={2}` de la Trajectoire (le
  copilote passait déjà `2`).
- **Tiroirs et dialogues inchangés** : chacun a sa racine propre (titre de
  dialogue en `h2`), sa cascade ne dépend pas de la fiche.
