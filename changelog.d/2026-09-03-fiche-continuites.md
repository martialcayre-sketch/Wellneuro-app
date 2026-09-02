### La fiche garde le fil : synthèse sur place, retour fidèle, onglet mémorisé (2026-09-03)

Suite du lot 2 de l'audit du cockpit, côté fiche patient. Le tiroir
« Synthèse IA & booklet » affiche désormais la dernière synthèse validée en
lecture seule (résumé praticien et narratif patient), chargée paresseusement
à l'ouverture du tiroir — lire un texte déjà validé ne coûte plus trois
clics et un changement de route ; la génération et l'édition restent dans
l'espace dédié, et un second lien « Composer un document » emporte
l'identité du dossier vers `/dashboard/documents?idPatient=`. Le lien de
retour suit le point d'entrée : arrivé par la porte trajectoire
(`?onglet=trajectoire` — rail « Fiche-trajectoire », inbox du Fil), on
repart vers `/dashboard/trajectoires`, plus vers la liste héritage.
L'onglet actif se mémorise par patient (localStorage, même doctrine que la
mémoire de phase : un confort, jamais une condition ; le deep-link prime
toujours), lu dans un effet au montage — jamais dans l'initialisateur
d'état, où `window` casserait le rendu serveur. `InstrumentTiroir` devient
un mince habillage de la primitive `PanneauSuperpose` posée par le lot 2a.
