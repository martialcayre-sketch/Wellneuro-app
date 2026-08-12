### Ajouté

- **Le bloc transmis au modèle nomme désormais, pour chaque instrument, la
  passation qui fait foi.** Quand un patient a répondu deux fois au même
  questionnaire, les deux passations partaient indistinctes : rien ne disait
  laquelle était la plus récente, et le modèle pouvait raisonner sur l'ancienne
  mesure comme sur l'actuelle. Chaque ligne porte maintenant un repère
  `passationCourante` (LOT-01 de la campagne chaîne T0, étape 6 — renvoi du
  LOT-00).

### Inchangé — et c'est le point

- **Les passations antérieures restent transmises, toutes.** L'évolution entre
  deux enquêtes d'un même instrument est un signal clinique, et le modèle doit
  pouvoir la lire. L'écart à corriger était l'absence de repère, pas le nombre
  de lignes : aucun `distinct`, aucune suppression, aucun dédoublonnage « de
  propreté ». Un banc garde les deux à la fois — le compte des lignes ET
  l'unicité du repère —, faute de quoi un filtre pourrait s'introduire plus tard
  sans rien faire rougir.

### Détails de conception

- **Le repère vaut explicitement `false` sur les passations antérieures**, au
  lieu d'être absent. Une clé qui n'apparaîtrait que sur la courante se lirait,
  sur les autres, comme une information manquante plutôt que comme un « non ».
- **Il part aussi sur une passation non interprétable.** La taire là ferait
  désigner une passation antérieure comme la courante : un repère faux est pire
  qu'un repère absent.
- **La sélection réutilise la fonction déjà partagée par les moteurs
  d'orientation et de contradictions.** Trois consommateurs qui répondraient
  chacun à leur façon à « quelle passation fait foi » finiraient par se
  contredire dans le même dossier. Elle porte aussi le départage à horodatage
  égal, sans lequel le repère ne serait pas reproductible d'un run à l'autre.
- **Une passation écartée du raisonnement ne porte jamais le repère**, que le
  drapeau de validité soit allumé ou non — la garantie ne dépend pas de lui. Le
  repère ne RETIRE rien (les lignes partent toutes) ; il se contente de ne pas
  promouvoir ce que le praticien a écarté, et la ligne concernée le dit
  elle-même. Différence assumée avec l'orientation, qui éteint l'instrument :
  ici on désigne la précédente encore exploitable. Si aucune ne l'est,
  l'instrument ne porte **aucun** repère, et la consigne dit que cette dimension
  reste à mesurer.
