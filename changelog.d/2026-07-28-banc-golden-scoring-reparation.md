### Tests

- **Le banc golden de scoring (`tests/wellneuro/golden/scoring-golden.test.mjs`)
  redevient exécutable.** Il échouait sur `SyntaxError: Unexpected token 'export'`
  — `export type QuestionOption` (`questionnaire-types.ts`, importé en `import
  type` par `questions.ts`) n'était pas couvert par le jeu de regex qui « strippe »
  la syntaxe TypeScript avant exécution via `new Function`. Le corriger au coup
  par coup aurait rouvert le même défaut à la prochaine annotation de type
  rencontrée — mesuré sur le fichier : `q`/`qn`/`qs` (`questionnaires/shared.ts`)
  et l'essentiel de `questions.ts` (`calculateScore`, `computeScoreFromDef`,
  des dizaines d'arrow functions) portent des paramètres, variables locales et
  types de retour typés, tous logés du même trou.
- **Remplacé le strip par regex par le compilateur TypeScript lui-même**
  (`ts.transpileModule`, déjà présent comme dépendance de `web/`) : il efface
  toute syntaxe propre à TS — annotations de paramètres/variables/retour,
  `interface`, `export type`/`import type`, `as`, `!` non-null — en une passe,
  au lieu d'un jeu de regex qui ne couvre qu'un sous-ensemble figé. Le
  dédoublonnage des jeux d'options et des fabriques `q`/`qn`/`qs` (dupliqués
  entre `questions.ts` et `questionnaires/shared.ts`) reste un filtre ligne à
  ligne, mais opère désormais sur le texte ORIGINAL, avant le passage par le
  compilateur : celui-ci ré-imprime le code (ce n'est pas un diff minimal) et
  peut refendre un `if` sans accolades sur deux lignes — appliqué après coup,
  le filtre aurait coupé une signature en laissant son corps orphelin en tête
  de fichier, un `return` hors fonction.
- **Le banc, une fois exécutable, a révélé une dérive réelle et sans rapport** :
  le fixture « stress SIIN au minimum » attendait `protocol` imbriqué dans
  `interpretation` — une forme que `separerConduite` (`questions.ts`) a cessé
  de produire depuis l'extraction de la conduite dans son propre champ
  `result.conduite` (les 17 moteurs de scoring y passent tous). Le fixture,
  jamais exécuté depuis, n'avait jamais vu passer ce changement, pourtant déjà
  en production. Fixture et assertion mis à jour pour vérifier `result.conduite`
  au lieu de `interpretation.protocol` — aucune logique de scoring touchée, la
  valeur vérifiée (`"Conseils de vie antistress"`) est inchangée, seul
  l'endroit où on la cherche l'est.
- **Preuve par mutation** : une valeur attendue altérée dans le fixture fait
  rougir le test correspondant ; restaurée, il repasse au vert — le banc a des
  dents, ce n'est pas un test vide.
- **Branché sur le CI (`verify`)**, pas seulement rendu exécutable à la main :
  c'est l'absence d'un runner qui a laissé la dérive `protocol`/`conduite`
  s'installer sans qu'aucun run ne la voie. Nouvelle étape après le
  Comparateur de certification, sur le même patron que les bancs voisins
  (`Registre des instruments`, `Comparateur de certification`) — gatée par le
  périmètre du diff (sautée sur une PR purement documentaire), après `npm ci`
  (son chargeur a besoin de `typescript`, devDependency de `web/`).

### Réserves

- `ts.transpileModule` efface la syntaxe TS sans vérifier les types : un champ
  mal nommé ou mal typé dans le code inliné n'y serait pas détecté. Délégué à
  `npm run check` (`tsc --noEmit`), qui type-checke réellement — pas une
  régression du comportement précédent, le strip par regex ne type-checkait
  pas non plus.
- Un seul des quatre fixtures exerce le champ `conduite` (`Q_STR_01`) ; les
  trois autres n'ont pas de bande à conduite et ne l'assertent pas. Couverture
  partielle, pas un défaut du correctif.
