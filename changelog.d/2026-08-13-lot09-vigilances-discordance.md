### Ajouté — les discordances atteignent la synthèse praticien (LOT-09, `D-057`)

- **La seconde moitié de l'étape 5 du LOT-01 est refermée.** Le câblage cockpit
  des contradictions était livré (`D-050`) ; l'injection dans la synthèse ne
  l'était pas, et elle était restée sans lot d'accueil depuis le 2026-08-12.
  **Rien de clinique n'a été rédigé** : `description` est déjà « la formulation
  NEUTRE de ce qui est constaté, sans causalité affirmée » et `actionSuggeree`
  « le geste proposé au praticien » — les deux traversent mot pour mot, seul un
  intitulé est ajouté, sur le patron des vigilances d'anamnèse.
- **Seuls les constats non résolus deviennent vigilance**, au critère exact
  qu'applique déjà le moteur d'arrêt pour interdire une extinction (`D-053` §5)
  — escalade praticien comprise, donc injectée. Deux définitions d'« ouvert »
  dans le même dépôt divergeraient en silence, et le même constat bloquerait
  l'extinction sans atteindre la synthèse. Aucun plancher d'`importance` :
  `D-048` refuse déjà que ce champ serve à décoter un constat, et aucune source
  ne fonde un seuil (`DC-19`).
- **Le piège du lot, trouvé en exploration et absent de la fiche** : le cockpit
  évalue les contradictions sur **toutes** les passations du patient, alors que
  la route de synthèse travaille sur un sous-ensemble filtré par exploitabilité
  et administrabilité — celui que tout le reste de la route consomme. Lui passer
  ce sous-ensemble aurait fait rendre au **même dossier** moins de constats en
  synthèse qu'au cockpit, sans aucun signal : la synthèse serait restée valide,
  simplement plus pauvre, et une vigilance manquante n'a personne pour la
  réclamer. La route charge déjà l'ensemble non filtré, avec le même `where` que
  le cockpit ; c'est lui qui part au moteur, et un **banc structurel de
  non-divergence** le garde — vérifié par mutation, deux de ses cinq contrôles
  rougissent quand on rebranche le sous-ensemble.
- **Les discordances se calculent hors du bloc d'anamnèse** : un contexte
  clinique indisponible ne doit pas les emporter avec lui. Le moteur accepte une
  anamnèse nulle — c'est déjà ce que lui passe le cockpit quand aucune
  consultation n'en porte.
- **Garde de fidélité — ce que « présente en tête » ne prouve pas.**
  `fusionnerVigilance` garantit la présence de la vigilance et son
  insuppressibilité ; elle n'empêche pas le modèle d'écrire trois paragraphes
  plus bas que les mêmes instruments **concordent**, laissant le praticien
  devant deux affirmations opposées dont une seule fait foi. Le garde mesure
  exactement cela et rien d'autre : la contradiction sémantique générale est
  indécidable, celle-ci ne l'est pas. Journalisé, jamais censuré.
- **Le garde découpe par PHRASE avant de normaliser**, là où ses deux
  prédécesseurs utilisent une fenêtre de caractères. Un contrôle négatif l'a
  imposé : « Le discours du patient est cohérent. Le Q_STR_01 sera rediscuté »
  franchissait le point et accusait un constat que la prose ne trahit pas — et
  « cohérent » qualifie un discours dans presque toutes les synthèses. Le motif
  d'extinction, lui, **doit** franchir la frontière de phrase (`D-055`) ; les
  deux gardes divergent parce que les objets mesurés diffèrent, pas par
  inattention. Un faux positif subsiste, épinglé par banc : deux instruments
  dans une même phrase partagent leurs marqueurs.
- **Une propriété jusqu'ici vraie par construction devient un banc** :
  `points_de_vigilance` n'atteint pas le patient. Le bloc ne portait que des
  signaux d'anamnèse du patient lui-même ; il porte désormais des discordances
  entre instruments, dont le type déclare `audience: 'praticien_seul'`. Une
  régression sur la liste blanche de `projeterBilanPatient` ne serait plus une
  fuite de prose interne mais un constat servi à qui il n'est pas destiné.
- **Effet en production : nul au merge.** `contradictionsActives()` exige le
  drapeau **et** la signature de table, et la table n'est pas signée — la
  signature reste un acte praticien distinct.
- **Dette reconduite, non aggravée** : l'écart dossier ↔ épisode que `D-050`
  laisse ouvert (le moteur évalue le dossier entier alors que `review` porte sur
  l'épisode T0). Ce lot consomme la même source que le cockpit sans élargir sa
  portée.
