### Les recommandations élargies s'ouvrent sur trois dossiers, sous observation (2026-08-23)

Le gate d'Alliance 6.0-A est levé — `D-092` a constaté en production que la
ratification patient existe. `D-093` décide de ce qu'on en fait, et la réponse
n'est pas « tout, tout de suite ».

- **Le gate n'était pas un drapeau, et c'est le fait qui a orienté la
  décision.** `tablePrioritesSignee()` rend `true` depuis le 2026-08-15
  (`D-061`, re-signée le 16 par `D-067`) ; la chaîne C1 produit des candidats
  sous ce seul verrou, qui est ouvert ; l'orientation est allumée. Le mécanisme
  était **déjà vivant** : trancher ne consistait pas à basculer quelque chose,
  mais à décider si l'on s'autorise à s'en réclamer.
- **Périmètre restreint et observé** : trois dossiers désignés nommément, et
  eux seuls ; **relecture praticien de chaque recommandation avant remise**.
- **La sortie exige deux conditions cumulatives** : au moins **une réponse
  patient réelle** observée sur un objectif — ratifier ou contester, l'une vaut
  l'autre — et un **bilan écrit** sur le classement des candidats.
- **Six semaines, et le périmètre se REFERME au bout.** Il ne s'étend pas par
  défaut : une absence de constat n'est pas un feu vert. C'est `DC-24` appliqué
  à la gouvernance — une donnée absente n'est ni zéro, ni normale.
- **Ce qui reste hors périmètre signé, et qui conditionne la généralisation** :
  le producteur de candidats, **l'ordre de présentation** et les textes
  `LIMITATION_*` vivent dans `chaineC1.ts`, hors du SHA, l'ordre d'évaluation
  des motifs d'abstention étant « mécanique, mais non relu ». Or c'est le
  classement qui décide de ce qui est proposé en premier. Tant qu'il n'est pas
  signé, aucune généralisation ne peut se réclamer d'une provenance certifiée
  (`DC-01`, `DC-26`).
- La dette bloquante de `D-054` — la procédure d'abstention hors du périmètre
  haché — est bien **close** par `D-062` ; c'est l'acquis qui rendait cette
  ouverture envisageable.

Aucun code, aucun drapeau, aucune migration : c'est l'usage qui est borné, pas
le mécanisme qui est ouvert.
