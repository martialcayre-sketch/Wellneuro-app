### Relancer un envoi échu depuis la fiche-trajectoire et depuis le Fil (D-562, D-488 DOC-20, 2026-11-25)

Demande du responsable sur la carte des envois de la phase « Données
fiables » : relancer un questionnaire en souffrance, et lever l'alerte du
Fil dès que l'envoi est traité.

- **Relancer** (`D-562` §1, §2, §4) : sur une ligne dont l'échéance est
  dépassée, un clic envoie au patient un seul e-mail pour tous les envois
  échus du dossier et, si l'e-mail est parti, porte leur date limite au jour
  de la relance plus 7 jours (`JOURS_NOUVELLE_ECHEANCE_RELANCE`). Un échec ou
  une messagerie absente ne change aucune date. Dialogue de confirmation qui
  liste les envois couverts ; badge « échéance dépassée le … ».
- **Plus de « Débloquer » d'abord** (`D-562` §3, amende `D-404` §1) : la
  nouvelle date rouvre l'envoi échu. Le refus « Ce questionnaire a expiré :
  déverrouillez-le avant de le rappeler. » est retiré ; la cadence de 3 jours
  passe avant le contrôle de l'échéance, pour qu'un second clic dise « un
  rappel est déjà parti ».
- **Agenda du sommeil** (`D-562` §5) : pas de bouton, et le rappel groupé ne
  le couvre plus ; refus serveur T-94 si la route est appelée sur lui.
- **Fil du jour** (`D-562` §6, §7) : la carte « retard » porte « Relancer »
  (même route, mêmes messages) à la place de « Débloquer »/« Rappeler » ;
  elle se lève jusqu'à la nouvelle date. La carte « sans avancée »
  (situation 3, amende `D-440` §1) ne compte plus un envoi relancé tant que
  sa nouvelle date n'est pas dépassée ; la relance n'est pas un pas du
  parcours.
- **Textes** : T-81 à T-94, inscrits dans `D-488` par DOC-20, acceptés mot
  pour mot. Gabarits d'e-mail inchangés. Aucune migration, aucun drapeau.
