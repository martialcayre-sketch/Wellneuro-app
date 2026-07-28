### Corrigé

- **Un jalon sans réponse nouvelle n'est plus rendu comme une mesure**
  (lot 1, constats F1, F1-bis et F7 de l'audit de la chaîne trajectoire du
  2026-07-27). `construireHistoriqueEquilibre` émettait une lecture à **chaque
  jalon passé**, en recalculant sur toutes les réponses connues à cette date :
  un patient ayant rempli un questionnaire une seule fois obtenait quatre
  lectures identiques datées T0/J21/J42/J90, un écart de 0 et une tendance
  « stable ». Les frontières écrites **A6-R2** et **A8-2** l'interdisent mot
  pour mot — un jalon sans mesure est « non mesuré », jamais un 0. Une lecture
  n'est désormais émise que si une réponse nouvelle et exploitable est arrivée
  depuis la lecture précédente — « exploitable » signifiant : `rawAnswers`
  présent **et** questionnaire source d'un besoin. La seconde condition n'est pas
  un raffinement : le moteur n'agrège que onze questionnaires sur soixante-quatre,
  et sans elle une passation hors mapping rouvrait un jalon dont la valeur était,
  par construction, identique à la précédente — « stable, écart 0 » revenait par
  la porte de service. La règle porte sur la **réponse**, pas sur le score : une
  passation réellement refaite dont l'indice ne bouge pas reste une mesure, et
  reste servie.

  Trois surfaces en découlent, sans y toucher :
  - côté patient, « *n* bilans jalonnent votre parcours » et « Stable depuis
    votre dernier bilan » cessent d'être servis quand il y a eu un bilan et
    aucun suivant (**F7**) ;
  - côté praticien, les jalons fabriqués disparaissent de la fiche-trajectoire ;
  - le **repère de cabinet** n'agrège plus de delta `+0` fabriqué : cinq
    patients silencieux franchissaient `SEUIL_COHORTE_CABINET` et servaient une
    médiane de `+0` présentée comme descriptive de la patientèle (**F1-bis**).

  Portée réelle à ce jour : **zéro jalon fabriqué en production** — défaut
  latent corrigé avant l'arrivée de données longitudinales, pas incident en
  cours. Deux tests existants asseyaient l'ancien comportement
  (`protocol/trajectoire.test.ts`, `api/praticien/protocoles/checkins`) : ils
  vérifient désormais la correction, et les cas qui prouvaient le branchement
  du momentum portent deux passations réelles au lieu d'une.

- **Le « silence utile » n'est plus rendu sur un comptage** (§2.1 du plan
  alimentaire révisé). `PatientFoodObservationPanel` disait au patient « Rien à
  noter aujourd'hui, nous en savons assez » dès `traces.length >= budget` :
  trois traces du même lundi suffisaient. C'est un verdict de suffisance rendu
  sur un décompte, quand `describeCoverage`, juste au-dessus, s'interdit
  précisément de qualifier. Le conditionner à une couverture temporelle réelle
  suppose le moteur de couverture du lot 3, qui n'existe pas encore — d'où le
  retrait.

  À noter, car ce n'était pas visible avant de le chercher : ce panneau était la
  **seule surface patient de production** qui rendait ce message. L'autre rendu,
  sur un régime `silence` prescrit, n'est monté que par le harnais
  `/dev/validation-ja`, réservé au développement. Le « silence utile » n'atteint
  donc plus aucun patient, et le régime prescrit n'a pas encore de surface de
  production — à trancher au lot 2, pas ici.

### Modifié

- **`VERSION_SCORE_EQUILIBRE` : v4 → v5.** Aucun poids, seuil ni mapping ne
  change, et aucune valeur calculée à une date donnée ne bouge — mais
  l'**ensemble** des lectures d'un cycle change. Comparer un cycle antérieur,
  qui pouvait porter des jalons fabriqués, à un cycle postérieur reviendrait à
  comparer des jalons inventés à des jalons réels : c'est ce que l'étiquette de
  version existe pour empêcher. Conséquence connue et acceptée :
  `resoudreComparaison` refuse tant que deux étiquettes coexistent — sans objet
  en pratique, `assessment_episodes` étant vide en production.
