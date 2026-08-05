### Corrigé — L'annulation d'une assignation se décide sur une passation réelle, plus sur un statut (lot LOT-07)

`POST /api/praticien/assignations/annulation` refusait dès que
`statutReponses !== 'non_rempli'`, en disant « Ce questionnaire a déjà été
rempli ». Son commentaire annonçait pourtant viser une **passation clinique** :
l'intention parlait du contenu, la garde lisait un statut.

Les deux divergeaient parce que `statutReponses` est un journal de gestes de
verrouillage, pas un indicateur de contenu — quatre valeurs, aucun retour vers
`non_rempli`, et aucune saisie patient d'agenda ne le déplace. `deverrouille`,
posé sans garde sur l'état de départ, rendait donc une assignation
**définitivement inannulable** pour une raison fausse.

Un seul prédicat porte désormais la décision (`lib/praticien/annulabilite.ts`),
importé par la route **et** par l'écran praticien : c'est leur divergence qui
avait produit le défaut. Il est en forme positive — `statutReponses` est un
`String` libre sans enum, une cinquième valeur future doit fermer l'annulation,
pas l'ouvrir.

#### Le gain n'est pas celui qu'on croit, et il est plus grand

Le chemin `non_rempli → deverrouille` n'a aucun appelant d'écran, et la
production ne compte aucune ligne dans cet état : la population débloquée est
vide. Ce qui se répare vraiment n'exige aucun appel direct.

`submit` crée la `QuestionnaireReponse` puis marque l'assignation
`Complété`/`verrouille` — **hors transaction**. Une annulation qui tombait entre
les deux lisait `non_rempli`, acceptait, écrivait `Annulée`… que `submit`
réécrivait aussitôt. **L'annulation disparaissait en silence**, sans que rien ne
le signale au praticien. Le comptage des réponses ferme ce côté-là.

#### Une écriture sans effet n'est pas un succès

La garde d'état est répétée dans le `where` d'un `updateMany` — précisément pour
que l'écriture puisse ne pas s'appliquer si l'état a bougé entre-temps. Rendre
`ok: true` dans ce cas aurait refait le même défaut sous un autre nom : une
annulation que le praticien croit acquise et qui n'existe nulle part. Zéro ligne
touchée rend 409.

La course reste ouverte de l'autre côté : une annulation entrée **avant** la
création de la réponse est toujours écrasée. La fermer exigerait de
transactionner `submit`.

#### Ce qui ne compte pas comme passation, délibérément

Les journées d'agenda (`AgendaAlimentaireJour`, `AgendaSommeilNuit`) n'attestent
aucune passation : un agenda de vingt journées reste annulable. Arrêter un
recueil en cours est le geste voulu, la persistance est append-only, et le
lecteur praticien continue de lister les journées après l'annulation.

#### L'écran connaît le même fait

`GET /api/praticien/patients` expose `aPassation` — un fait, jamais un verdict
`annulable` : un DTO de liste qui transporterait une décision d'autorisation
divergerait au premier changement du prédicat serveur. Sans ce champ, le geste
réparé serait resté inatteignable par l'interface.
