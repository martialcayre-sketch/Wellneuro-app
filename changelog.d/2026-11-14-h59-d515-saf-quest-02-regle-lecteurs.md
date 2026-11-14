### J2-base : D-515, règle `SAF-QUEST-02` non signée et ses lecteurs (H59, lot D-277, 2026-11-14)

Deuxième PR du code de [[D-515]] §6.2, file A, derrière
`WN_ENABLE_DECLARATION_SUICIDE_CAB`, éteint. Chemin clinique ; aucune
migration. Drapeau éteint, rien ne change : ni lecture, ni constat, ni règle
candidate sur un instrument du cabinet.

- **Table `SAF-QUEST-02`** (`lib/clinical/safetyQuestionnaireCabinetV1.ts`), à
  côté de `SAF-QUEST-01`, qui reste identique à l'octet. Elle ne porte que des
  codes : son SHA couvre le mécanisme ([[D-515]] §1, §2, §7), la conduite
  `adressage` recopiée, et les textes fixes, rangés à part
  (`safetyQuestionnaireCabinetTextes.ts`) : la mention « écrit par le
  praticien », les limitations « réponse illisible » et « désignation
  inconnue », et deux limitations reprises de `SAF-QUEST-01`. **Livrée non
  signée** : aucun constat, la règle jointe en `candidate` sur les seuls
  dossiers qu'une réponse ou une limitation concerne. Sa signature suit sur
  sa surface de relecture (PR 4).
- **Producteur** (`safetyFindings.ts`) : sur la seule question désignée d'une
  copie « oui », toute valeur autre que la valeur « non » copiée fait un
  constat de rang `adressage`, hors options comprises — y compris une option
  que la copie a écartée hors int4 (réponse 20261114-1112-a). Une réponse
  illisible ou une désignation inconnue donne une limitation, sans constat
  ni blocage. `SAF-QUEST-01` ne reçoit que les réponses du catalogue, et
  `SAF-QUEST-02` vient après elle : l'empreinte des cartes d'un dossier sans
  instrument du cabinet lu ne bouge pas.
- **Lecteurs** : la carte du Fil, le moteur (vérificateur et rejeu du
  cockpit) et la lettre joignent la copie par `joindreDesignationsCabinet`,
  seule lectrice de la copie en base. La lettre ne cite une réponse du cabinet
  que si `SAF-QUEST-02` est signée : depuis la copie, marquée (§), sous la
  mention, avec sa version d'ancrage propre
  (`safety-signals-questionnaire-cabinet-v1`). Une lettre sans réponse du
  cabinet ne change pas d'un caractère (empreintes figées sur `main`).
- **Bancs** : `safetyQuestionnaireCabinet.guard.test.ts` (verrou, §1, §2, §7,
  A1, empreintes, jointure, lettre) ; le banc de la copie liste ses quatre
  fichiers et ne compte plus les commentaires en fin de ligne ; un banc sur
  base réelle (`designationsCabinet.pg.test.ts`, joué au CI) prouve l'objet
  `jsonb`, le CHECK de cohérence et la relecture.
