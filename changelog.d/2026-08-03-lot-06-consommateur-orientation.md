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
  `verifierRestitutionOrientation` — fonction pure — compare le texte rendu aux
  **vocabulaires fermés** des seize packs de doctrine et des identifiants de
  questionnaire, et rend les cibles citées hors de celles transmises. La question
  « le modèle a-t-il inventé quelque chose » est indécidable ; « un nom d'une
  liste connue apparaît-il hors des noms fournis » ne l'est pas. L'écart est
  journalisé sous un code propre (`SYNTHESE_IA.ORIENTATION.RESTITUTION_INFIDELE`,
  distinct de `CONTEXT_UNAVAILABLE` : le premier dit qu'une donnée a manqué,
  celui-ci qu'une donnée a été inventée) et persisté dans `metadonneesPrompt`. La
  synthèse est **rendue quand même** : l'objet actionnable — la carte et son
  bouton — vient de la route déterministe, jamais du modèle, donc un pack cité à
  tort dans la prose ne peut rien déclencher.
- **Le garde ne tourne pas quand il n'y a rien à trahir**, et c'est ce que la
  revue adversariale a corrigé. Sans cette condition, il s'exécutait avec une
  allowlist vide sur le seul chemin que la production emprunte aujourd'hui — table
  non signée — et comparait la prose aux seize titres. Quatre d'entre eux sont
  des syntagmes cliniques français ordinaires : « digestif et intestin-cerveau »,
  « stress chronique et burnout », « sommeil et chronobiologie », « migraine et
  cephalees ». Une synthèse parfaitement fidèle se voyait donc accusée d'avoir
  cité un pack hors recommandation, l'accusation était **écrite dans le dossier
  patient**, et le code d'événement créé pour mesurer l'infidélité aurait été
  noyé de bruit avant d'être observable. Deux gestes : le garde est conditionné à
  l'injection effective d'un bloc, et un titre de pack ne compte que précédé du
  mot « pack » (le slug, lui, n'a aucun homonyme naturel et reste cherché
  partout). Cinq cas de prose clinique ordinaire sont désormais au banc comme
  contrôles négatifs.
- **L'allowlist des questionnaires a trois sources**, et en oublier une rendrait
  le garde absurde : les cibles de l'orientation, tous les questionnaires du
  dossier — le modèle les reçoit, les citer est son travail — et **ceux que la
  consigne système lui met en bouche**. Le prompt cite seize instruments en
  exemple ; les lui reprocher reviendrait à l'accuser d'avoir inventé ce qu'on lui
  a soufflé. La liste est dérivée du prompt réel, pas recopiée, pour qu'un exemple
  ajouté demain n'ouvre pas la même faille.
- **Ce que le garde ne voit pas est écrit dans son en-tête**, et ne doit pas être
  supposé couvert : un pack désigné par son titre sans le mot « pack » nulle part
  avant lui, un pack cité loin derrière son introducteur, une exploration décrite
  en langage libre, et un **réordonnancement** de la recommandation — pourtant
  interdit par la consigne, mais qui demanderait de comparer des positions dans
  une prose, pas des occurrences.
- **L'écran n'affirme pas la réception de l'e-mail.** `packs/assign` envoie en
  best-effort et rend `success: true` même si l'envoi échoue : dire « le patient a
  reçu son e-mail » aurait affirmé ce que la route ignore, et un praticien qui le
  lit ne relance pas. L'écran dit ce qui est garanti — le pack est assigné.
- **Invariant nouveau** : aucun déclencheur de la table d'orientation ne porte sur
  une passation inscrite au registre `passationsNonInterpretables`. La disjonction
  était vraie par accident et rien ne la gardait ; une règle ajoutée demain sur un
  de ces instruments aurait réintroduit dans le prompt, sous l'étiquette
  « recommandation signée », le chiffre que `buildUserMessage` en retire.
- **L'assignation reste le geste manuel existant, en deux temps.** Le bouton
  rejoue `POST /api/praticien/packs/assign` sans modifier son contrat, et n'est
  rendu que si trois conditions sont réunies — cible pack, correspondance
  `idPackBase` en base, email patient disponible. Un bouton présent puis voué au
  `pack_not_found` est pire qu'un bouton absent. Assigner envoie un e-mail au
  patient : une confirmation explicite est demandée avant l'envoi, et un banc
  vérifie que le seul affichage ne déclenche aucune requête. **Après un succès,
  le bouton ne revient pas** — `packs/assign` ne déduplique pas, un second clic
  créerait des assignations en double et un second e-mail. Un échec, lui, laisse
  le geste possible : aucun e-mail n'est parti.
- **L'e-mail n'est passé au panneau que s'il désigne le patient affiché.**
  Le panneau calcule sur `idPatient`, l'assignation part sur `emailPatient` : deux
  identifiants venus de deux sources, dont aucune ne vérifiait l'autre. Sur une
  navigation d'un patient à l'autre, une réponse en retard pouvait brièvement les
  désaccorder — et le désaccord aurait fait partir un e-mail au mauvais patient.
  Une comparaison d'une ligne dans `FichePatientPanel` le ferme.
- Une couverture inconnue (`dejaRepondu: null`, composition de pack inconnue)
  est affichée comme **inconnue**, jamais comme négative.
