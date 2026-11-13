### Refonte Lien, PRA-3b PR 4 : phase Actions, protocole et diffusion (P15 à P18) (2026-11-13)

- Protocole chargé au téléphone (Q13 a) : la raison d'être et les trois plans
  de chaque action grandissent avec leur texte (44 px au moins) au lieu de
  défiler dans une ligne ; un plan reste d'une ligne logique (un saut de ligne
  collé est retiré). Marges des actions resserrées au téléphone.
- Sous 1 024 px, dès deux actions, un sommaire d'ancres « Action N », nommé par
  l'intitulé « Actions » (désormais un titre de niveau 4), amène le focus sur
  l'action choisie. L'état du brouillon et « Enregistrer la version » vivent
  dans une barre basse collante, au-dessus de la barre de navigation du
  téléphone ; champs, boutons et ancres gardent une marge de défilement de sa
  hauteur, pour que le focus ne passe pas dessous.
- Diffusion (Q14 a) : tant que le constructeur porte une saisie que le serveur
  n'a pas (modifiée depuis l'enregistrement, en cours d'enregistrement,
  refusée, ou en attente d'une confirmation de registre), « Valider pour
  diffusion » est désactivé, avec « Modifications locales non enregistrées. »
  juste au-dessus. Le clic validait la version enregistrée, autre que celle à
  l'écran. Au retour sur une sous-vue, la page retrouve la hauteur quittée et
  le focus reste sur le bouton pressé ; la saisie locale survit, comme avant.
- Anneau de focus sur chaque champ et bouton du constructeur ; une seule
  action pleine par zone (Q3 a), inchangée. Un banc garde que l'aperçu de
  diffusion n'émet aucune requête.
- Aucun texte neuf, aucun changement serveur, rien de clinique : contenu servi
  au patient, validation et règles inchangés.
