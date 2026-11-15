### J2-base : NF-7, la base refuse un instrument du cabinet publié sans déclaration (H59, troisième migration, 2026-11-15)

Migration seule, file A, après l'allumage de
`WN_ENABLE_DECLARATION_SUICIDE_CAB` (étape 4 de [[D-515]] §6 ; réponses
20261111-0028-a et 0029-a). Aucun code de l'application ne change.

- Un instrument du cabinet encore publié sans déclaration « question sur le
  suicide » repasse en relecture : il devra être redéclaré à sa
  publication. En production au recomptage du 2026-11-15 : aucun
  instrument du cabinet.
- La base refuse ensuite tout instrument publié sans déclaration, « oui »
  ou « non ». Hors publication, l'absence de déclaration reste admise.
- Conséquence acceptée : drapeau éteint, la publication d'un instrument
  jamais déclaré échoue en base, jusqu'au retrait du drapeau.
- Un contrat SQL en CI tient la règle ; le contrat de NF-7 et le banc de
  l'envoi sont ajustés (la course qui posait un instrument publié non
  déclaré est retirée).
