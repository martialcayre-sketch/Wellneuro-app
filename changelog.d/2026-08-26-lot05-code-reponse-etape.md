### Le patient dit où il en est, et le praticien le lit (`D-111`, LOT-05 PR 2)

Aux jalons J21/J42/J90, le portail demande au patient **où il en est par rapport
à la version exacte de son objectif** : un texte, plus une EVA facultative.
Le cockpit rend ces réponses **en récit**. La migration a été appliquée et
constatée par conteneur le 2026-08-26 ; ce lot la consomme.

- **La taxonomie est dérivée, plus seulement écrite en SQL.** `JALONS_OBJECTIF`
  et `ANCRE_JALON` vivent dans le module pur ; une garde (`G7`) importe
  `JOURS_JALON`, en retire l'ancre **par son nom**, et compare. La littérale
  était obligée : `G5` interdit à ce module d'importer `@/lib/equilibre`, et il
  est embarqué dans le bundle patient. La dérivation se **vérifie** au banc
  plutôt que de s'exécuter au runtime.
- **`T0` est refusé à la route, en français.** `resoudreJalonDu` le rend pour
  tout patient sans cycle confirmé : laissé passer, il levait un `23514` et
  rendait un 500 sur un chemin qu'aucun palier de test ne traverse.
- **Une EVA décimale est refusée au bord.** La colonne est un `INTEGER` : `5.5`
  serait arrondi à `6` **avant** le CHECK, qui l'accepterait — le dossier
  porterait une valeur que le patient n'a pas donnée. Une chaîne `"5"` est
  refusée aussi, sans coercition : `''` vaut `0`.
- **La fenêtre est tenue par le serveur** (`jalonObjectifDu`), qui lit
  `JOURS_JALON`/`TOLERANCE_JOURS_JALON` sans les redéfinir. Fonction distincte de
  `resoudreJalonDu`, qui répond à une autre question — celle-ci retire les
  jalons **déjà confirmés par le praticien**, ce qui aurait fait disparaître la
  question d'un patient n'ayant jamais parlé. Le POST la fait respecter, et
  compare **quel** jalon : un onglet resté ouvert posterait sinon le J90 dans la
  fenêtre du J21.
- **Invitation et permission sont distinctes, à dessein.** L'écran ne pose la
  question que sur un objectif ratifié ou dit-autrement ; le serveur, lui,
  n'exige pas la ratification pour accepter le texte. Refuser la parole d'un
  patient sur son propre objectif serait plus grave que de ne pas la solliciter.
- **`null` n'est pas `0`, nulle part** (`DC-24`). L'échelle n'est jamais
  pré-sélectionnée, se retire après un clic, et le zéro d'un patient s'affiche —
  `reponse.eva &&` l'aurait effacé des deux écrans.
- **Aucun calcul sur l'EVA** : ni moyenne, ni tendance, ni delta, ni couleur.
  Une garde interdit `reduce`/`sort` sur `reponsesJalon`, et une réponse d'étape
  n'entre pas dans l'état de ratification — être en retard n'est pas contester.

Gardes vues rouges par mutation : dérivation de la taxonomie (deux mutations,
dont une que la première assertion ne voyait pas), écrivain unique, écritures
destructrices, décompte affiché, agrégat sur l'EVA.
