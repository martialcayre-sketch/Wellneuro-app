### Portail : la photo du repas à l'agenda alimentaire, livrée éteinte (D-437, 2026-11-04)

File C, place 11 (H83). Le code de D-437 §6 est livré derrière un drapeau neuf et éteint,
`WN_PORTAIL_CAPTURE_REPAS` (chaîne exacte `true`, absent = fermé, jamais ouvert quand
`WN_AGENDA_ALI` est fermé). Ouvert, l'écran de saisie d'une journée d'agenda propose
« Photographier mon repas » et sa ligne d'information, textes de D-437 §5 mot pour mot. La
prise passe par `getUserMedia` dans la page ; l'image reste sur une toile en mémoire, n'est
jamais transmise ni écrite dans le stockage du navigateur, et s'efface à l'enregistrement
de la journée, au retour à la frise, au changement de date et quand la page est quittée.
Aucun champ de fichier, aucun repli : sans caméra accessible, ni bouton ni ligne. La route
de lecture de l'agenda rend `captureRepas`, vrai pour le seul dossier majeur ; aucune route
ne reçoit la photo. Cinq bancs : aucun champ de fichier, aucun envoi réseau de l'image,
aucun stockage, suppression à l'enregistrement et à l'abandon, rien pour un dossier mineur
ou d'âge inconnu. Sans migration. L'activation revient au responsable (porte 18), puis le
constat de D-437 §7.
