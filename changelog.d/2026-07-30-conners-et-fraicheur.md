### Le banc payant tranche les deux Conners — et referme les deux

Ces deux instruments étaient **les deux seuls du catalogue à n'avoir jamais été
comparés à leur source** : leur passage coûte des appels de modèle, et il attendait
un go explicite. Il a eu lieu le 2026-07-30. Aucun des deux ne monte, et les motifs
diffèrent.

**`Q_PED_02` (Conners enseignant) a été rouvert puis refermé le jour même.** Son banc
rend « 0 divergence critique » — mais la source lue ne déclare ni sous-échelle, ni
seuil, ni bornes de total, ni barème. Les deux seuls contrôles critiques que le
comparateur pouvait exercer étaient le nombre d'items et l'échelle de cotation, et les
deux formes ont bien 28 items cotés 0-3. **« Zéro critique » voulait donc dire « les
deux choses vérifiables l'étaient »**, pas « le servi est l'instrument ».

Ce que les 27 divergences rangées au rayon « mineures » disaient : la similarité item
à item est de **0,00 pour dix-sept d'entre elles**. Le servi porte les critères DSM du
TDAH — ne fait pas attention aux détails, ne semble pas écouter, évite l'effort mental
soutenu — là où la source porte les items d'opposition de Conners : provocant,
rancunier, réplique, s'oppose activement, crises de colère.

**Le défaut clinique**, vérifié dans le code : le sous-score intitulé
« Opposition / Impulsivité » repose sur cinq items — excitable, mal à rester assis,
interrompt, répond sans réfléchir, mal à attendre son tour. **Aucun ne mesure
l'opposition ; les cinq mesurent l'impulsivité.** Un praticien lisant
« Opposition / Impulsivité : 13/15 » sur une fiche titrée « Conners Enseignant »
conclurait à un trouble oppositionnel chez un enfant à qui la question n'a jamais été
posée.

Et c'est la règle que le même dossier applique au Conners parent : « un instrument à
qui il manque des items n'est pas l'instrument qu'il nomme ». La rouvrir ici sur
quatorze items étrangers l'appliquait à l'envers, le même jour. Réouverture
conditionnée à l'un des deux : reconstruire le servi sur les 28 items de la source,
ou **débaptiser** — un dépistage TDAH local par l'enseignant, sans le nom Conners ni
les intitulés de sous-échelles empruntés, ne pose ni le problème d'identité ni celui
de MHS.

**`Q_PED_03` (Conners parent) reste fermé** pour un motif unique et suffisant : la
lecture croisée a **échoué deux fois** (sortie tronquée sur le plus gros questionnaire
du catalogue), donc rien n'y est confirmé par deux lectures indépendantes. Les
relances payantes ont été arrêtées à deux essais. Une première rédaction ajoutait la
divergence « 110 items lus pour 108 servis » : elle est retirée, les deux items
d'écart sont les questions **ouvertes** Q109/Q110, écartées faute de champ texte dans
l'UI patient — et le code le disait déjà.

### La fraîcheur d'un verdict est vérifiée, et son angle mort est écrit

Un verdict de banc certifie un scoring **à un instant donné**, et rien ne le reliait
au code qu'il certifie : deux instruments étaient certifiés sur un verdict antérieur à
la réécriture de leur propre grille — le QDRS a vu ses cinq bandes réalignées le matin
et portait encore le verdict de la veille.

`verifierRegistreInstruments` refuse désormais un `verdictScoring.date` antérieur à la
`revision.date` de la même entrée, et les 54 verdicts sont re-datés du 2026-07-30 : le
banc y est réellement repassé ce jour-là, **hors ligne**, sur les 64 instruments.

**Ce que cette garde ne couvre pas est écrit à côté d'elle, et verrouillé par un test
qui le nomme.** Son témoin est déclaratif : la moitié des entrées ne porte aucun bloc
`revision` et lui échappe, et le cas vraiment dangereux — réaligner une grille sans
rien écrire au registre — la laisse muette. Le seul témoin honnête est l'empreinte
servie que le banc produit déjà ; l'y raccorder est un lot à part.
