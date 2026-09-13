### Orientation — le refus « déjà assigné » dit depuis quand, et où annuler

Le panneau d'orientation fermait déjà le bouton sur une cible déjà assignée —
`dejaAssigne` ne compte que les assignations **ouvertes**, et le refus nomme le
geste possible. Ce qui manquait n'était pas la garde, c'était **le fait** : un
envoi posé il y a 39 jours et un posé hier portaient exactement le même texte,
alors que la fiche, deux blocs plus haut, sait dire « 39 j » depuis avant-hier.

Le service sert donc `dateAssignationOuverte` — la pose de l'assignation ouverte
qui bloque la cible, **la plus ancienne** quand il y en a plusieurs. Fait
administratif ajouté par le service au même titre qu'`idPackBase` : le moteur
reste pur et ne la reçoit pas. Servie seulement quand le moteur a bien dit
`dejaAssigne`, pour qu'aucun lecteur ne déduise le verdict de la présence du
champ.

**Un commentaire de doctrine est devenu faux, et sa conclusion survit pour une
autre raison.** `messages.ts` motivait l'absence d'indication de lieu ainsi :
« l'annulation vit dans la liste des patients, pas sur la fiche qui porte le
panneau d'orientation ». Ce n'est plus vrai depuis que la fiche porte la liste
des envois **et** le bouton d'annulation — la chaîne est `FichePatientPanel` →
`TrajectoirePanel` → `OrientationPanel`, le geste est à quelques centimètres du
refus.

Ce qui interdit toujours de nommer le lieu dans la constante, c'est le **compte
des lecteurs**, mesuré plutôt que supposé : cinq écrans la rendent —
`BibliothequePanel`, `PatientsPanel`, `PacksPanel`, `fil/FileEnvoiAside` et
`OrientationPanel` — et un seul est sur la fiche. « Sur cette fiche » dans la
constante mentirait sur les quatre autres. Le lieu appartient donc à l'écran qui
sait où il est, et il est dit là.

**Un seul formatage de l'ancienneté.** `anciennete()` quitte
`FichePatientPanel.tsx` pour le module feuille `assignations/peremption.ts`, où
vit déjà `joursDepuisPose` — déplacée, pas recopiée. Deux formatages du même fait
auraient donné deux nombres sur la même page. Effet de bord, assumé et testé :
elle borne désormais à zéro, donc une pose au futur rend « envoyé le … » au lieu
d'un compte négatif.

**Une date reste absente, et c'est voulu** : sur un pack. Un pack est dit couvert
parce que *tous* ses membres le sont, à des dates qui peuvent différer — une date
unique sous une carte de huit instruments désignerait un objet que le praticien
ne peut pas identifier. Même motif que l'absence de nombre dans le refus.

Corrigé au passage, sans une virgule de comportement : la documentation de
`idsQuestionnairesAssignes` annonçait « toutes assignations confondues », alors
que son seul appelant filtre les statuts terminaux. Un lecteur y aurait lu un
historique là où c'est un état courant.
