- **Mise à jour (2026-11-18, part B, code du second appel selon D-539)**.

  PR de code du lot `h95-b-code` (file B), sous `release-db`, sans migration. Elle livre D-539 §2, §4, §5 et §7 ; rien ne s'ouvre, `WN_SYNTHESE_BIOLOGIE_ENABLED` reste éteint.
  - second appel (`lib/synthese/appelBiologie.ts`, consigne `synthese-biologie-v1`) : le bloc seul, après la réussite de l'appel principal, schéma fermé à deux clés, une relance, délai borné ;
  - appel principal en `synthese-v37` : il ne reçoit aucun résultat et ses clés biologiques sont rejetées ;
  - assemblage par le code : champs du second appel, vides sans lui ; phrase N3 en fin de narratif dès que le bloc est construit ;
  - trace `blocBiologie` et `appelBiologie` (version, modèle, issue), deux échecs distincts, journal sans contenu ;
  - « Vos données personnelles » v24, IA v9, conditions v7, e-mail `conditions_utilisation@7`, dossier RGPD (2 quater, rubriques 5, 6, 7, 13), recopiés de D-539 et relus par les bancs dans la décision.

  **Suite :**
  - évaluation rejouée selon D-539 §8 (24 dossiers fictifs × 3 passages, zéro violation) ;
  - envoi de l'e-mail @7 et constat des versions servies, gestes du responsable ;
  - priorisation de l'évaluateur signé (F3).

  Drapeau éteint jusque-là.
