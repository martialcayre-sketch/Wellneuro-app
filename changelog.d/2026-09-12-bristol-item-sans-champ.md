### L'échelle de Bristol posait sa question et n'offrait rien à cocher

`Q_GAS_03` était **impassable depuis son ajout**, et rien ne le disait. Son
unique item, `BR1`, porte `type: 'bristol'` — un type que `QuestionField` ne
connaissait pas. Un type inconnu n'y lève aucune erreur : le composant rend la
légende, « Type de selles habituel », et s'arrête là. Le patient lisait la
question, ne voyait aucune option, et `sectionAnswered` — qui exige une réponse
à tout item non conditionnel — laissait « Voir le résumé » **désactivé pour
toujours**. Pas de message, pas de log : un écran qui attend une réponse qu'il
ne permet pas de donner.

Les sept types de la classification s'affichent désormais en cartes pleine
largeur, avec leur pictogramme, sur de vrais `input[type=radio]` — comme le
reste du parcours patient, dont les E2E cochent `form input[type="radio"]`.
Jamais en grille : ce sont sept descriptions d'une ligne et demie, pas des
options de deux mots.

**Rien en aval ne bougeait.** Le moteur `bristol`, les réponses lisibles et la
route de soumission lisent la valeur et les options de l'item, jamais son type :
ils attendaient un `1`-`7` que l'écran ne pouvait pas produire. Le correctif est
entièrement dans le rendu.

Prouvé par `QuestionField.saisissable.guard.test.tsx`, qui **ne liste pas les
types** : il rend les 1 154 items du catalogue servi et refuse celui qui ne
produit aucun contrôle de formulaire. `BR1` en était le seul — il tombait avant
le correctif, il passe après, et un type ajouté demain sans branche de rendu
tombera là plutôt qu'en production. Un second cas rejoue l'écran entier de
`Q_GAS_03` : sept radios de valeurs `1`…`7`, bouton désactivé, un clic, bouton
actif.
