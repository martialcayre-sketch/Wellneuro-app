### Refonte Lien, PRA-6h2 : la fiche patient tient sous une réponse hors contrat, et ses « Réessayer » rendent le focus (2026-11-19)

Suite de PRA-6h (#2251), arbitrée « Prête, fiche à part » par le
responsable. Aucun texte neuf, aucun décor, ni route, ni garde, ni drapeau,
ni schéma, ni règle clinique.

- **Fiche hors contrat** (règle `error-recovery`). La lecture de la fiche
  (`/api/praticien/equilibre`) ne testait ni `r.ok` ni la forme : sous un 500
  JSON `{error}` d'un autre émetteur, `data.patient` indéfini faisait tomber
  la page. La réponse hors contrat tombe désormais dans l'état d'échec
  existant, « La fiche patient n'a pas pu être lue. », avec son
  « Réessayer ». Même correctif pour le détail des besoins.
- **Focus après les « Réessayer » de la fiche** (arbitrage du 2026-11-18,
  question `20261118-2228-d`) : au bouton si la relecture échoue encore,
  sinon au titre du panneau relu. Fiche et demandes de correction : le nom du
  patient en tête de fiche. Questionnaires échus et envois : le titre de la
  zone focale. Onglet Trajectoire : le panneau, nommé par son onglet.
  Réévaluation : le titre de son résumé ; le rappel de relecture de la fiche
  rend désormais sa promesse, que le runtime attend. Les réponses et les
  renseignements, qui géraient déjà leur focus, ne changent pas.
- **Focus posé ailleurs** : un « Réessayer » ne reprend plus un focus que le
  praticien a posé ailleurs pendant la relecture (hook partagé, synthèses,
  documents, copilote). Un focus resté sur le conteneur du bouton compte
  comme non posé : c'est là que Safari le met quand on clique un bouton.
