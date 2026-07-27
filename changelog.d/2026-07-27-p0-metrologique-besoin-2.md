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

**Frontière de version.** Doctrine « versionScore différents jamais
soustraits » : un `AssessmentEpisode` figé en v3 ne se compare pas à un épisode
v4. La comparaison de jalons momentum reprend au premier couple d'épisodes v4.

**Fixtures de test.** Cinq fichiers utilisaient le Pichot comme unique
questionnaire producteur de score ; ils basculent sur le PSS-10 (`Q_STR_02`,
source vivante du besoin 9). Deux assertions de `clinicalSnapshot.test.ts` sont
resserrées en conséquence — la réserve d'adaptation étant adossée au besoin 9,
elle revendique désormais légitimement la réponse comme source.

**Validations** : T1 vert ; **suite complète 280 fichiers / 2 127 tests verts** ;
`scoring-check` vert (64 instruments, 11 sources Mon Équilibre) ; anti-secrets
vert. Aucune migration, aucun seuil (`SEUIL_EFFONDREMENT`,
`PLAFOND_FONDATION_CRITIQUE`) modifié.
