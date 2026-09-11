### Drapeaux — la table dit enfin la voie patient, et un banc l'y oblige

`docs/FEATURE_FLAGS.md` § B affirme que l'état de production des drapeaux qui
commandent la voie patient **se lit là, daté**, et qu'une activation non
consignée « rend illisible tout classement de constat portant sur le portail ».
Le 2026-09-11, neuf variables lues par `web/src` n'y figuraient nulle part —
dont les **quatre qui commandent toute la voie Alliance**, et les quatre étaient
**posées en production**.

**Ce n'est pas un oubli d'écriture, c'est un oubli d'endroit.** L'état de
chacune était bel et bien écrit : `WN_COMPREHENSION` dans `D-092`,
`WN_DOSSIER_DEUX_VOIX` dans `D-110`, `WN_CE_QUI_COMPTE` dans `D-112`,
`WN_OBJECTIF_PROPOSE` dans `D-154` — à quatre dates différentes, dans le
registre des décisions, c'est-à-dire partout sauf là où le document dit qu'on
vient le chercher. Lire la référence, en septembre, c'était croire que la voie
patient tenait en trois portes d'entrée.

**Relecture intégrale de la production** (`scalingo --app wellneuro env`,
`WN_DEPLOY_ENV=production`) : les sept drapeaux du § B sont à `true` — la voie
patient est **entièrement ouverte** —, et `WN_OBJECTIF_PROPOSE_PATIENTS` étant
absent, le périmètre de la machine qui propose est **tous les dossiers**. Le
§ B se lit maintenant en deux tables : **B.1, les portes d'entrée** (qui entre)
et **B.2, les surfaces** (ce qu'il trouve une fois entré), chacune avec ce que
son drapeau garde exactement — et pour `WN_COMPREHENSION`, le geste le moins
évident des trois : la **publication** côté praticien, dont la fermeture évite
un stock de synthèses atteignant le patient d'un seul coup le jour de
l'allumage.

**`drapeauxDocumentes.guard.test.ts` — deuxième application de `D-064`.** Le
banc né de `D-064` garde la **justesse** des lignes du document ; il ne pouvait
rien contre une ligne **absente**. Celui-ci exige qu'une variable lue par
`web/src` soit nommée quelque part dans la référence. Il ne juge aucune valeur,
ne lit aucune production et n'exige aucune date : poser un drapeau reste un
geste d'exploitation, jamais le verdict d'un test. Décrire reste libre ; ouvrir
une porte en silence, non.

**Il ne garde qu'un sens, délibérément.** L'autre — « toute variable citée est
lue par le code » — échouerait sur des entrées légitimes :
`WN_PORTAIL_TOKEN_TTL_JOURS` est morte depuis que #397 a retiré le jeton du
portail et reste pour mémoire, `WN_GOOGLE_PATIENT_CLIENT_ID` n'apparaît sous
`web/src` que dans un banc. Le garder imposerait d'entretenir une liste
d'exceptions, soit un second document à tenir à jour — le défaut même qu'on
répare. Les deux cas sont donc nommés dans le § E plutôt que tus.

Aussi documentés : `WN_AGENDA_ALI` (§ A, allumé en production depuis le
2026-08-05) et `WN_ALI_01_SIIN57`, **seul drapeau de forme du dépôt** — il
n'ouvre rien, il substitue la forme longue de `Q_ALI_01` à la courte, et il est
posé en production. Le bloc « tout allumer pour le dev local » gagne les quatre
surfaces : sans elles, le portail local ne rend pas un écran vide, il rend
un 404.
