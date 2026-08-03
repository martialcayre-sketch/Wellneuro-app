### Orientation — consommateur praticien et restitution IA (LOT-06)

- **La route d'orientation a enfin un appelant.** Depuis la campagne de
  certification, `GET /api/praticien/orientation` existait et personne ne
  l'appelait : `grep -rln "praticien/orientation" web/src` ne rendait que la
  route, son test, le moteur et la table. Un nouvel encart `OrientationPanel`
  s'affiche dans l'onglet **Trajectoire** de la fiche patient, au présent
  seulement — une recommandation se lit sur l'état courant du dossier, et
  l'afficher en lecture datée la ferait passer pour ce que la table proposait à
  cette date-là, ce qu'aucun calcul ne dit.
- **La table n'est toujours pas signée, et l'écran le dit sans mentir.**
  `ORIENTATION_METADATA.validationExterne` reste `false` : en dev comme en
  production, le seul chemin exerçable est `actif: false`, et le panneau affiche
  le message serveur « en cours de constitution » — en texte neutre, jamais en
  alerte. Un verrou fermé n'est pas une panne ; le signaler comme telle
  enverrait le praticien chercher un incident qui n'existe pas. Les quatre états
  (chargement, échec de lecture, verrou fermé, aucune recommandation) sont
  rendus distinctement : une erreur de lecture n'est jamais présentée comme un
  état vide.
- **L'évaluation quitte la route pour `lib/clinical/orientationService.ts`.**
  La synthèse IA en est devenue un second consommateur, et le double verrou
  fail-closed ne doit exister qu'à un seul endroit — un fail-closed dupliqué est
  un fail-closed qu'on peut oublier de corriger dans l'une des deux copies. Le
  contrat HTTP est inchangé : les 21 cas de `route.test.ts` passent sans
  retouche. Le verrou reste vérifié **avant** le contrôle d'appartenance, qui
  journalise l'accès au dossier : table non signée, aucune lecture, donc aucun
  accès consigné qui n'a pas eu lieu. Un banc l'impose désormais explicitement.
- **La synthèse IA restitue la recommandation, ne la produit jamais** (PMI-5).
  Le bloc « Recommandation d'exploration déterministe », numéroté et accompagné
  de sa version et de son `sha256`, s'insère entre le contexte anamnestique et
  les résultats de questionnaires. Une section dédiée du prompt système interdit
  d'en proposer un autre, d'en changer l'ordre — il est calculé et porte une
  priorité clinique — ou d'en inventer la justification. `VERSION_PROMPT_SYNTHESE`
  passe à `synthese-v14` : c'est le seul moyen de distinguer une synthèse rédigée
  sous ce garde d'une rédigée sans.
- **Le garde ne repose pas sur la consigne seule.** Quand la table ne recommande
  rien, aucun bloc n'est injecté du tout — pas même un en-tête vide, qu'un modèle
  se croirait tenu de remplir. C'est la doctrine de `#408` : « une interdiction
  dont le critère de déclenchement n'arrive pas vaut moins que rien ».
- **Un écart de restitution est mesuré, pas supposé.**
  `verifierRestitutionOrientation` — fonction pure — compare le texte rendu au
  **vocabulaire fermé** des seize packs de doctrine et rend ceux cités hors de
  ceux transmis. La question « le modèle a-t-il inventé quelque chose » est
  indécidable ; « un nom de cette liste connue apparaît-il hors des noms
  fournis » ne l'est pas. L'écart est journalisé sous un code propre
  (`SYNTHESE_IA.ORIENTATION.RESTITUTION_INFIDELE`, distinct de
  `CONTEXT_UNAVAILABLE` : le premier dit qu'une donnée a manqué, celui-ci qu'une
  donnée a été inventée) et persisté dans `metadonneesPrompt`. La synthèse est
  **rendue quand même** : l'objet actionnable — la carte et son bouton — vient de
  la route déterministe, jamais du modèle, donc un pack cité à tort dans la prose
  ne peut rien déclencher.
- **L'assignation reste le geste manuel existant, en deux temps.** Le bouton
  rejoue `POST /api/praticien/packs/assign` sans modifier son contrat, et n'est
  rendu que si trois conditions sont réunies — cible pack, correspondance
  `idPackBase` en base, email patient disponible. Un bouton présent puis voué au
  `pack_not_found` est pire qu'un bouton absent. Assigner envoie un e-mail au
  patient : une confirmation explicite est demandée avant l'envoi, et un banc
  vérifie que le seul affichage ne déclenche aucune requête.
- Une couverture inconnue (`dejaRepondu: null`, composition de pack inconnue)
  est affichée comme **inconnue**, jamais comme négative.
