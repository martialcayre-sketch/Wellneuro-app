### Adressages sur signal d'alerte : la couverture s'écrit avec la lettre (`D-257`, LOT-03) (2026-10-03)

La lettre d'adressage consignée écrit désormais, dans la même transaction, la
ligne `adressages_signal_alerte` qui nomme les constats qu'elle couvre : la route
relit la consultation porteuse (identifiant et anamnèse ensemble) dans la
transaction, et dérive les constats de `construireSafetyFindings`, la fonction
que le moteur appellera pour les comparer. Pas de lettre sans couverture : une
lettre qui ne couvrirait aucun constat n'est pas consignée. Nouvelle route
`POST /api/praticien/adressage/revocation` : une révocation motivée (2 000
caractères au plus) d'un adressage de ce dossier, une fois, sans drapeau — elle
ne fait que rebloquer. La garde « qui écrit » nomme ses deux écrivains et balaie
désormais `scripts/`, `prisma/` et `e2e/` ; le nettoyage des E2E supprime les
couvertures avant les consultations. **Aucun comportement clinique ne change** :
la couverture n'est lue par aucune surface tant que le LOT-04 n'est pas ouvert.
