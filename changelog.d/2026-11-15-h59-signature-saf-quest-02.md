### J2-base : `SAF-QUEST-02` est signée ; le drapeau reste éteint (H59, D-515, D-524, 2026-11-15)

Le 2026-11-15, le responsable a déclaré par écrit avoir relu et approuvé le mécanisme et les textes de la surface de relecture de `SAF-QUEST-02`, amendée par `D-524`. Il signe le périmètre SHA `67b9ef5436a97018c8db41f45c269b32db278e86db7cf45808f180cc30e88f1f`. **Cette signature n'autorise pas l'allumage** de `WN_ENABLE_DECLARATION_SUICIDE_CAB`.

- **La table** `safetyQuestionnaireCabinetV1.ts` porte désormais `validationExterne`, `dateValidation` (2026-11-15), `sourceReference` et le SHA en littéral. Elle est inscrite le jour même dans `shaPerimetreLitteral.guard.test.ts`, et `docs/FEATURE_FLAGS.md` est à jour (tableau des verrous et ligne du drapeau).
- **En production, rien ne change** tant que le drapeau reste éteint. Le seul chemin qui ne relit pas le drapeau est le courriel (`D-522`), et il exige une copie « oui ». Le constat par conteneur du 2026-11-15, en lecture seule et en agrégats, compte 361 assignations, dont 0 `CAB_`, 0 copie de déclaration et 0 copie de désignation, ainsi que 0 instrument du cabinet. Aucun constat, carte, message ni courriel `CAB_` ne peut donc naître.
- **L'E2E** `portail-cabinet-designation-suicide.spec.ts` est inversé. La désignation est servie. La valeur « non » et une autre question n'ouvrent rien, alors que la réponse la plus légère à la question désignée ouvre le message de `D-277` §1, sous la question puis au résumé.
- **Les bancs** qui éprouvaient l'état non signé le posent désormais explicitement : le sens inverse du verrou reste vérifié.
- **Le commentaire** de `alerteSecuritePraticien.ts` cite `D-522` (option C), au lieu d'une question ouverte.
- **Avant l'allumage**, il reste deux prérequis écrits (`D-524` §3) : le lot du déverrouillage, mergé et déployé, et le recomptage des `CAB_` à copie NULL.
