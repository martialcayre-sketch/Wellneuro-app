### PSQI — le dépôt cesse d'attribuer à l'instrument un seuil qu'il ne publie pas (2026-09-13)

Huit endroits du dépôt affirmaient que la bande d'entrée de `R-SOM-01` est prise
« au-dessus du seuil de 4 que l'instrument publie ». **Les deux moitiés de la
phrase étaient fausses, et la seconde retournait le sens de l'arbitrage.**

Le PSQI ne publie aucun seuil à 4. Le 4 est le plafond de la première bande de
**notre propre grille** (`BANDES_PSQI`, `questions.ts`) : le citer comme une
publication de l'instrument était une auto-citation. La source primaire coupe à 5
strictement — Buysse et al., *Psychiatry Research* 28:193-213, 1989, « a global
PSQI score greater than 5 » (Se 89,6 % / Sp 86,5 %) —, reprise telle quelle par
la feuille de cotation de Pittsburgh. Une lecture concurrente, la feuille
d'instructions diffusée avec le questionnaire, range 5 du côté défavorable.
S'allumer à 5 est donc **un point en dessous** du cut-off sous la première
lecture, exactement dessus sous la seconde : dans aucune lecture ce n'est
au-dessus.

Ce que la bande d'entrée est réellement : un **élargissement vers la
sensibilité**, non une marge de prudence. Elle propose une exploration à des
patients que la lecture stricte classe encore « bons dormeurs ». C'est défendable
pour du repérage — le cut-off publié varie de 5 à 10 selon la population — mais
c'est un arbitrage WellNeuro, et il se lit désormais comme tel.

Deuxième correction, de même nature : `questions.ts` et `questionnaires/sommeil.ts`
attribuaient la grille à quatre bandes à « l'échelle de Buysse 1989 ». Buysse 1989
ne publie **aucune** stratification de sévérité — le PSQI y est dichotomique, une
seule frontière. Les quatre bandes et leurs libellés sont une construction
WellNeuro ; seule la coupure 4/5 a un répondant dans la littérature, et décalé
d'un point ; 10/11 et 16/17 n'en ont aucun.

**Aucun comportement ne change, aucun sha ne bouge, et c'est vérifié plutôt que
supposé.** Les quatre sites de `orientationRulesV1.ts` sont des commentaires, que
`sha256(JSON.stringify(ORIENTATION_RULES_V1))` ne couvre pas ; le site de
`stopRulesV1.ts` est dans `STOP_RULES_ECARTEES_V1`, hors de la table publiée que
`STOP_RULES_SHA256` couvre — le même raisonnement que `D-177` a tenu ce matin.
Les bancs de concordance des deux tables sont verts.

**Ce que cela fait à `D-177`, tranchée le même jour : sa conclusion survit, sa
prémisse écrite était fausse.** Refuser d'écrire une extinction sur « PSQI 5 »
parce que la table signée s'allume à cette valeur ne dépend pas de l'endroit où
Buysse coupe : la contradiction était interne. Son option écartée « remonter
l'entrée de `R-SOM-01` à `warning` » reste écartée, et mieux fondée qu'alors —
`warning` ouvre à 11, au-dessus du plus haut cut-off publié pour n'importe quelle
population.

**Une quatrième option devient visible, et n'est pas prise ici.** Aligner la
borne basse de la bande d'entrée sur le cut-off strict, c'est-à-dire allumer à
partir de 6 plutôt que 5. Elle n'était pas formulable tant que le dépôt croyait
s'allumer au-dessus du seuil. Elle coûte une re-signature de la table
d'orientation et elle échange de la sensibilité contre de la spécificité sur un
seul point de score : c'est un arbitrage praticien, il n'est pas tranché.

Le registre des instruments n'est pas touché : l'entrée `Q_SOM_01` porte toujours
`doi`, `pmid`, `dateVerification` et `verifiePar` à `null` sous une attribution
« Buysse et al., 1989 ». Les renseigner passe par le vérificateur du registre et
demande un vérificateur nommé ; c'est un lot distinct.
