### Modifié — l'extinction devient opérante (LOT-08, `D-055`)

- **`group_majority` (`Q_STR_01`) publie ses comptes de recueil** : `missing` et
  `repondus` à la racine, la forme que la garde de complétude d'aval sait déjà
  lire (`sum`, `psqi`, `tfd`) et que la consigne de synthèse décrit — aucun bump
  de prompt. **La bande n'est plus servie que sur recueil complet** : trois
  réponses sur vingt et une décrochaient la bande la plus favorable de la
  grille, affichée fiche praticien et lue par le déclencheur porteur de
  STOP-STR. Le total, lui, reste servi — mesure réelle, biaisée vers le bas,
  même partage que le TFD — et une note dit le trou en français. Effet
  production relu avant décision : une seule passation `Q_STR_01`, sans
  `rawAnswers`, déjà inerte pour le raisonnement recalculé.
- **La garde de complétude du moteur d'arrêt lit au grain du déclencheur** —
  l'axe visé quand il y en a un, la racine sinon. Fait découvert en écrivant le
  banc de bout en bout : le DASS-21 (`subscore`, deux des quatre déclencheurs de
  STOP-STR) ne publie aucun compte racine, et la garde d'origine aurait refusé
  d'éteindre même sur une passation complète — publier les comptes de `Q_STR_01`
  n'aurait fait que déplacer le verrou d'un instrument à l'autre. Elle refuse
  désormais explicitement « muet OU incomplet », au bon grain. STOP-STR est
  démontrée **mordante** sur le dossier rassurant complet et **muette** sur
  recueil partiel, en vrai `calculateScore` et vraie table — qui reste **non
  signée** : la production ne change pas au merge, la signature demeure l'acte
  praticien séparé.
- **`D-053 §5` reçoit son code : une contradiction ouverte interdit
  l'extinction, et ne la déclenche jamais.** « Ouverte » = non `resolue`
  (l'escalade praticien bloque aussi), sur le dossier entier — aucun vocabulaire
  d'axe n'existe, et bloquer plus large ne peut que raréfier l'extinction. Les
  constats arrivent au moteur par le même chemin que le cockpit
  (`constatsContradictionsPourDossier`, verrou drapeau + signature compris) ; le
  sens unique est garanti par construction et mesuré par banc : hors extinction,
  la sortie du moteur est identique octet pour octet avec ou sans contradiction.
- **Le garde de restitution distingue une cible éteinte d'une cible
  recommandée**, dans les deux sens : une éteinte citée sans marqueur
  d'extinction à proximité, ou une recommandée vivante citée avec — vocabulaire
  fermé de marqueurs tirés de la consigne v25 (inchangée), fenêtre asymétrique
  de 200 caractères normalisés en amont et 420 en aval — l'aval mesuré sur le
  motif de STOP-STR —, instruments déjà passés hors du contrôle (un résultat
  se cite sans marqueur). Même régime que le garde d'origine : journalisé,
  jamais censuré, angles morts épinglés par bancs — dont un faux positif assumé.
- **`VERSION_SCORE_EQUILIBRE` bumpée v12/v13 → v14/v15** (revue wn-reviewer,
  B1) : `Q_STR_01` alimente le besoin 9 — fondation critique — en échelle
  inversée, et le recueil partiel qui n'est plus une mesure change la
  définition du besoin dans les deux sens, y compris la levée du plafond de 50
  sur un partiel déjà sévère. Troisième bump de la même classe (PSQI/besoin 5,
  TFD/besoin 4) ; coût connu et assumé : historique de momentum coupé, agrégat
  cabinet masqué jusqu'à deux cycles v15.
