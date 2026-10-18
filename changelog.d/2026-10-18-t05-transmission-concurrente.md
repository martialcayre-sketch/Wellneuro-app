### Portail patient : deux transmissions simultanées d'un même questionnaire ne créent plus qu'une réponse, un accusé et, le cas échéant, une alerte (t05, sans migration, 2026-10-18)

- **L'écart corrigé** (h1, intégrité des données ; démontré dans le code,
  sans occurrence observée) : les refus de la transmission lisaient
  l'assignation sans verrou. Deux envois simultanés (double clic, deux
  onglets) pouvaient donc les franchir ensemble. Ils créaient alors deux
  réponses et deux accusés de réception, et deux alertes au praticien sur une
  réponse suicidaire.
- **Désormais** : la réponse et le verrouillage de l'assignation s'écrivent
  dans une seule transaction, sous verrou de ligne (`SELECT … FOR UPDATE`),
  comme les clôtures des agendas. Le second envoi reçoit le refus qu'il
  aurait reçu en arrivant après : « Ce questionnaire a déjà été complété. »
  Accusé et alerte ne partent qu'après l'écriture, et pour un seul envoi.
- Une assignation déverrouillée par le praticien reçoit toujours sa nouvelle
  réponse.
