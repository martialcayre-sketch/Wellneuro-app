### Ajouté — les discordances atteignent la synthèse praticien (LOT-09, `D-057`)

- **La seconde moitié de l'étape 5 du LOT-01 est refermée.** Le câblage cockpit
  des contradictions était livré (`D-050`) ; l'injection dans la synthèse ne
  l'était pas, et elle était restée sans lot d'accueil depuis le 2026-08-12.
  **Rien de clinique n'a été rédigé** : `description` est déjà « la formulation
  NEUTRE de ce qui est constaté, sans causalité affirmée » et `actionSuggeree`
  « le geste proposé au praticien » — les deux traversent mot pour mot, seul un
  intitulé est ajouté, sur le patron des vigilances d'anamnèse.
- **Seuls les constats ouverts deviennent vigilance, au prédicat PARTAGÉ.**
  `contradictionEstOuverte` est désormais la seule écriture du critère, appelée
  par la synthèse comme par le moteur d'arrêt. La première rédaction le
  paraphrasait et omettait l'exclusion des convergences : une règle
  `CONVERGENCE` publiée aurait été servie sous l'intitulé « discordance » tout
  en laissant l'extinction possible — trouvé en revue, refermé à la racine.
  L'escalade praticien reste « ouverte ». Aucun plancher d'`importance` :
  `D-048` refuse déjà que ce champ serve à décoter un constat (`DC-19`).
- **La vigilance est explicable et tient dans le format** : elle porte son
  `regleId` (sans lui, un faux positif est irremontable) et ses `limitations`
  (sans elles, le praticien ignore que le constat ne dit jamais lequel des deux
  instruments a raison — `DC-25`, `DC-28`). Elle sort en **deux points** et non
  un : réunis, ils faisaient 730 caractères contre un plafond de 500 par point,
  et l'enregistrement d'un brouillon praticien aurait été refusé par un message
  ne nommant pas la cause. Un banc mesure toutes les règles de la table, pas
  seulement celle du jour.
- **Un intitulé par forme** : un `CONFLIT_SOURCES`, qui oppose des claims et non
  des passations, n'est plus servi sous l'étiquette « entre instruments ».
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
- **Le garde a d'abord accusé la prose fidèle, et c'est la revue qui l'a
  mesuré** : « incohérent » contient « cohérent », « n'est pas confirmé par »
  contient « confirmé par ». Six phrases sur sept qui restituaient
  CORRECTEMENT la discordance étaient signalées — un bruit corrélé à la
  fidélité, persisté en base comme fait d'audit. Corrigé : le marqueur doit
  ouvrir un mot et ne doit pas être nié, et le garde s'exclut de sa propre
  entrée. Sa portée reste étroite et le dire fait partie du livrable : le modèle
  ne reçoit pas la discordance dans sa consigne, donc il a peu de raisons de
  citer un identifiant d'instrument près d'une affirmation de concordance. Le
  garde est un filet ; l'injection dans la consigne serait le mécanisme, et
  c'est une dette nommée.
- **Une discordance ne sort pas du praticien** : convertie en chaîne, elle
  perdait son `audience: 'praticien_seul'` et héritait du destinataire médecin
  du bloc « vigilance », donc du courrier au médecin traitant — un document
  sortant, élargi par effet de bord d'un field-filter existant. Refermé, banc
  symétrique de celui du patient. Les vigilances d'anamnèse gardent leur régime.
- **Traçabilité** : la version et le sha de la table de contradictions entrent
  dans `metadonneesPrompt`, comme l'orientation et la table d'arrêt — une
  vigilance contestée six mois plus tard doit pouvoir être rattachée à la table
  qui l'a produite. La perte des constats a désormais son propre code
  d'événement : elle ne se journalise pas comme une prose dégradée.
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
