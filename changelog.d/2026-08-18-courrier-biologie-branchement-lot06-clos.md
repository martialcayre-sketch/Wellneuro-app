### LOT-06 — le courrier médecin est branché, et la campagne T0 se ferme (D-073)

- **Dernier appelant manquant du Lot F** :
  `POST /api/praticien/biologie/proposition/courrier` dérive la proposition
  côté serveur, génère la lettre à travers la garde non prescriptive
  (`assertRenduMedecinNonPrescriptif` — un courrier qui ne se rend pas ne se
  consigne pas), la consigne dans `CorrespondanceMedecin` **avec son ancrage de
  provenance**, et rend le texte pour transcription. Remise manuelle : aucun
  envoi.
- **Le texte ne vient jamais du client** : accepter un texte du navigateur
  rendrait la garde non prescriptive contournable par construction. Le
  praticien ne fournit qu'une chose — le nom du médecin destinataire ;
  l'auteur, la date et l'ancre viennent tous du serveur. Un banc le prouve par
  mutation : une route qui accepterait le texte du corps rougit.
- **L'ancre est celle du document RENDU** : `ancrage_sha256` et
  `ancrage_version` sont relus dans la `provenance` du bloc que la garde a
  jugé — ni reconstruits depuis une constante, ni fournis par l'appelant. Banc
  par mutation : une route qui reconstruirait l'ancre rougit. C'est ce qui fait
  des colonnes de `D-073` une garde, pas deux champs de plus.
- **Garde d'accès partagée** (`gardeProposition.ts`) entre les trois routes de
  la proposition : deux routes qui recopient le même ordre de gardes sont deux
  routes qu'on peut oublier de corriger ensemble — même motif que le retrait de
  la garde jumelle du service en `D-072`. L'ordre reste : drapeaux → session →
  forme → appartenance (qui journalise).
- **Écran** : formulaire « Courrier au médecin traitant » sous la proposition —
  saisie du destinataire, refus serveur affichés tels quels, texte à
  transcrire rendu avec sa provenance (version et empreinte). L'écran dit
  qu'aucun envoi n'est automatique.
- **La campagne T0 se ferme** : LOT-06 passe `terminé`, `CAMPAGNE.md` porte
  `terminée (2026-08-18)` — dix lots sur dix —, `.wn/state.json` passe `idle`
  et la vue `ACTIVE_CAMPAIGN.md` est resynchronisée. Les réserves connues
  restent nommées : SCOFF différé (LOT-03), table de priorités non signée
  (LOT-04), appariement NABM et liens biomarqueur ↔ besoin à zéro ligne (lots
  de curation signée, pas des dettes techniques).
- **Ce que la revue a changé (GO sous conditions → refermé)** : le texte
  consigné est désormais couplé STRUCTURELLEMENT à ce que la garde a jugé — le
  générateur refuse (`bloc_non_diffuse`) si le rendu médecin ne porte pas le
  texte à consigner ; sans cela, un bloc devenu non diffusable aurait fait
  passer la garde à vide sur un corps de repli. Le consentement « partage
  médecin traitant » est exposé sur le formulaire (décision du 2026-07-22 :
  exposé, jamais opposé). Le geste ne s'offre que si quelque chose est
  réellement proposable (même prédicat que le générateur, `STATUTS_PROPOSES`
  exporté). Un courrier consigné ne se re-consigne pas sans changer de
  destinataire. Les refus portant sur le texte généré rendent 409 (le client
  n'en est pas l'auteur), la création rend 201 comme la route sœur, et le
  `catch` de consignation ne journalise que le nom de l'erreur — jamais son
  message, qui peut porter le texte de la lettre.
- **Un banc a mesuré la marge de longueur** : au catalogue réel, un courrier à
  quinze panels fait ~4 000 caractères sur 8 000 consignables — mais la marge
  n'est PAS structurelle : des libellés deux fois plus longs la dépassent
  (8 272 mesurés). Le banc est calibré aux dimensions réelles du catalogue, et
  quiconque allonge libellés ou objectifs doit savoir que la borne se
  rapproche.
- **Dettes nommées, pas soldées** : l'ancrage de provenance est en ÉCRITURE
  SEULE — aucun chemin de lecture n'expose `ancrage_sha256`/`ancrage_version`
  ni ne les compare à la table courante ; le fil de correspondance devra les
  afficher (« concordante / périmée ») pour que les colonnes deviennent la
  garde promise. Aucun E2E ne couvre la proposition ni le courrier, alors que
  `WN_CB_PROPOSITION` est posé en production. Le courrier ne nomme jamais le
  patient dans son texte (minimisation — seul `id_patient` relie la lettre au
  dossier) : à confirmer comme choix, pas comme oubli.
