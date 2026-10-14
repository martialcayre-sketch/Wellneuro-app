### Portail : date de naissance demandée, questionnaires et biologie en pause tant qu'elle manque (D-284 §3 et §4, lot h, 2026-10-14)

Un dossier sans date de naissance lisible se voit demander sa date à la
prochaine connexion, avant tout autre geste ; tant qu'elle manque, ses
questionnaires et sa biologie sont en pause. Seuil des mineurs : 18 ans,
seuil juridique d'âge (D-284 §4), pas un seuil clinique. Aucune migration,
aucune règle clinique. Constat par conteneur du 2026-10-14 : 15 dossiers
actifs sur 31 sans date.

- **Décision unique** `lib/patient/gardeAge.ts` : `date_manquante`, `mineur`,
  `majeur`. Une date illisible, irréelle ou future vaut une date manquante.
  Seul `majeur` ouvre la saisie ; un **mineur reste en pause** jusqu'au
  circuit des mineurs (lot i), fail-closed.
- **Saisie** `POST /api/portail/date-naissance` : identité de la session ;
  écrite seulement si la date du dossier manque ou est illisible (écriture
  conditionnelle, aucun écrasement) ; la correction reste au praticien.
- **Gardes serveur** (409 `date_naissance_requise` ou
  `circuit_mineur_requis`, avant toute écriture) : soumission d'un
  questionnaire, validation de l'anamnèse, agenda du sommeil et sa clôture,
  agenda alimentaire, dépôt d'un compte rendu. Restent ouverts (arbitrage du
  2026-10-14) : fiche signalétique, protocole et ses nouvelles, alliance,
  signalement d'un effet indésirable, droits, réponse à une proposition de
  réévaluation (elle n'écrit qu'une réponse, aucune assignation).
- **Portail** : étape « Votre date de naissance » juste après « Avant de
  commencer », avec confirmation ; même écran sur le hub et la page de dépôt
  atteints par leur adresse ; un mineur voit un écran de pause et garde son
  parcours, sans questionnaire proposé.
- **Praticien** : la fiche administrative dit la pause (date manquante ou
  mineur).
- **Texte patient** : « Vos données personnelles » **v17**, accusé exigé (même
  motif que la v16) : la date de naissance, ce qu'elle sert à vérifier, la
  pause.
- Banc de la page portail : le routeur simulé est désormais stable, comme celui
  de Next ; un objet neuf à chaque rendu relançait la séquence d'accueil en
  boucle.
