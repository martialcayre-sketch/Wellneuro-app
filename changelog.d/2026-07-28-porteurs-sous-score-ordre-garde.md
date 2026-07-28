### Clinique

- **Ferme la réserve de code de #436** : l'ordre des deux porteurs dans
  `extraireValeurBrute` (`equilibre/score.ts`) n'était pas gardé. La fonction
  lit un sous-score dans `subScores` (forme historique) **et** dans
  `scoresBesoins` (moteurs déclarant des `dimensions`, à qui la certification
  interdit `subScores`) ; elle rendait le **premier trouvé**, si bien que
  `subScores` l'emportait par son seul rang dans le tableau. Le commentaire
  affirmait « sans préférence » — la boucle en avait une.
- **Pourquoi ce n'était pas anodin** : le `max` de `BESOIN_SOURCES` n'est
  calibré que sur **un** porteur. Lire l'autre ne rend pas une mesure absente,
  il rend une **couverture fausse** — un besoin crédité d'un score qu'il n'a
  pas. Une absence de mesure se voit (`missing_data` en revue clinique) ; une
  valeur fausse, non.
- **Le lecteur ne tranche plus : un seul porteur doit répondre**, sinon « pas
  de mesure ». Une première rédaction acceptait deux porteurs aux totaux
  **égaux** (« la même mesure écrite deux fois ») ; la revue adversariale a
  montré que c'était une inférence, pas une propriété — le contrat
  `{id, total}` **ne porte pas le dénominateur**. `total: 4` sur /10 et sur /7
  sont deux couvertures différentes (0,40 et 0,57), et `BESOIN_SOURCES` n'a
  qu'un `max`. Cette branche était devenue la seule voie par laquelle une
  couverture fausse pouvait encore sortir — dans le lot même qui ferme cette
  classe. Supprimée.
- **Pourquoi pas une préférence fixe pour `scoresBesoins`** : `BESOIN_SOURCES`
  vise majoritairement des `subScores` (`Q_MOD_01`, `Q_NEU_11`, `Q_INF_03` —
  quatre besoins) contre un seul en `scoresBesoins` (`RYTHME_CHRONO`). Une
  préférence serait donc fausse pour la famille majoritaire ; `null` est le
  seul choix qui ne ment sur aucune des deux.
- **Le cas devient inatteignable, pas seulement inoffensif** : nouveau garde de
  certification — un instrument qui émet `scoresBesoins` ne doit pas émettre
  `subScores`. Il complète les deux murs voisins (`dimensions` interdit
  `subScores` ; un sous-score servi ne peut porter l'identifiant d'une
  dimension), et tourne sur **jeu complet ET jeu partiel** comme son jumeau :
  le moteur a un retour anticipé « aucune réponse correspondante », et un
  porteur qui n'apparaîtrait que sur cette branche échapperait à une passe
  remplie au maximum. Mesuré avant de l'écrire : **aucun** instrument n'émet
  les deux aujourd'hui, dans les deux positions du drapeau — le garde entre
  vert.
- **Trois preuves par mutation.** Rendre le premier porteur trouvé (la boucle
  d'origine) fait rougir les deux tests de la règle, pas les quatre de
  non-régression. Injecter un `subScores` factice sur un instrument à
  `scoresBesoins` fait échouer la certification — et l'injecter **sur le seul
  jeu partiel** la fait échouer aussi, ce qui n'aurait pas été le cas sans la
  seconde passe.

Aucune migration. Aucune valeur servie ne change, et cette fois par
**équivalence stricte** — pas seulement par inatteignabilité : sur tout cas à
**un seul porteur exploitable**, le nouveau lecteur rend exactement ce que
rendait l'ancien. Vérifié sur 12 cas limites (porteur unique ; premier porteur
à `total: null` et second numérique, et l'inverse ; sous-score absent des deux ;
aucun porteur ; `total: 0` ; `total: NaN`). Les seules divergences portent sur
les cas à **deux** porteurs — divergents, égaux, deux `NaN` —, mesurés
inatteignables aux deux positions du drapeau.

### Réserves

- La certification n'interdit les deux porteurs qu'aux instruments qui
  **déclarent** `sousScoresBesoins` — aujourd'hui le seul chemin d'émission de
  `scoresBesoins`, mais **rien ne fige cette unicité**. Le lecteur ne s'y fie
  pas (d'où sa règle stricte), et le commentaire du code écrit la prémisse au
  lieu de la conclusion.
- **`NaN` reste NON traité sur un porteur unique.** `typeof NaN === 'number'` :
  le total est collecté, un seul porteur répond, il sort tel quel et traverse
  `clamp01` intact jusqu'à `Math.round(NaN)` dans la moyenne du besoin. Aucun
  sous-score servi ne le produit (vérifié sur les cinq, à quatre remplissages),
  et un test épingle désormais ce comportement réel — une première rédaction de
  ce fragment l'annonçait corrigé alors qu'il ne l'était plus, faute de test
  pour le contredire.
- **Asymétrie connue, hors périmètre** : les porteurs `subScores` historiques
  n'ont pas la parade anti-zéro de `scoresBesoins`. Un `Q_NEU_11/D` sans aucune
  réponse rend `total: 0`, donc — avec `inverser: true` — une couverture de
  1,0 sur le besoin 8 pour un patient qui n'a rien répondu. C'est la même
  classe que « aucune réponse correspondante doit rendre NON SCORÉ, jamais 0 »,
  assumée en commentaire dans `questions.ts` (« les unifier est un autre lot »)
  et signalée ici par la revue. À traiter séparément : la corriger change des
  valeurs servies.
