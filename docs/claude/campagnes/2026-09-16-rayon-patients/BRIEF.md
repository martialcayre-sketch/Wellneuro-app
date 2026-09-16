# Brief — Le rayon Patients

> Source : demande du responsable en session, le 2026-09-16, deux captures à
> l'appui (poste de pilotage d'un dossier réel, phase « Patient » ; page
> « Questionnaires & packs », menu « Gérer le dossier » déployé).

## La demande, telle qu'elle a été formulée

1. Avoir **sur la page du cockpit patient** la gestion de la fiche patient,
   avec toutes les fonctionnalités de la gestion des patients de la page
   d'héritage 4.0 « Questionnaires & packs ».
2. La gestion des fiches patients **n'a plus rien à faire là** : créer un rayon
   Patients dans le rail, sous « Le Fil du jour ».
3. Pouvoir **modifier toutes les données** écrites à la création d'une fiche —
   nom, prénom, date de naissance, téléphone, e-mail — et **ajouter** adresse,
   NIR (numéro de sécurité sociale), nom et coordonnées du médecin traitant.
4. **Tous les renseignements fournis par le patient à l'ouverture de son
   espace doivent figurer ici** : fiche signalétique et anamnèse.

## Ce que les captures montrent

- `/dashboard/patients/PAT007?onglet=cockpit&phase=comprehension`, onglet
  « Poste de pilotage », phase affichée « Patient — renseignée » : la zone
  focale porte **un nom et un e-mail**, rien d'autre. La colonne INSTRUMENTS
  offre six tiroirs, dont aucun ne mène aux renseignements du patient.
- `/dashboard/patients`, titre « Questionnaires & packs », 29 dossiers : le
  menu « Gérer le dossier » d'une ligne réunit l'accès au portail (renvoyer,
  copier, lien à usage unique, révoquer, désactiver) et la fin de parcours
  (clôturer, effacer définitivement). C'est le seul endroit où ces gestes
  existent.

## Les six arbitrages rendus le même jour

Ils sont consignés au `CAMPAGNE.md`, tableau « Les six arbitrages du
2026-09-16 » : URL et rail, destination des assignations et des packs,
périmètre du rayon, forme d'affichage des renseignements, régime du document
patient, mode de stockage du NIR.
