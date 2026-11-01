### Audit 3, lot Q3 : un seul e-mail par geste, même sous deux clics simultanés ; un échec ne bloque plus la cadence (D-398, D-399)

- Les e-mails d'accès au portail, d'objectif proposé, de rappel de
  questionnaire et de premier envoi d'un bilan réservent leur ligne de
  journal AVANT l'envoi, sous un verrou par dossier (ou par bilan). Deux
  requêtes simultanées ne lisent plus toutes deux un journal vide : la
  seconde attend la première, puis lit sa ligne. Aucune migration.
- Garde d'une heure (D-398 §3) : un second e-mail d'accès, ou d'objectif,
  vers le même dossier dans l'heure est refusé. Le refus est écrit
  « Non envoyé » sous son motif, et jamais rejoué.
  - À l'écran, l'accès refusé se dit : « … un e-mail d'accès est déjà parti
    vers ce patient il y a moins d'une heure. »
  - La relance d'objectif refusée répond comme sa cadence (429).
  - L'encart des nouveaux dossiers ne lit pas un refus comme un échec.
- Rappel de questionnaire : le rappel d'une carte du Fil envoie un seul
  e-mail pour tous les questionnaires du dossier rappelables à cet instant
  (gabarit neuf `relance_questionnaires@1`, sans échéance, nombre ni titre).
  Une seule ligne de journal porte leurs identifiants. Le Fil dit : « Rappel
  envoyé. Il couvre les {n} questionnaires en retard de ce dossier. »
- Premier envoi d'un bilan : deux clics simultanés n'envoient qu'un bilan ;
  le second reçoit la demande de confirmation du renvoi. La ligne réservée
  est soldée avec la clé de source de l'audit : un envoi, une ligne.
- Cadences des rappels de questionnaire et d'objectif : seuls les envois
  partis comptent. Une ligne « Erreur », un « Non envoyé » faute de
  messagerie ou un refus de garde ne rendent plus de 429.
- Banc sur base réelle `correspondance/reservation.pg.test.ts`, joué en CI :
  croisement forcé de deux requêtes sous le verrou. Verrou retiré, ses
  quatre bancs de concurrence rougissent ; filtre des envois partis retiré,
  ses trois bancs de cadence rougissent.
