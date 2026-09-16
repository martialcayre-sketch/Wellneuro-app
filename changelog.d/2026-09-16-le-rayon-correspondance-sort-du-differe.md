### Le rayon Correspondance sort du différé, et son badge désigne enfin une tâche (2026-09-16)

`/dashboard/correspondance` affichait « Module différé » depuis le 2026-07-22,
pendant que le rail y accolait un compteur calculé sur des lignes réelles : le
seul chiffre affiché du rayon pointait vers la seule page qui n'en montrait
aucun. La fonction, elle, tournait — sans drapeau, dans l'onglet
« Correspondance » de la fiche patient.

**La page oriente, elle ne duplique pas.** C'est le patron de
`dashboard/biologie/page.tsx`, qui renvoie vers la Bibliothèque plutôt que de
rejouer le rayon : le geste vit sur le dossier, et il n'y a pas de dossier
courant ici. Elle ne rend donc pas une liste plus longue que celle de l'accueil
— élargir ce que cette surface nomme rouvrirait la question de journalisation
que [[D-209]] §3 laisse ouverte.

**La promesse de pièces jointes disparaît.** [[D-122]] les interdit tant que la
frontière n'est pas rouverte, et l'interdit est structurel — aucun champ fichier
au modèle. Le motif d'origine, « le mur HDS », est mort le 2026-08-31 ; il a été
remplacé, pas levé. L'écran contredisait donc une décision, pas seulement une
intention.

**Le badge cesse d'être un miroir.** Il recensait toutes les consignations du
praticien sur 7 jours glissants, sans filtre de sens — or les deux sens sont des
gestes du praticien. Il comptait ce que son lecteur venait lui-même de taper, et
retombait à zéro tout seul au huitième jour sans qu'aucune action n'ait été
faite ; transcrire une réponse le faisait **monter**. Il désigne désormais les
dossiers où un envoi a été consigné et où rien n'est revenu depuis sept jours —
la seule attente que cette table sache exprimer, et elle se résout par un geste.
Transcrire la réponse la fait maintenant **descendre**.

Deux réserves, écrites plutôt que tues : l'appariement se fait par **dossier**
et jamais par médecin (`medecinLibelle` est du texte libre), et le rail ne se
rafraîchit pas en cours de session — une relance traitée reste affichée jusqu'au
rechargement.

**La pastille n'est plus un nombre nu** : elle porte son énoncé, à l'œil comme
au lecteur d'écran, qui annonçait jusqu'ici « Correspondance 2 ». Le délai vient
du serveur — l'écran le rapporte, il ne le fixe pas.

**Le panneau de l'accueil dépose sur l'onglet**, pas sur la fiche : il fallait
jusqu'ici connaître l'existence de l'onglet « Correspondance » pour y revenir, la
garde de deep-link existant pourtant depuis SP-TRAJ.

Vérifié par mutation : retirer le filtre de sens du compteur fait rougir les deux
bancs qui tiennent le changement de sens. Et un e2e visite enfin cette adresse —
aucun des vingt-neuf spécifications ne le faisait, si bien que rien ne rougissait
quand la page contredisait le produit livré.
