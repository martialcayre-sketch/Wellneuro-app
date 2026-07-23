### SP-CONV LOT-04 — parcours patient synchronisé : les étapes 5-6 vivent enfin (2026-07-23)

Les étapes « Analyse du praticien » et « Restitution » du parcours patient
ne restent plus indéfiniment « à venir » : le hub les dérive du contrat
partagé sur les seuls signaux que le portail sert déjà (D11) — statut de
consultation et booklet envoyé ajoutés en champs additifs de
`/api/portail/assignations` (statut de succès `Envoye` seul, un échec
d'envoi ne fait jamais avancer le parcours), protocole diffusé et fin de
cycle lus sur la route protocole existante, en résilience prudente. Quand
plus rien n'est à compléter, « Mon parcours » porte la formulation D7
(« Vos éléments ont été transmis » / « Votre praticien les prépare » /
« Votre restitution est disponible » / « Votre prochaine étape est
prête ») — jamais de score, jamais de délai promis. Lecteurs d'écran :
chaque étape terminée est annoncée « (terminée) », plus seulement l'étape
courante. Dédoublonnage du CTA : l'action recommandée mise en avant par
« Mon parcours » ne réapparaît plus dans « À compléter » (le compteur
reste complet). Contrat HC-F LOT-04 amendé et daté dans le composant.
