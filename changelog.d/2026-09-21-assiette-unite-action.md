### L'assiette indiquée peut enfin devenir une action — et deux arbitrages réputés ouverts étaient tranchés depuis cinq jours (2026-09-21)

**La carte des assiettes indiquées propose un geste, et n'en exécute toujours
aucun.** Sur chaque assiette INDIQUÉE — jamais sur une non évaluée, où le même
bouton ferait d'un « on ne sait pas » un « c'est indiqué » — un bouton « Retenir
pour le protocole » remonte le choix au cockpit ; le constructeur l'insère, sur
un second geste, en action alimentaire portant la référence d'assiette ; le
praticien enregistre, sur un troisième. La route n'a toujours que son `GET` :
rien n'est écrit par la carte, et le banc qui comptait ses boutons à zéro compte
désormais un par ligne indiquée, zéro formulaire, zéro champ de saisie.

**Trois portes gardent l'écriture, et la troisième n'existait que dans un sens.**
Contrat V4 explicite, action `food` seule — `adviceSheetRef` est fermé à
l'écriture depuis `D-200` —, et **axe d'indication**. Ce dernier terme exécute
`D-213` §10 (« seul cet axe peut porter une action ») : `D-230` avait interdit
qu'une assiette d'indication rejoigne un épisode d'observation, mais rien
n'empêchait un repère de moment de repas — « Soir léger », adossé à aucun
protocole du corpus — de devenir une unité de prescription. Il n'existait aucun
chemin pour le faire ; ce lot en ouvre un, donc il ferme le sens manquant. La
garde est au domaine, l'écran la rejoue seulement pour dire le refus en français.

**La référence n'est pas validée, elle est RE-DÉRIVÉE** — leçon de `D-239`
appliquée d'emblée : entre vérifier ce qu'on reçoit et recalculer ce qu'on sait,
seul le second ne se laisse pas soumettre. Un `contentHash` réécrit sort là.

**Une jointure a failli faire buter le geste sur un mur, et aucun banc de module
ne l'aurait vue.** Le constructeur ne demandait le contrat V4 que si une action
était suspendue. Une assiette posée sur un protocole sans suspension serait donc
partie en V1 — et le moteur l'aurait refusée, sur un geste que l'écran venait de
proposer. Le défaut ne vivait ni dans le moteur ni dans la carte, mais entre les
deux.

**Stricte à l'entrée, conservatrice à la sortie.** La relecture d'un protocole
persisté vérifie la structure et RIEN DE PLUS : brancher la fraîcheur en lecture
lierait la lisibilité d'un protocole déjà diffusé à l'état courant du catalogue,
et l'écran du patient s'éteindrait le jour où une assiette change de libellé. Un
cas de banc porte ce refus de symétrie, pour qu'une révision bien intentionnée
ne l'« aligne » pas.

**ET LE CADRAGE MENTAIT PAR SA SEULE FORME.** Son tableau porte quatre
arbitrages ; B1 et B2 y étaient barrés, B3 et B4 non. Or `D-213` — écrite le
même jour que ce cadrage — déclare fermer « les quatre arbitrages B1→B4 », et les
rend : §11 pour les familles, §12 pour la Boussole. Deux lignes non barrées se
lisaient donc « à décider » quand elles disaient « à faire », et cinq jours
durant. Ce qui restait n'était pas une décision mais un chantier ; le tableau est
corrigé, et il porte désormais en tête la raison de l'erreur.

**LA REVUE A TROUVÉ DEUX DÉFAUTS RÉELS, ET LE PREMIER ÉTAIT LE PIRE DU LOT.**
L'assiette retenue n'était remise à zéro par rien : le cockpit étant réutilisé
d'un dossier au suivant, celle du patient A restait dans le bandeau du patient B,
insérable puis **enregistrable dans son protocole**. Corrigée par un effet de
remise à zéro ET un état daté du dossier — le second seul tenant le rendu
intermédiaire, qu'aucun banc ne voit. Le second défaut : la relecture d'un
payload persisté ne faisait pas respecter le contrat V4, là où les deux gardes
voisines le font. Mon asymétrie était trop large — le catalogue peut dériver, la
version du payload non.

**Et le banc qui devait tenir le premier est né vacant** : il passait encore une
fois les deux mécanismes mutés, parce que la file de réponses épuisée faisait
tomber le constructeur dans sa branche dégradée. Un témoin d'anti-vacuité l'a
rendu discriminant ; ce qu'il garde est la propriété, pas l'un des deux
mécanismes, et c'est écrit tel quel.

**Ce que ce lot coûte à B3, et il faut l'écrire.** Jusqu'ici, remplir une famille
d'équivalence sur les douze assiettes d'indication ne périmait rien : aucune de
leurs références n'était persistable, le seul porteur en base étant l'épisode
d'observation, réservé aux trois repères. Après ce lot, une famille posée sur les
douze périmerait les protocoles qui les portent — `substitutionFamily` entre dans
le `contentHash`, vérifié par recalcul et non sur la foi du commentaire.

Aucune table signée touchée, aucune empreinte déjà persistée périmée, aucun
drapeau neuf : le geste est servi sous le verrou existant, et reste invisible
partout où il est fermé.
