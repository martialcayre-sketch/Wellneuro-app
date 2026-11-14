### J2-base : D-515, copie de la désignation à l'envoi (H59, lot D-277, 2026-11-14)

Première PR du code de [[D-515]] §6.2, file A, derrière
`WN_ENABLE_DECLARATION_SUICIDE_CAB`, éteint. Drapeau éteint, l'envoi est
inchangé.

- À l'envoi d'un instrument du cabinet déclaré « oui », l'assignation reçoit,
  avec la copie de la déclaration, la désignation en vigueur, lue sous le même
  verrou : la question désignée, la valeur de son option « non », et une copie
  figée du nom de l'instrument, de l'énoncé et des options.
- Une désignation absente, ou qui ne concorde plus avec la définition, n'est
  pas copiée. L'envoi part, la copie reste vide, la désignation est inconnue
  ([[D-515]] §7), et l'événement `ASSIGNATION.DESIGNATION_SUICIDE.INCONNUE` en
  garde la trace.
- Rien ne lit encore cette copie : la règle `SAF-QUEST-02` et ses lecteurs
  viennent dans les PR suivantes du lot. Un banc tient que la copie n'a qu'un
  constructeur, pour qu'elle ne bouge pas après l'envoi.
