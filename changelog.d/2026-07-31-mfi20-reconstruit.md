### MFI-20 — reconstruit depuis sa source, et rouvert sans blanchir le passé

L'instrument le plus abîmé du catalogue est rebâti item par item sur sa source
(WN-SRC-0397). Le banc rejoué **hors ligne** passe de **29 divergences dont
3 critiques et 7 majeures à une seule, majeure et déclarée**.

**Additionner sans inverser revient à sommer la fatigue et la vigueur dans le
même sens.** C'est ce que faisait le servi : l'échelle d'accord 1→5 de la source
y était servie en fréquence 0→4, **aucune des dix inversions n'était appliquée**,
les cinq sous-échelles tenaient dans deux sections inventées, et trois bandes
s'affichaient sur un `/80` là où la source écrit « Il n'y a pas de barème
interprétation ». Onze des vingt libellés n'étaient pas les siens, plusieurs de
polarité inverse — l'item 14 de la source dit « Physiquement, je me sens en
mauvaise condition », le servi disait « en état de faire beaucoup de choses ».
« Je me sens en forme » comptait comme un symptôme.

**La clé de correction vient de la source, pas de la littérature.** Sa dernière
page porte une « Grille de calcul de l'échelle MFI » — une colonne par
sous-échelle, la case de chaque item marquée dans la sienne, « 6-réponse »
inscrit sur les items à inverser. L'extraction automatique n'en rendait rien, la
table ayant perdu sa mise en page ; elle a été lue sur l'image. Les dix
inversions qu'elle donne recoupent exactement la liste que la source énonce en
toutes lettres deux pages plus haut.

**Un défaut de moteur qui valait pour tout le catalogue.** La branche `subscore`
appelait `totalSousScore(sub.items, [])` — liste d'inversions **vide, écrite en
dur**. Aucune sous-échelle ne *pouvait* inverser un item, et un `reversed`
déclaré dans une définition n'aurait rien fait, en silence. Le correctif est
additif : `reversed` absent se comporte comme avant, et les six autres
instruments à sous-scores sont inchangés.

**Aucun score global**, par déclaration explicite (`scoring.sansTotalGlobal`) :
la source ne totalise jamais ses cinq sous-échelles, et une somme sur 100 se
lirait comme une sévérité — exactement ce que les trois anciennes bandes
faisaient.

**Résidu déclaré** : la seule divergence restante est `seuil_non_represente`. La
source donne des seuils pour la seule sous-échelle « Fatigue générale », et ils
dépendent du **sexe et de l'âge**. Le moteur ne reçoit que des réponses :
les appliquer sans ces deux données reviendrait à choisir une population au
hasard. Ils sont rendus au praticien en toutes lettres dans la note, jamais
convertis en bandes.

**Le piège de la réactivation est désarmé, pas contourné.** La table des
passations non interprétables était indexée par instrument, et son propre garde
interdisait la réouverture — il tenait la porte fermée au lieu de la rendre
franchissable. Elle porte désormais une **date de reconstruction** : passation
antérieure marquée, passation postérieure lisible. Frontière **fermée** — une
date absente ou illisible fait marquer la passation, parce que marquer à tort se
voit et se corrige, tandis que ne pas marquer sert au praticien un score qui n'en
est pas un.

**Périmètre vérifié en production** : 3 assignations, **toutes `Complété`** —
aucune assignation ouverte n'est perturbée par le changement d'items et
d'échelle ; 4 passations enregistrées, **toutes antérieures** à la
reconstruction, donc toutes encore neutralisées.
