### Protocole 21 jours — le patient reçoit enfin ses trois actions, son axe et son critère (2026-09-15)

Le constructeur fait saisir **trois** actions et affiche « Actions (3/3) ». Le
portail en servait **une** : la première par ordre d'insertion, et par rien d'autre
— il n'existe ni rang, ni champ « action principale » au contrat. Les deux autres
n'atteignaient le patient que si elles portaient une référence Boussole, et alors
sous forme de fiche alimentaire, pas d'action.

Il ne lisait pas non plus **sur quel axe on travaille** — le libellé signé de sa
priorité —, ni son **critère à trois semaines**, servi dans le JSON depuis toujours
et rendu par aucun écran. Les deux partent désormais.

**Cinq descriptions de « ce que le patient lit » coexistaient et ne se voyaient
pas.** Le contrat de vue patient était écrit, testé, et **sans appelant** ; deux
routes réécrivaient à la main une projection plus pauvre, dont l'une se déclarait en
commentaire « miroir exact » de l'autre ; et trois écrans redéclaraient chacun leur
type avant d'y couler le JSON. Le compilateur restait vert. C'est ainsi qu'un champ
servi pouvait n'être rendu nulle part pendant des mois.

**La carte de décision est recomposée au serveur, à chaque lecture.** Aucune table
ne la porte, et le contrat l'exige entière. Elle est rejouée depuis le dossier à
l'horodatage de confirmation de l'épisode — par la **même chaîne** que le cockpit et
que le vérificateur, jamais par une lecture à elle. Si son empreinte n'est plus celle
que le praticien a approuvée pour diffusion, **rien n'est servi** : ce que lit le
patient repose toujours sur le dossier que son praticien avait sous les yeux.

**Et le refus se voit des deux côtés.** Le patient lit une indisponibilité — jamais
l'attente paisible d'avant-protocole, qu'il aurait prise pour elle. Le praticien lit
sur son écran de diffusion que son protocole n'est plus affiché, et pourquoi le
relire. Un refus muet des deux côtés aurait déplacé le défaut au lieu de le fermer :
une garde que personne ne voit se mesure à zéro.

**Le carnet alimentaire s'ancrait sur la première action, quel que soit son type.**
Le défaut ne se voyait pas tant que toute action neuve naissait « alimentation » ;
depuis que le type est un geste du praticien, la première peut être une **orientation
médecin** — et le carnet l'aurait affichée comme l'essai à observer. Il s'ancre
désormais sur l'action alimentaire, ou sur rien. La fixture de son banc posait par
ailleurs un type qui n'existe à aucun contrat : le champ était libre, il ne l'est
plus.

**Le bouton « Ma fiche conseils » dit ce qu'il fait.** Il mène au centre
d'informations, de confidentialité et de droits, et n'a jamais eu de rapport avec la
fiche conseils du contrat — que la route écrit vide depuis toujours. La dette est
nommée au dossier de campagne ; elle n'est pas refermée par un libellé.

Voir [[D-191]].
