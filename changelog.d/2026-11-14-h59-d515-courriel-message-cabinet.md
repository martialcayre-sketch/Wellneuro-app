### J2-base : D-515, courriel et message au patient sur un instrument du cabinet (H59, lot D-277, 2026-11-14)

Troisième PR du code de [[D-515]] §6.2, file A, derrière
`WN_ENABLE_DECLARATION_SUICIDE_CAB`, éteint. Chemin clinique ; aucune
migration. Drapeau éteint, ou `SAF-QUEST-02` non signée (état livré), rien ne
change pour le patient ni pour le praticien : ni désignation servie, ni
message, ni courriel. Les textes signés de [[D-277]] §1 et §2 sont inchangés.

- **Courriel au praticien** ([[D-277]] §2) : `api/patient/submit` passe la
  désignation COPIÉE sur l'assignation de la transmission à
  `transmissionAppelleAlerteSecurite`. Pour un instrument du cabinet, le
  courriel part exactement quand `SAF-QUEST-02` produirait un constat — et
  seulement table signée, car il renvoie à une carte du Fil qui n'existe pas
  avant. Même réservation, même journal.
- **Message au patient** ([[D-277]] §1) : `api/patient/questionnaire` sert
  `designationSuicideCabinet` (question et valeur « non » copiées) aux mêmes
  conditions (`designationSuicideCabinetServie` : drapeau, copie « oui »
  lisible, table signée). `GenericQuestionnaire` affiche alors le message
  signé sous la question désignée et au résumé, avec la visibilité de
  [[D-506]]. La règle cliente lit ce que le formulaire transmet
  (`parseFloat`) ; toute valeur autre que la valeur « non » copiée est
  positive.
- **Bancs** : `reponseSuicide.guard.test.ts` confronte, pour chaque valeur
  choisie (options, hors options, décimales, vide, non numérique), le message
  du navigateur au courriel du serveur, sur chaque combinaison de drapeau, de
  signature et de copie ; la parité Fil ↔ cockpit couvre un instrument du
  cabinet ; les deux routes du patient passent leur assignation par
  `designationDeLAssignation`, sans nommer la copie. Un E2E
  (`portail-cabinet-designation-suicide.spec.ts`, drapeau allumé dans le seul
  serveur des E2E) prouve l'état livré : l'encart, ni désignation servie ni
  message.
