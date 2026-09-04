## 2026-09-03 — feat(cockpit) : `?phase=` ouvre la fiche sur une phase précise du rail

Un lien partageable vers une phase du cycle clinique — « regarde la
Réévaluation de ce dossier » — à côté du `?onglet=` qui existait déjà. Même
garde : la valeur est validée **côté serveur** dans la page, et toute valeur
hors liste est ignorée. Jamais de 404, jamais de rail vide.

**Le point délicat était l'articulation avec la règle D5.** Une phase demandée
vaut une navigation du praticien : elle prime, et n'est pas écrasée. Sans cela,
elle s'afficherait à l'ouverture puis serait remplacée une seconde plus tard,
quand l'état runtime s'établit et que D5 choisit la phase due — le lien partagé
montrerait alors autre chose que ce qu'il désigne. Un banc le verrouille sur le
cas qui fâche : runtime sans épisode confirmé, où D5 ouvrirait sur « Décision
21 j », et lien demandant « Suivi ».

**Elle n'est en revanche pas mémorisée.** `choisirPhase` écrit la dernière phase
consultée en `localStorage` ; l'arrivée par lien, non. Un lien reçu d'un
confrère ouvre une vue, il ne réécrit pas silencieusement la phase par défaut du
destinataire sur ce dossier. Banc dédié.

La liste des sept phases rejoint celle des onglets dans
`lib/praticien/ongletsFiche.ts` — module pur, seul endroit d'où la page serveur
peut valider. `FichePatientPanel` importe désormais ce type au lieu d'en tenir
un second : deux listes dériveraient, et la dérive se lirait comme un deep-link
qui « ne marche pas » sur la phase qu'une seule des deux connaît.
