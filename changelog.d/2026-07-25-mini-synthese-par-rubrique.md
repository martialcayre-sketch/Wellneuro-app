### Corrigé

- **Six questionnaires n'avaient aucune restitution par rubrique.** Le moteur de
  scoring range ses résultats intermédiaires sous **cinq clés différentes**
  (`subScores`, `components`, `parts`, `categories`, `phases`), héritées de
  l'ordre d'implémentation des instruments. `buildMiniSynthese` n'en lisait
  qu'une : les **sept composantes du PSQI**, les **trois catégories de Berlin**,
  les **cinq parties de l'IDTAS-AE**, les **quatre axes du QIF** et les **deux
  phases du test des 5 mots** n'atteignaient ni l'écran praticien ni le prompt
  de synthèse. Le nouveau module `scoring/rubriques.ts` projette les cinq formes
  sur une seule, et la mini-synthèse les restitue derrière l'interprétation
  globale.

### Ajouté

- **`scoring/rubriques.ts`** — normalisation pure des rubriques d'un score.
  Ne calcule rien, ne suppose rien : un maximum absent reste `null` et
  `maxOrigine` dit d'où il vient (`champ`, `libelle`, `inconnu`). Un axe
  présence/absence (Berlin) est marqué `binaire` — sans quoi ses catégories sans
  score se liraient « zéro », donc négatives, alors qu'elles sont positives.
  `rubriquesComparables()` dit si une lecture en proportion a un sens.

  **Le sens d'une rubrique n'est déclaré nulle part** : une composante PSQI
  haute est mauvaise, un rappel haut au test des 5 mots est bon, et le QIF a les
  deux dans le même questionnaire. La mini-synthèse ne hiérarchise donc que sur
  l'interprétation quand elle existe, et énumère dans l'ordre de l'instrument
  sinon — classer par valeur écrirait « ressort surtout » sur ce qui va le mieux.

  Banc de 27 tests exécutant `calculateScore` sur le catalogue réel, jamais des
  fixtures écrites à la main.
