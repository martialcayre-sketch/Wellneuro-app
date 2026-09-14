### Synthèse — la fenêtre de rappel d'un instrument ne s'énonce plus, parce qu'elle n'est transmise nulle part (2026-09-14)

**Une mesure de production, et un défaut qu'elle a trouvé là où on ne le cherchait
pas (`D-182`).** Sur 55 synthèses en base, 32 sous `synthese-v29`, sept portent une
période chiffrable. Six sont légitimes : la durée réelle d'un agenda de trois
semaines (`Q_SOM_09`), une reprise du déclaratif patient, des questions d'entretien.
**La septième ne l'est pas.** Une synthèse du 2026-09-12 écrit : « le DASS-21 mesure
des états des deux dernières semaines, le HAD une semaine ; les items ne sont pas
superposables. » Les deux durées sont fausses, et **inversées** par rapport à la
consigne que le patient a lue à l'écran — `Q_STR_04` dit « au cours de la dernière
semaine », `Q_NEU_11` « au cours de ces dernières semaines ».

**La conclusion était juste, la prémisse fabriquée.** DASS-21 et HAD ne sont
effectivement pas superposables, et refuser de les comparer était le bon geste. Mais
il est motivé par deux durées que rien n'a transmises, produites de mémoire
paramétrique et servies au praticien avec le statut d'un fait. C'est la forme exacte
que `DC-19` nomme — « bornes, cut-offs, pondérations, doses, **durées, fenêtres
temporelles** ».

**Le banc qui garde `DC-19` ne pouvait pas la voir, et le dire importe.**
`seuilsLitterauxMotives.guard.test.ts` balaie `src/lib` et exige de chaque seuil
littéral qu'il soit nommé ou motivé : il lit le CODE. Une fenêtre qui naît à la
génération n'est écrite dans aucun littéral. Le garde n'a pas failli — son périmètre
ne couvrait pas cette surface. Croire la doctrine tenue là où elle ne l'est pas est
le défaut que ce fragment referme autant que le premier.

**La cause est en amont, et elle est structurelle.** `buildUserMessage` projette
`idQuestionnaire`, `titre`, `date`, `passationCourante`, `scores`, `scorePrincipal`,
`interpretation`, `miniSynthese`. **Jamais `instructions`**, seul endroit du dépôt où
la période d'un instrument est écrite. Et les instruments d'un même dossier ne
partagent pas la leur : PSQI et PSS disent « le dernier mois », DASS-21 « la dernière
semaine », `Q_ALI_01` « vos habitudes habituelles », `Q_SOM_06` « votre état actuel ».
Le modèle n'avait aucun moyen de savoir — ni de savoir qu'il ne savait pas.

**Transmettre la fenêtre a été écarté, pour un motif de doctrine et non de coût.**
`instructions` est un texte long dont les trois quarts sont hors sujet ; en dériver un
champ propre ne serait pas une modification mais une **campagne d'écriture clinique
sur une centaine d'instruments**, chacune due à sa provenance sous `DC-19`. Au moins
une est indécidable : `Q_GAS_01` porte « 3 derniers mois » en première consultation
et « 3 dernières semaines » en suivi, et rien dans le prompt ne dit laquelle
s'applique. La voie reste ouverte si une mesure ultérieure montre que le modèle a
BESOIN de la fenêtre ; elle ne l'a pas montré.

**L'interdit est inconditionnel, et c'est ce qui le sépare du cas #408.** Le dépôt
documente une classe de défaut — « une interdiction dont le critère de déclenchement
n'arrive pas » — où une consigne prohibitive ne peut pas s'armer faute de donnée.
Celle-ci ne dépend d'aucune donnée : elle s'applique toujours.

**Ce qui reste autorisé est nommé, et la règle borne sa propre portée.** Une consigne
purement prohibitive laisse le modèle inventer une formulation de repli — le dépôt le
documente deux fois. La clause dit donc ce qui se dit toujours : que deux instruments
ne sont pas superposables, sans en donner une durée comme raison. Et elle exclut
explicitement la période que le PATIENT déclare, ou qu'on propose en question
d'entretien. Sans cette borne, la règle aurait éteint les six occurrences légitimes
que la mesure a trouvées — elle aurait censuré le récit patient pour corriger une
assertion d'instrument.

**Bump assumé et déclaré : `synthese-v29` → `synthese-v30`.** Une synthèse rédigée
sous v29 a pu dater la portée d'un instrument ; les deux versions ne se comparent donc
pas sur ce point. Les deux empreintes gardées sont reportées ensemble
(`promptAlimentaire.guard.test.ts`, `anthropic.corpusActif.guard.test.ts`), toutes
deux ayant rougi AVANT report, comme leur message l'exige.

**Ce que ce lot ne fait pas.** Il ne rend pas la fenêtre disponible au modèle : il ne
l'aide pas à mieux comparer deux instruments, il l'empêche de prétendre le faire. Et
il ne réécrit pas la synthèse du 2026-09-12, déjà persistée — `DC-24` : rien ne repasse
rétroactivement sous un statut plus favorable.

Nouveau banc `promptFenetreRappel.guard.test.ts` (7 cas) : la formule citable et son
unicité, l'OPÉRATEUR d'interdiction séparément du constat, le repli autorisé, la borne
de portée, la position au-dessus des sections topiques — une clause descendue sous
« Recommandation d'exploration déterministe » deviendrait discutable sans que son
texte bouge —, et la clause voisine sur les normes non transmises, qu'une réécriture
pourrait emporter en la remplaçant. Trois mutations appliquées, trois tuées.
