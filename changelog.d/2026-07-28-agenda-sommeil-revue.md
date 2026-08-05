### Agenda du sommeil — correctifs de la revue adversariale (2026-07-28)

Passe de revue indépendante sur les trois lots de l'agenda, imposée par la nature
du changement (seuils cliniques). Verdict initial : no-go. Quatre constats
bloquants, tous confirmés et corrigés.

**Un compte de réveils résiduel réécrivait l'éveil nocturne déclaré.** Le
formulaire posait `nombre: 0` au choix « nuit continue » et ne le remettait pas à
`undefined` ensuite. Un patient qui se ravisait — « nuit continue », puis
« éveillé·e longtemps » — envoyait `{ dureeTotale: 'e30_60', nombre: 0 }`, et la
normalisation d'un artefact v1 réécrivait sa classe en « aucun ». Un éveil
nocturne **déclaré** devenait WASO = 0, gonflant le TST et l'efficacité, et la
ligne stockée était indiscernable d'une vraie nuit continue : c'est exactement le
biais que la v2 existe pour supprimer, réintroduit par sa propre règle de
compatibilité. Cette normalisation ne s'applique plus qu'en LECTURE ; en
écriture, la contradiction est refusée plutôt que corrigée en silence.

**L'indice pouvait reposer sur une nuit sur vingt-et-une.** Les seuils de 7 et 14
nuits portaient sur le compte global, jamais sur la couverture de chaque axe. Sur
une fenêtre mêlant des nuits d'avant et d'après le changement de contrat — le cas
garanti de tout patient en cours de recueil au déploiement —, la durée et
l'efficacité pouvaient être calculées sur `n = 1`, et le total variait de
50 points selon cette unique nuit, avec sa bande d'interprétation colorée et son
drapeau prescriptif. Un plancher par axe (`minNuitsAxe`, 7) traite désormais un
axe trop peu soutenu comme non couvert, donc renormalisé — jamais deviné.

**Le besoin 5 changeait le score de patients sans agenda.** La pondération plate
(3/2/1) renormalisée sur les sources disponibles ne tenait pas sa promesse de
parts égales : sans agenda — le cas de presque tous les patients — le repos
retombait à 2/5. Un patient à PSQI 0,60 et activité 0,15 passait de 0,375 à 0,330,
sous `SEUIL_EFFONDREMENT`, faisant basculer « Bouger et se reposer » en fondation
critique effondrée et le score global de 69 à 50 — sans qu'une seule de ses
réponses ait changé. `BESOIN_SOURCES` accepte maintenant un `groupe` : un besoin
est la moyenne de ses groupes à parts égales, un groupe la moyenne pondérée de
ses sources disponibles. Un patient sans agenda retrouve exactement son score
d'avant. Sans `groupe`, chaque source forme le sien et les autres besoins sont
inchangés. `VERSION_SCORE_EQUILIBRE` passe en `v5`, comme l'exige le fichier :
les patients dont l'agenda est clôturé, eux, changent bien de score.

**Le chronogramme dessinait l'éveil du matin en plein sommeil.** La barre courait
de l'extinction à `heureReveilFinal ?? heureLever` — inoffensif tant que ce champ
n'était jamais rempli, faux dès que le lot précédent l'a rendu saisissable : la
barre s'arrêtait au réveil, et la bande d'éveil, posée en pied, tombait donc dans
la période dormie, tandis que l'intervalle réel n'était pas tracé. Sur une nuit
23:00 → réveil 04:30 → lever 07:00, le praticien lisait un réveil précoce à 2 h
du matin et trois heures de sommeil en moins. La barre va désormais jusqu'au
lever, et la géométrie des portions est extraite en fonction pure testée.

**Également corrigé, hors constats bloquants.** Les contrôles d'ordre des quatre
ancres ne s'appliquent plus qu'en écriture : `toNuitRow` re-valide chaque ligne
lue, et une règle d'ordre en lecture aurait fait échouer le GET entier d'un
patient sur une ligne historique bancale. Le temps au lit avant extinction et
l'éveil du matin sont bornés à 5 h : la validation garantissait leur ordre, pas
leur ordre de grandeur, et une poignée glissée à l'opposé du cadran produisait un
« 15 h au lit avant d'éteindre » parfaitement ordonné qui faisait chuter
l'efficacité et lever le drapeau de restriction de sommeil.

**Tests ajoutés** sur chacun des quatre chemins, plus la garantie qu'un patient
sans agenda garde son score, que les besoins non groupés gardent la moyenne
simple, et que la lecture d'une ligne v1 ne perd aucun champ facultatif.
