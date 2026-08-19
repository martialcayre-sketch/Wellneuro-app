### Lecture des drapeaux de production — deux gestes entrent dans la file

- Vérification des valeurs d'environnement de production (tirage CLI vers un
  fichier cible explicite, `.env.local` prouvé intact, tirage détruit) :
  tous les drapeaux lisibles concordent avec la chaîne exacte que le code
  attend — famille `WN_ENABLE_*` à `'1'`, le reste à `'true'`. Trois
  variables *sensitive* restent illisibles par construction
  (`WN_ENABLE_CONTRADICTIONS_NNPP2` : pose à `1` enregistrée par `D-064`,
  horodatage concordant ; `WN_C5_ENABLED` : prouvée par le comportement ;
  `WN_AGENDA_RELANCE`).
- Deux découvertes entrent comme gestes dans
  `docs/claude/campagnes/FILE_ATTENTE.md` :
  - `WN_CB_RESULTS_ENABLED` vaut `true` en production alors que son verrou
    dit « jamais true avant l'attestation HDS ». Sans appelant aujourd'hui —
    piège armé pour CB-09. Geste : `false` ou retrait au panneau.
  - `WN_ENABLE_VALIDITE_PASSATIONS` est absent : filtre de validité inerte
    (documenté, `D-052`), route d'invalidation en 503. Allumage (`1`) =
    décision clinique praticien, jusqu'ici listée nulle part.
