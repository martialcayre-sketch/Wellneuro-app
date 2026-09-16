### Le sens d'un échange se lit une seule fois, et l'accueil cesse de citer le dossier (2026-09-16)

La colonne `sens` de `correspondances_medecin` n'a aucun CHECK, et chacun des
deux écrans s'était écrit son propre repli — **en sens inverse**. Une valeur hors
vocabulaire se lisait « Envoi consigné » dans le panneau de l'accueil et
« Réponse transcrite » sur la fiche, pour la même ligne, l'accueil accompagnant
en plus son libellé faux d'un extrait du texte consigné. Une colonne non
contrainte produisait deux affirmations incompatibles sur le même dossier.

Départager les deux écrans aurait consisté à choisir **laquelle des deux erreurs
garder**. `libelleSens` et `sensExpose` vivent désormais dans le domaine, seuls
lecteurs du produit : les deux sens connus gardent leurs libellés, et tout le
reste rend « Échange consigné » — vrai des deux sens, donc sûr — pendant que le
contrat expose `null`. C'est le patron de `DC-24`, celui-là même qui empêche
`sans_ancrage` de se présenter comme `perimee` : on ne fait pas porter à une
donnée un jugement qu'elle ne soutient pas.

**Le panneau « Correspondance récente » ne cite plus le dossier.** Il rendait
120 caractères du texte consigné — de la parole clinique transcrite — sur l'écran
d'accueil, ouvert toute la journée, et cette lecture n'était journalisée nulle
part : `G-TRUST-04` journalise la lecture d'un dossier **nommé**, et une liste
transversale n'en est pas une. Plutôt que d'étirer la doctrine pour couvrir la
surface, la surface a été réduite. La colonne `texte` n'est même plus
sélectionnée : un extrait retiré du rendu mais toujours chargé resterait à un
`console.log` de distance.

**Le badge du rail a sa propre route.** Il lisait `nbRecentes7j` sur `recentes`,
qui sert cinq dossiers nommés — et le rail **jetait les lignes**. Chaque montage
du rail, donc chaque chargement du cockpit et chaque ouverture du tiroir tablette
qui en monte une seconde instance, résolvait cinq noms de patients pour afficher
un entier. `recentes/compteur` ne traverse aucune table d'identité : sa réponse
ne peut pas porter de donnée patient, et c'est une garantie de forme plutôt
qu'une discipline de rendu.

Vérifié par mutation : réintroduire le repli `l.sens === 'entrant' ? … :
'sortant'` dans la route fait rougir le banc qui exige `null`, sur cette
assertion et sur elle seule.
