### Objectif — le second adaptateur borné, et la porte qu'il ouvre exprès

`matierePriorite.ts` existait pour qu'`axes_prioritaires` ne sorte **jamais**
d'une synthèse : c'est un tableau ordonné, et il tombe sous `DC-19`/`DC-20`.
`matiereComprehension.ts` ouvre une porte pour cet objet — et c'est délibéré.

**Pourquoi.** L'arbitrage du 2026-09-11 veut que le résumé global soit
hiérarchisé **sans que le modèle invente la hiérarchie**. Elle est donc reprise
de celle qu'un praticien a validée en validant la synthèse. Une porte ouverte se
garde autrement qu'une porte fermée : il faut prouver ce qui passe **et** ce qui
ne passe pas.

**La porte ne laisse passer qu'une chaîne par entrée.** Un axe prioritaire porte
quatre champs, et trois sont exactement ce que la doctrine interdit de faire
voyager : `niveau_priorite` est une **bande** (`eleve | modere | faible`),
`arguments` contient des **scores** — « Score X élevé » est l'exemple du contrat
JSON lui-même —, et `points_a_confirmer` est une consigne d'entretien. Aucun des
trois n'est nommé dans le fichier, et la garde de surface l'éprouve mot par mot.
Le banc de comportement va plus loin : il sérialise la sortie entière et vérifie
qu'aucune de ces chaînes n'y figure, parce que vérifier `axes` seul laisserait
passer une fuite par une autre clé.

**Ce que « validé » veut dire, et ce qu'il ne veut pas dire.** Le praticien a
validé la synthèse entière, donc l'ordre des axes avec elle ; il ne l'a pas
nécessairement **composé** — l'éditeur lui permet d'ajouter, retirer et modifier
des axes, pas de les réordonner. « Ordre validé » est exact, « ordre choisi »
serait faux. La nuance est écrite dans le fichier plutôt que tue : elle borne ce
que la provenance du texte produit pourra honnêtement affirmer.

**Un `sort()` glissé un jour dans l'adaptateur inventerait une hiérarchie que
personne n'a validée.** Le banc d'ordre utilise exprès une suite non
alphabétique, et sa mutation le tue.

**`texteDepuisBlob` est exporté plutôt que recopié.** Les deux adaptateurs
lisent le même blob et doivent le faire de la même manière ; deux définitions du
vide sur la même donnée sont exactement le genre d'écart qui ne se voit pas.
L'export n'ouvre rien : ce qui garde ces blobs n'a jamais été la portée de cette
fonction, mais la **surface** de chaque adaptateur — les clés qu'il nomme et les
types qu'il rend. Chacun a sa garde, et elles les énumèrent.

**Un désaccord sans texte n'est pas rien**, et il n'entre pourtant pas dans la
matière : le geste seul est une parole — le portail le dit au patient — mais il
n'y a rien à relire. L'écarter ici ne l'efface nulle part ailleurs (`DC-24`).

Six mutations, six mutants tués.
