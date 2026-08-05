### Orientation — un plancher de sévérité peut désormais allumer une règle

- **Quatre règles rallumées sur un recueil partiel** (`R-GAS-01`, `R-SOM-01`, `R-STR-01`,
  `R-STR-02`). Depuis D-020, un questionnaire à moitié rempli perdait sa bande, et avec elle
  toute orientation — y compris quand la sévérité était **déjà acquise**. D-021 avait rendu
  cette sévérité lisible (`bandePlancher`) sans la rendre agissable ; ce lot ferme la
  réserve. Une règle s'allume si et seulement si **toutes les bandes encore atteignables**
  sont dans la zone qu'elle vise.
- **Le plancher n'entre pas par la porte de la mesure.** `extraireCible` rend un troisième
  champ ; `valeur` et `interpretation` restent `null` et les deux gardes de complétude ne
  sont pas touchées. L'immunité des règles à comparaison sur échelle inversée (`Q_MOD_01`,
  testée en `<=`) reste donc vraie par construction.
- **Le motif praticien dit le partiel**, pas seulement « au moins » : la bande garantie, et le
  nombre d'items sans réponse **avec son dénominateur** — « 23 items sans réponse sur 31 ».
  Sans la mention, un pack burn-out serait justifié par un libellé qui commence par
  « Adaptation satisfaisante » ; sans le dénominateur, le praticien ne peut pas trancher entre
  relancer le patient et proposer le pack.
- **Une fermeture incomplète n'est plus une fermeture.** Une bande atteignable sans couleur
  exploitable, ou sans borne comparable, éteint la règle au lieu d'être retirée de la liste —
  la retirer rendait l'inclusion *plus facile*, l'inverse du comportement annoncé. Relevé en
  revue adversariale ; latent sur le catalogue actuel.
- La consigne de synthèse passe en `synthese-v16` : le plancher y est décrit comme **agi**
  par la table d'orientation, et non plus comme un constat sans suite.
- Aucune donnée de règle n'a bougé : `ORIENTATION_RULES_SHA256` est inchangé. L'en-tête de la
  table porte un **avenant daté**, parce qu'il affirmait le contraire de ce que le moteur fait
  désormais.
- Portée mesurée en production le 2026-08-05 : sur les trois instruments concernés, **10
  passations, aucune partielle**. Le changement est prospectif.
