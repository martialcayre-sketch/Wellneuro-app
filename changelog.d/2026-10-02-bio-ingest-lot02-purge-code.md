### BIO-INGEST LOT-02 : la purge du compte rendu en œuvre, et l'heure lue (2026-10-02)

- **La dernière décision purge le document** ([[D-258]]). Dans la même
  transaction que les décisions, sous le même verrou. La purge n'est tentée
  qu'une fois ses conditions établies : aucune ligne de l'extraction courante
  encore proposée, aucune extraction en cours. La base ne peut donc pas la
  refuser et annuler les décisions avec elle.
- **L'échéance de 30 jours** est tenue par un cron Scalingo (`web/cron.json`,
  `npm run bio:purge-echeance`, chaque heure — un passage par nuit aurait
  dépassé d'un jour le « au plus tard 30 jours » de la v12) :
  - une transaction par compte rendu, sous le verrou de l'extraction ;
  - les candidats sont choisis par l'horloge de la base ;
  - une extraction abandonnée (`en_cours` périmé) est d'abord close
    `delai_depasse`, sinon elle bloquerait la purge pour toujours ;
  - le journal ne porte que des compteurs.
- **Un document purgé ne se relit plus** : la relance rend 409
  `document_purge`, plutôt qu'une 500 sur le refus de la base. L'écran le dit
  et ne propose plus la lecture ; les lignes restent décidables.
- **Heure lue** : l'extraction écrit `heure_lue`. Une heure imprimée « 00:00 »
  se valide telle quelle ; une heure absente reste exigée, à l'écran comme au
  serveur.
- **La liste des comptes rendus** montre l'extraction courante (la plus
  récente non échouée), comme la base et les décisions ; à défaut, le dernier
  échec, qui reste visible.
- **Garde** : `staging.guard.test.ts` nomme les deux seuls auteurs d'une
  modification de compte rendu, la dernière décision et l'échéance.
- Le drapeau `WN_BIO_INGEST_ENABLED` reste éteint. Il attend le premier
  passage du cron constaté et la signature du resolver.
