### Une ouverture de dossier ne lit plus la trajectoire deux fois (2026-09-04)

`FichePatientPanel` lit la trajectoire dès l'ouverture — le bandeau d'épisode en
a besoin — et `ClinicalRuntimeSection` relisait **la même URL** à son montage.

Ce n'est pas qu'un aller-retour réseau de trop : ces GET **journalisent l'accès
au dossier** (`G-TRUST-04`). Le journal inscrivait deux accès là où le praticien
n'a ouvert le dossier qu'une fois — un registre d'accès qui compte faux est un
registre qu'on ne peut plus opposer.

La section devient **pilotable** : quand la fiche lui passe sa lecture, son
statut et son rappel, la fiche est propriétaire et la section ne lit plus rien
d'elle-même. Sans ces props, elle se comporte exactement comme avant — les 32
bancs qui la montent seule passent inchangés.

**Le contre-audit a bloqué la première version, et il avait raison.** Elle
laissait le rechargement de trajectoire accroché à `readyDecisionCardId`, en le
déclarant « rafraîchissement légitime ». Il repartait donc à **chaque ouverture
d'un dossier déjà confirmé** — le cas le plus courant — et réinscrivait le
second accès au registre : le défaut même que ce lot corrige. Le rechargement
suit désormais le GESTE de confirmation, jamais la carte, exactement comme
`assemblerPropositions` juste à côté et pour la raison que `D-118` a déjà
écrite : *un rejeu n'est pas une confirmation*. Le banc couvre maintenant les
deux réponses du runtime (`proposal` et `ready`) ; sur `ready`, il compte 2
lectures sans le correctif.

Trois défauts voisins, trouvés par le même contre-audit :

- `chargerTrajectoire` n'avait **aucune garde d'obsolescence**, alors que son
  voisin `chargerCorrections` en porte une depuis l'origine. Deux lectures qui se
  croisent — celle de l'ouverture encore en vol, celle du geste — pouvaient faire
  écraser l'état frais par l'historique d'avant la confirmation, jusqu'à affirmer
  qu'aucun cycle n'est lisible (`DC-24`). Compteur de génération ajouté, et une
  garde structurelle exige désormais la même discipline de tout lecteur du
  fichier.
- Les trois props du mode piloté étaient **indépendamment facultatives** : le
  type déclarait valide un `statutTrajectoirePartage="chargee"` sans trajectoire,
  qui rendait « Aucun cycle lisible » à partir d'une donnée jamais fournie. Elles
  forment maintenant une union discriminée — tout ou rien.
- L'effet dépendait de l'**identité** de `rechargerTrajectoire` : un appelant
  passant un rappel en ligne l'aurait fait boucler, chaque tour inscrivant un
  accès. La dépendance disparaît avec le rechargement.
