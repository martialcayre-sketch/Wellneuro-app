### P0 métrologique — le besoin 2 n'est plus mesuré par la fatigue (2026-07-27)

**Changement de logique clinique**, demandé explicitement après l'audit de la
chaîne alimentaire (`docs/claude/propositions/2026-07-26-audit-accompagnement-alimentaire/`).
`VERSION_SCORE_EQUILIBRE` passe de **v3 à v4**.

**Le défaut.** Le besoin 2 « Micronutriments essentiels » était alimenté par
`Q_SOM_06`, l'échelle de fatigue de Pichot (8 items : « Je manque d'énergie »,
« J'ai les bras ou les jambes lourdes »…). Le besoin 2 figurant dans
`BESOINS_FONDATIONS_CRITIQUES`, une couverture sous `SEUIL_EFFONDREMENT`
plafonnait le score global à 50 — un patient très fatigué se voyait donc
désigner « Micronutriments essentiels » comme fondation effondrée, et son
*Mon équilibre* entier plafonné, **sans qu'aucun micronutriment ait été
mesuré**. La fatigue est un motif d'explorer le fer, la B12, les folates ou la
vitamine D ; elle n'en est pas la mesure.

**Le correctif.** `BESOIN_SOURCES[2]` devient vide : le besoin 2 rejoint les
besoins 3, 6, 7 et 11 parmi les non évaluables — couverture `null`, **jamais 0**
— jusqu'à ce qu'une source pertinente existe. `Q_SOM_06` sort aussi de
`NIVEAU_PREUVE_PAR_SOURCE`, où sa clé serait devenue orpheline, et son champ
`sourceMonEquilibre` passe à `false` au registre des instruments (le garde
`scripts/lib/verifier_registre_instruments.js` contrôle cet alignement dans les
deux sens ; le compte passe de 12 à 11 sources).

Le questionnaire de Pichot **reste servi et scoré** : seul son rôle de source de
*Mon équilibre* disparaît.

**Frontière de version — formulation corrigée.** La note portée jusqu'ici
(« la comparaison reprend au premier couple v4 ») était **inexacte**, et ce lot
la rectifie plutôt que de la reconduire. Ce que le code fait réellement : seule
l'**étiquette** `versionScore` est figée à la confirmation d'un épisode ; les
**valeurs** sont recalculées à chaque lecture avec le `BESOIN_SOURCES` courant.
Deux conséquences en découlent — un épisode étiqueté v3 affichera des valeurs
calculées en v4, et `resoudreComparaison` refuse dès que deux étiquettes
coexistent, sur l'ensemble des cycles du patient et sans fenêtre : un seul
cycle v3 subsistant bloquerait la comparaison indéfiniment, sans reprise
automatique. Figer la valeur plutôt que l'étiquette est une décision
d'architecture ouverte, posée au praticien — elle dépasse ce lot.

**Effet réel mesuré en production (2026-07-27, lecture seule).** Sur 8 patients
ayant des réponses exploitables, 1 a répondu au Pichot — et il a répondu à
d'autres questionnaires : **aucun patient ne perd son indice global**. La table
`assessment_episodes` est **vide** : aucun cycle v3 n'existe, donc ni blocage de
comparaison ni masquage du repère de cabinet à déplorer. Ces deux régressions
seraient réelles sur une base peuplée ; elles sont ici sans objet, et c'est la
lecture qui l'établit, pas une supposition.

**Fixtures de test.** Cinq fichiers utilisaient le Pichot comme unique
questionnaire producteur de score ; ils basculent sur le PSS-10 (`Q_STR_02`,
source vivante du besoin 9). Deux assertions de `clinicalSnapshot.test.ts` sont
resserrées en conséquence — la réserve d'adaptation étant adossée au besoin 9,
elle revendique désormais légitimement la réponse comme source.

**Documentation.** `GUIDE_12_BESOINS_NEURONUTRITION.md` §2 listait l'échelle de
Pichot en variable d'entrée du besoin 2 ; `equilibre/constants.ts` désignant ce
guide comme la justification clinique de chaque source, il aurait continué seul
à expliquer *pourquoi* un mapping qui n'existe plus. Corrigé.

**Invariants ancrés.** Le correctif reposait sur un raisonnement affirmé en
commentaire — « une couverture `null` n'est pas un zéro ». Trois tests le
rendent exécutable (`score.test.ts`) : une fondation critique sans source ne
déclenche jamais le plafond ; le besoin 2 ne le déclenche plus quel que soit le
Pichot ; répondre au seul Pichot ne produit plus d'indice global. Deux autres
(`evidence.test.ts`) gardent la cohérence `NIVEAU_PREUVE_PAR_SOURCE` ↔
`BESOIN_SOURCES` dans les deux sens, propriété jusqu'ici revendiquée sans garde.

**Validations** : T1 vert ; **suite complète verte** ; `scoring-check` vert
(64 instruments, 11 sources Mon Équilibre) ; anti-secrets vert ; revue
adversariale indépendante (`wn-reviewer`) — NO-GO initial sur quatre points,
tous traités, dont le bloquant levé par la lecture de production ci-dessus.
Aucune migration, aucun seuil (`SEUIL_EFFONDREMENT`,
`PLAFOND_FONDATION_CRITIQUE`) modifié.
