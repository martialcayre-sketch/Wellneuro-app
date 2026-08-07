### Retirer d'un pack un questionnaire suspendu (2026-08-07)

Le praticien peut désormais **ôter d'un pack un instrument suspendu qui y figure
encore**. Ce geste n'existait nulle part : l'écran d'édition ne rendait de case à
cocher que pour les instruments actifs, et la sauvegarde renvoyait la liste
stockée en entier — le suspendu repartait à chaque enregistrement. Un pack
portant un instrument suspendu était donc verrouillé dessus, et annonçait un
questionnaire de plus que ce qu'il envoyait vraiment.

**« Suspendu » dépend de l'environnement, et le cas du pack de base l'illustre.**
Un instrument suspendu par un drapeau de fonctionnalité redevient actif là où ce
drapeau est allumé. `Q_ALI_09`, que le pack de base « Base de consultation »
porte encore, est suspendu dans le dépôt et **actif en production**, où
`WN_AGENDA_ALI` est allumé depuis le 2026-08-05 : le praticien l'y décoche depuis
la liste habituelle, et le pack n'y annonce rien de faux — il envoie bel et bien
l'agenda alimentaire, à chaque patient onboardé. Ce sont les environnements où le
drapeau est éteint qui voyaient le blocage.

La modale d'édition affiche maintenant, sous la liste habituelle et dans un bloc
distinct, les seuls instruments suspendus **déjà présents dans le pack ouvert**,
chacun décochable. Ils restent visibles quel que soit le filtre de catégorie ou
le mode d'affichage : un instrument suspendu n'a pas de métadonnée fonctionnelle
fiable, et le filtrer masquerait le seul chemin pour l'enlever.

L'asymétrie tient à la structure : le bloc est bâti sur l'instantané des
questionnaires du pack pris à l'ouverture, donc un suspendu absent du pack n'y
apparaît jamais. **Ce bloc retire, il n'ajoute pas** — et le refus d'ajout côté
serveur (409) n'est pas touché. Les listes qui proposent des questionnaires à
assigner continuent, elles, de ne montrer que les instruments actifs.

Ce n'est pas une impossibilité définitive de rajout, et il ne faut pas le lire
ainsi : un instrument suspendu par un drapeau redevient **actif** dès que ce
drapeau est allumé, et il réintègre alors les listes ordinaires, où il se coche
comme les autres. Ce qui est fermé, c'est l'ajout d'un instrument **suspendu dans
l'environnement où l'on est**.
