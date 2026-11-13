### J2-base : D-515, migration de la copie de la désignation sur l'assignation (H59, lot D-277, 2026-11-13)

Migration seule, file A, première étape de l'ordre de [[D-515]] §6. Aucun
code ne lit ni n'écrit ces colonnes avant le lot de code, servi derrière
`WN_ENABLE_DECLARATION_SUICIDE_CAB`, éteint.

- `assignations` reçoit, à côté de la copie de la déclaration, la copie de
  la désignation prise à l'envoi d'un instrument du cabinet : l'identifiant
  de la question désignée, la valeur de son option « non », et une copie
  figée du nom de l'instrument, de l'énoncé et des options.
- La base n'accepte la désignation qu'entière, et seulement sous une
  déclaration « oui ». Sous « oui », son absence reste admise : elle vaut
  désignation inconnue, jamais « non ».
- Aucune reprise : les assignations existantes restent vides.
- Un contrat SQL en CI tient ces règles ; le contrat de NF-7 est ajusté pour
  admettre cette seconde contrainte sur la copie de la déclaration.
