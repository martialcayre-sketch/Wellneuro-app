### Orientation — table de règles V1 (LOT-05)

- `ORIENTATION_RULES_V1` n'est plus vide : six règles d'orientation, chacune
  adossée à des claims `VALIDE` du corpus NNPP2 (`rag_corpus_claims`), vérifiés
  en base. Aucun seuil n'est calculé dans la table : les déclencheurs citent la
  bande d'interprétation que la grille certifiée produit déjà, jamais un nombre
  écrit à cet endroit. En revanche la **bande d'entrée** est un arbitrage
  clinique, pris instrument par instrument et motivé sur chaque règle — le PSQI
  démarre à `info` (total 5-10, au-dessus du seuil de 4 qu'il publie), le PSS-10
  et le TFD SIIN à `warning`, qui est déjà leur première bande défavorable.
- **La table n'est PAS signée.** `ORIENTATION_METADATA` reste
  `validationExterne: false` : la route `/api/praticien/orientation` demeure
  fail-closed et ne sert encore aucune recommandation. La signature est un acte
  praticien, postérieur à la relecture clinique des six règles.
- Le moteur sait désormais lire les **drapeaux d'anamnèse**
  (`extraireDrapeauxAnamnese`, LOT-04, jusqu'ici sans aucun consommateur) :
  nouveau déclencheur `drapeau`, et la route charge l'anamnèse la plus récente
  du patient. Une anamnèse absente n'atteint aucun déclencheur — elle ne vaut
  pas une anamnèse vide.
- Décision : **aucune règle ne s'appuie sur `signauxAlerte`**, et un banc
  l'interdit. Non parce que ce champ serait filtré — tous le sont, y compris
  ceux qui portent des règles — mais parce qu'un signal d'alerte appelle un
  adressage, quand cette table ne sait produire qu'une exploration. Ces signaux
  doivent devenir visibles à la surface d'orientation sans y être présentés
  comme une exploration : la surface manque, c'est un lot dédié.
  `extraireVigilanceDeterministe`, non filtré, reste d'ici là le seul chemin par
  lequel ils remontent.

#### Deux défauts silencieux corrigés au passage

- **La bande la plus sévère était invisible.** `OrientationZone` n'admettait que
  `warning` et `danger` ; les grilles emploient aussi `dark` pour les bandes
  « Très sévère ». Une règle écrite sur la couleur aurait ignoré exactement les
  patients les plus atteints, sans erreur ni trace. Le versant bas manquait de
  même : `info` porte des bandes légères mais actionnables. Les deux sont
  ajoutées, et un banc interdit désormais qu'une règle s'arrête sous la bande la
  plus sévère.
- **Le moteur traitait une composition de pack inconnue comme autorisée**, à
  rebours de ce que le banc de la table décrivait. Aucune recommandation
  erronée n'en est sortie — la route refiltre en sortie et rejetait déjà ce cas
  — mais le fail-closed n'existait que chez l'appelant : le moteur l'applique
  désormais lui-même. Constaté en base : `PACK_HUMEUR_NEURO` est inactif, d'où
  une exploration de l'humeur portée par le questionnaire HAD plutôt que par le
  pack.
- **La route retenait la consultation la plus récente**, or une consultation
  naît sans anamnèse et ne la reçoit qu'à la validation du patient : entre les
  deux, toutes les règles de drapeau se seraient tues alors qu'une anamnèse
  existait. Elle retient maintenant la plus récente qui en porte une, comme
  `api/praticien/synthese`.
