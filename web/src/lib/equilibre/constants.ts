import type { BesoinDefinition, JalonMesure, NiveauPreuve, SourceQuestionnaire } from './types';
// Le maximum du besoin 1 est DÉRIVÉ de la forme réellement servie, jamais
// recopié : un `max` littéral divergeant du barème est silencieux (aucun garde
// ne les compare), et il sature ou effondre une fondation critique sans erreur.
import { Q_ALI_01 } from '../questionnaires/alimentaire';

// Cf. docs/claude/MON_EQUILIBRE_CONTEXTE.md — méthodologie actée pour
// l'indicateur "Mon équilibre" (patient) / "Cartographie neuro-fonctionnelle"
// (praticien). Un changement de valeur ici (poids, seuils, mapping) doit
// s'accompagner d'un bump de VERSION_SCORE_EQUILIBRE.
//
// v2 → v3 (agenda du sommeil) : ajout de Q_SOM_09 comme 3e source du besoin 5.
// Conséquence actée (doctrine « versionScore différents jamais soustraits ») :
// un AssessmentEpisode figé en v2 ne se compare pas à un épisode v3 — la
// comparaison de jalons momentum reprend au premier couple d'épisodes v3.
//
// v3 → v4 (P0 métrologique, audit du 2026-07-26) : RETRAIT de Q_SOM_06 comme
// source du besoin 2. L'échelle de fatigue de Pichot mesure la fatigue, pas la
// couverture micronutritionnelle — et le besoin 2 étant une fondation
// critique, une fatigue élevée plafonnait le score global à 50 en désignant
// « Micronutriments essentiels » comme effondrés, sans qu'aucun micronutriment
// n'ait été mesuré. La fatigue est un motif d'EXPLORER le fer, la B12, les
// folates ou la vitamine D ; elle n'en est pas la mesure. Le besoin 2 rejoint
// donc les besoins non évaluables (couverture null, jamais 0) jusqu'à ce
// qu'une source pertinente existe. Voir
// docs/claude/propositions/2026-07-26-audit-accompagnement-alimentaire/.
//
// v4 → v5 (lot 1, audit de la chaîne trajectoire du 2026-07-27, constat F1) :
// RÈGLE DE NOUVEAUTÉ sur l'historique. Une lecture n'est émise à un jalon que
// si une réponse nouvelle est arrivée depuis la dernière lecture émise
// (equilibre/depuisPrisma.ts). Aucun poids, seuil ni mapping ne change ici, et
// aucune valeur calculée à une date donnée ne bouge — mais l'ENSEMBLE des
// lectures d'un cycle change : un cycle antérieur pouvait porter J21/J42/J90
// « mesurés » à la valeur de T0 pour un patient qui n'avait plus rien rempli,
// avec un momentum « stable (écart 0) ». Comparer un tel cycle à un cycle
// postérieur reviendrait à comparer des jalons fabriqués à des jalons réels :
// c'est précisément ce que l'étiquette de version existe pour empêcher.
//
// v5 ne couvre QUE ce changement. Le retrait des conclusions de Q_ALI_01 et sa
// sortie des fondations critiques modifient le mapping et la définition du
// score : ils appellent leur propre bump, pas un partage de cette étiquette.
// Une version qui recouvre deux définitions différentes rend A8-3 inopérante —
// le comparateur ne saurait plus laquelle il compare.
//
// FRONTIÈRE — ce que le code fait réellement, la formulation portée jusqu'ici
// par la note v2 → v3 étant inexacte. Seule l'ÉTIQUETTE `versionScore` est
// figée à la confirmation d'un épisode (protocol/versioning.ts) ; les VALEURS
// affichées sont recalculées à chaque lecture avec le mapping besoin → sources
// courant (protocol/trajectoire.ts, `construireHistoriqueEquilibre`). Il en
// découle deux conséquences, à ne pas confondre avec « la comparaison reprend » :
//   — un épisode étiqueté v3 affichera des valeurs calculées en v4 ;
//   — `resoudreComparaison` refuse dès que DEUX étiquettes coexistent
//     (trajectoire.ts, `versions.size > 1`), sur l'ensemble des cycles du
//     patient et sans fenêtre : un seul cycle v3 subsistant bloque donc la
//     comparaison indéfiniment, il n'y a pas de reprise automatique.
// Figer la valeur plutôt que l'étiquette est une décision d'architecture
// ouverte, posée au praticien — elle dépasse ce lot.
//
// v5 → v6 (Enquête alimentaire SIIN, forme complète) : le besoin 1 passe d'un
// dépistage à 14 items coté /42 à l'instrument source, 57 items cotés /90. Le
// barème change, donc l'étiquette change — et elle ne PARTAGE PAS v5, comme la
// note ci-dessus l'exige déjà : v5 ne couvre que la règle de nouveauté.
//
// La version SUIT LE DRAPEAU, elle n'est pas figée au merge. Tant que
// `WN_ALI_01_SIIN57` est éteint, c'est bien la forme courte qui est servie et
// calculée : étiqueter ces épisodes « v6 » les dirait produits sous un barème
// qui n'a pas encore été appliqué. Une étiquette de version qui ment est pire
// qu'une étiquette absente — c'est toute la leçon de la frontière ci-dessus.
//
// v6 → v7 (besoin 3 « Rythme alimentaire ») : le besoin 3, non évaluable depuis
// l'origine, gagne une source — le sous-score `RYTHME_CHRONO` de l'Enquête SIIN
// (SIIN52/53/54/55, 7 points), qui couvre exactement les deux variables
// d'entrée que le guide des 12 besoins lui donne (ratio protéines/glucides des
// repas, durée du jeûne nocturne). Le mapping change, donc l'étiquette change.
//
// v6 ne peut pas être partagée, pour la raison déjà écrite deux fois plus haut :
// elle désigne le barème /90 SANS le besoin 3, et une étiquette qui recouvre
// deux définitions rend le comparateur inopérant. v6 n'a jamais été écrite en
// base — vérifié le 2026-07-28, `assessment_episodes` est vide — le bump ne
// gèle donc aucune comparaison existante.
//
// Comme v6, v7 SUIT LE DRAPEAU : la forme courte ne déclare pas ce sous-score,
// le besoin 3 reste non mesuré tant que `WN_ALI_01_SIIN57` est éteint, et
// l'étiquette reste v5.
//
// NB rédaction : ne jamais écrire le nom de la table de mapping en toutes
// lettres AU-DESSUS de sa déclaration. Le garde du registre l'extrait par
// `indexOf` (scripts/lib/verifier_registre_instruments.js) et tomberait sur le
// commentaire au lieu de la table — il refuse alors de valider plutôt que de
// contrôler dans le vide.
//
// v7 → v8 / v9 (2026-07-28, regroupement du besoin 5) : le besoin 5 passe d'une
// moyenne simple de ses trois sources à deux groupes à parts égales (mouvement /
// repos). Un patient SANS agenda clôturé garde exactement son score — le repos
// se réduit alors au PSQI, et la moyenne des deux groupes redonne la moyenne
// simple d'avant. Seuls les patients dont l'agenda est clôturé changent : le
// sommeil y pesait 2/3 du besoin, il en pèse désormais la moitié.
//
// Ce changement de mapping s'applique dans LES DEUX positions du drapeau
// alimentaire, il fait donc avancer chaque branche d'un cran : la branche forme
// courte v5 → v8, la branche SIIN /90 + besoin 3 v7 → v9. On saute v6, réservée
// par la note ci-dessus à un intermédiaire jamais servi. La règle de non-partage
// d'étiquette impose ce bump : au merge, ce regroupement et la « règle de
// nouveauté » de main revendiquaient tous deux v5 — deux définitions sous une
// même étiquette, exactement ce que ce fichier interdit. Doctrine inchangée : un
// épisode figé sous l'ancienne étiquette ne se compare pas aux nouvelles.
// v8/v9 → v10/v11 (garde de recueil partiel du PSQI, 2026-08-04) : `Q_SOM_01`
// cesse d'alimenter le besoin 5 quand sa passation est incomplète. Aucun poids
// ni seuil ne bouge — c'est la DISPONIBILITÉ d'une source qui change, et le
// fichier range explicitement le mapping parmi ce qui impose un bump.
//
// LA DIRECTION DE L'EFFET, parce qu'elle n'est pas celle qu'on croit. `Q_SOM_01`
// est une source `inverser: true` : retirer une mesure BASSE y est
// RASSURANT, pas protecteur. Un PSQI à 14/21 renseigné à 17 items sur 18 donnait
// une couverture repos de 1 − 14/21 = 0,333, sous le seuil d'effondrement 0,34
// du besoin 5 — donc fondation critique, donc score global plafonné à 50. La
// garde le rend « non mesuré » : plus de fondation critique, plus de plafond, et
// le score global REMONTE. Relevé en revue adversariale ; c'est précisément
// pourquoi l'étiquette ne peut pas rester la même.
//
// Le précédent est dans ce fichier : v3 → v4 retirait `Q_SOM_06` du besoin 2
// pour ce même plafond. Doctrine inchangée — un épisode figé en v8/v9 ne se
// compare pas à un épisode v10/v11.
//
// CE QUE LE BUMP COÛTE, et c'est la seule conséquence VISIBLE par le praticien :
// `versionScore` est stocké et gouverne les comparaisons (`trajectoire-partagee`,
// `protocol/cabinet`). Le bump COUPE donc l'historique de momentum de tous les
// patients — un T0 figé en v9 ne se soustrait plus à un T1 v11 —, et l'agrégat
// cabinet retombe à `nTotal = 0`, donc masqué, jusqu'à ce que deux cycles v11
// existent. Coût assumé, déjà payé à v3 → v4 ; il est écrit ici pour qu'il ne se
// redécouvre pas dans un tableau de bord vide.
//
// ⚠ AMBIGUÏTÉ CRÉÉE, à qualifier désormais : le dépôt porte DEUX séries `v11`
// simultanées — la consigne de synthèse (`anthropic.ts`) et ce score. Un `v11` nu
// dans un log ou une conversation ne désigne plus rien. Même piège que le préfixe
// `R` des campagnes, décrit dans `CLAUDE.md`.
//
// v10/v11 → v12/v13 (garde de recueil partiel du TFD, 2026-08-04) : `Q_GAS_01`
// cesse d'alimenter le besoin 4 quand sa passation est incomplète. Même forme que
// le bump précédent — c'est la DISPONIBILITÉ d'une source qui change, aucun poids
// ni seuil ne bouge —, et `Q_GAS_01` est lui aussi une source `inverser: true`
// (`max: 93`).
//
// L'EFFET VA DANS LES DEUX SENS, et une première rédaction n'en écrivait qu'un.
// Relevé en revue adversariale ; c'est la seule chose que ce bloc doit dire sans
// se tromper.
//
//   · TFD partiel et BAS (le cas qui motive la garde) — cinq items sur
//     trente-et-un rendaient un total effondré, donc `1 − ratio` très HAUT :
//     « besoin bien couvert » établi sur ce que le patient n'a pas dit. La garde
//     le rend non mesuré, et la couverture BAISSE. C'est la correction.
//   · TFD partiel et DÉJÀ SÉVÈRE — au-delà de `total ≥ 62`, la couverture tombe
//     sous `SEUIL_EFFONDREMENT` (0,34) et le besoin 4 est une FONDATION CRITIQUE
//     (voir `BESOINS_FONDATIONS_CRITIQUES`), ce qui plafonne le score global à 50.
//     Le rendre non mesuré le sort aussi de cette liste : le plafond se lève et le
//     score global REMONTE. Trente items sur trente-et-un, tous au maximum,
//     tombent dans ce cas. Le seuil de 62 vaut **quand `Q_GAS_01` est la seule
//     source répondue du besoin 4** : `Q_INF_01` l'alimente aussi, et la moyenne
//     de groupe déplace alors le point de bascule. C'est le cas courant, pas le
//     cas général — l'incise vient de la revue adversariale.
//
// La seconde branche est le COÛT assumé de D-014, pas un effet secondaire : une
// bande ne se lit que sur l'instrument complet, y compris quand l'incomplet
// accusait déjà. Elle est du même ordre que la perte de `R-GAS-01` décrite dans
// `clinical/orientationRulesV1.ts`. Mesuré le 2026-08-04 avant de fermer le lot :
// la production ne porte que DEUX passations `Q_GAS_01`, toutes deux complètes
// (31/31) — aucun dossier vivant n'est dans l'une ou l'autre branche.
//
// La mécanique du bump est celle décrite plus haut et son coût est le même :
// historique de momentum coupé, agrégat cabinet masqué jusqu'à deux cycles v13.
//
// v12/v13 → v14/v15 (comptes de recueil de `group_majority`, 2026-08-13,
// [[D-055]] / LOT-08) : `Q_STR_01` cesse d'alimenter le besoin 9 quand sa
// passation est incomplète. Troisième occurrence de la même classe que les deux
// bumps ci-dessus — c'est la DISPONIBILITÉ d'une source qui change, aucun poids
// ni seuil ne bouge —, et `Q_STR_01` est lui aussi une source `inverser: true`
// (`max: 42`). Le bump est commandé depuis `questions.ts`, exactement comme
// pour le TFD : le moteur publie désormais `missing` à la racine, et
// `extraireValeurBrute` refuse la valeur d'un recueil partiel.
//
// L'EFFET VA DANS LES DEUX SENS, comme pour ses deux prédécesseurs :
//   · `Q_STR_01` partiel et BAS (le cas qui motive la garde) — trois items sur
//     vingt et un rendaient un total effondré, donc `1 − ratio` très HAUT :
//     « stress bien géré » établi sur ce que le patient n'a pas dit. La garde
//     le rend non mesuré, et la couverture BAISSE. C'est la correction.
//   · `Q_STR_01` partiel et DÉJÀ SÉVÈRE — au-delà de `total ≥ 28`, la
//     couverture tombe sous `SEUIL_EFFONDREMENT` (0,34) et le besoin 9 est une
//     FONDATION CRITIQUE : le score global était plafonné à 50. Le rendre non
//     mesuré le sort de cette liste : le plafond se lève et le score global
//     REMONTE. Le seuil de 28 vaut **quand `Q_STR_01` est la seule source
//     répondue du besoin 9** : `Q_STR_02` et `Q_STR_03` l'alimentent aussi, et
//     la moyenne déplace alors le point de bascule. (État du 2026-08-13 :
//     depuis [[D-548]] §2.5, le besoin 9 ne lit que la PSS-10 — `Q_STR_02` —
//     et `Q_STR_01` comme `Q_STR_03` ne l'alimentent plus.)
//
// Relevé en revue `wn-reviewer` du 2026-08-13 (B1) : une première rédaction du
// lot ne décrivait que la première branche et ne bumpait pas. Mesuré avant de
// fermer : la production ne porte qu'UNE passation `Q_STR_01`, sans
// `rawAnswers`, que `depuisPrisma` écarte déjà — le STOCK ne bouge pas, c'est
// le FLUX qui change de définition, et c'est lui que l'étiquette gouverne.
//
// GARDE DES SOUS-SCORES PARTIELS, SANS CHANGEMENT DE VERSION ([[D-329]] §1 et
// §4, 2026-10-19). Un sous-score servi n'alimente plus un besoin que si TOUS les
// items de son axe sont répondus (besoins 5, 8, 10, 12). C'est la même classe
// que les bumps v10 à v15 — la DISPONIBILITÉ d'une source change — et l'usage
// aurait voulu v16/v17. Le responsable a écarté ce changement le 2026-10-19,
// sur un fait que les bumps d'août ne rencontraient pas : la version entre dans
// l'empreinte de chaque carte de décision, que le portail REJOUE
// (`rejeuCarteDecision.ts`) ; une nouvelle étiquette aurait fait dériver toutes
// les cartes diffusées et éteint leurs écrans protocole. Or aucune passation
// exploitable en production, historique compris, n'a d'axe servi partiel : les
// valeurs, recalculées à chaque lecture, ne bougent pour aucun dossier. Seule
// une passation partielle FUTURE changera sa propre lecture — et sa carte
// dérivera alors pour une raison clinique réelle.
//
// Ne pas nommer ici la constante du mapping : le contrôle de certification
// l'extrait à sa PREMIÈRE occurrence dans ce fichier.
//
// v14/v15 → v16/v17 ([[D-438]], appliquée par [[D-474]], 2026-11-10) : le
// groupe `repos` du besoin 5 gagne deux sources, l'Epworth (`Q_SOM_02`, total
// 0-24) et la fatigue générale du MFI-20 (`Q_SOM_07`, sous-score `GEN`, 4-20),
// poids 1 chacune, niveau A. Le mapping change, donc l'étiquette change — les
// deux branches du drapeau avancent d'un cran, comme en v8/v9. Le PSQI pèse
// désormais 2/5 du repos avec ses quatre sources, 2/4 sans agenda (D-438 §2).
//
// Cette fois le bump N'EST PAS ÉCARTÉ, contrairement à D-329 : D-438 §5 le
// demande, parce que des valeurs changent pour tout patient qui a rempli
// l'Epworth ou un MFI-20 reconstruit. Le coût décrit plus haut est payé en
// connaissance de cause : toutes les cartes de décision diffusées dérivent, et
// leurs écrans protocole s'éteignent jusqu'à réapprobation par le praticien.
//
// Même lot, sans effet sur l'étiquette : les passations NON INTERPRÉTABLES
// (`scoring/passationsNonInterpretables.ts`) ne nourrissent plus le moteur
// (`depuisPrisma.ts`, `rawAnswersLisibles`) — sans quoi les MFI-20 d'avant la
// reconstruction, rescorés sur la nouvelle échelle, deviendraient une mesure.
// v16/v17 → v18/v19 ([[D-548]], première vague de J3-12f, 2026-11-23 ; UN SEUL
// changement pour les sections signées des besoins 1, 4, 5 et 9, la moyenne
// directe et la table des niveaux de preuve). Ce que la version couvre :
//   — le total est la MOYENNE DIRECTE, à parts égales, des couvertures des
//     besoins mesurés ([[D-547]]) : les parts 60/20/20 entre strates, le seuil
//     d'effondrement, le plafond du total et la liste des cinq fondations
//     critiques sont RETIRÉS ; aucun minimum de besoins mesurés ;
//   — besoin 1 : la source devient la mesure dérivée de l'enquête alimentaire,
//     forme complète, sans le sous-score du rythme ([[D-516]] §2.1, §5.1) ; le
//     double compte avec le besoin 3 disparaît ; sous la forme courte, aucune
//     source ([[D-516]] §6.2) ;
//   — besoin 9 : la PSS-10 seule, avec sa borne basse déclarée ([[D-541]] §5.1,
//     [[D-552]]) ; le SIIN stress et le Cungi sortent du calcul ;
//   — table des niveaux de preuve ([[D-424]] §4) : le niveau C est retiré.
// Les résultats déjà stockés ne sont JAMAIS réécrits : ils gardent leur étiquette
// et leurs champs de plafond, que les lecteurs tolèrent sans les produire.
//
// Comme v16/v17, l'étiquette SUIT LE DRAPEAU de la forme alimentaire : les deux
// branches avancent d'un cran, v16 → v18 (forme courte) et v17 → v19 (forme
// complète), comme en v8/v9 et v16/v17.
//
// v18/v19 → v20/v21 ([[D-565]], besoin 12, 2026-11-25 ; UN SEUL changement, celui
// du besoin 12 : [[D-548]] §4, amendée le 2026-11-25, ne donne une version qu'à un
// dossier signé qui change le calcul, une source ou une table). Ce que la
// version couvre :
//   — besoin 12 : la source devient la sous-échelle `RELATION_AUX_AUTRES` de
//     `Q_MOD_01` (niveau B, [[D-424]] §2 et §3) ; le sous-score `ME` de
//     `Q_INF_03` quitte le besoin, et l'axe sommeil et rythmes n'est pas
//     réintroduit (décision 4 c du 2026-10-18, appliquée) ;
//   — un dossier qui n'a que `Q_MOD_01` gagne le besoin 12 : c'est une mesure,
//     jamais un zéro (`DC-24`).
// Les sections signées des besoins 3, 6, 7, 8, 10 et 11 ([[D-564]], [[D-566]] à
// [[D-570]]) ne changent ni source, ni formule, ni table : aucune version.
// Les résultats déjà stockés ne sont JAMAIS réécrits : ils gardent leur étiquette.
//
// Comme v16/v17 et v18/v19, l'étiquette SUIT LE DRAPEAU de la forme alimentaire :
// v18 → v20 (forme courte) et v19 → v21 (forme complète).
export const VERSION_SCORE_EQUILIBRE = Q_ALI_01.scoring.maxTotal === 90 ? 'v21' : 'v20';

/**
 * Maximum du sous-score servi au besoin 3, DÉRIVÉ du barème de la forme servie.
 *
 * Même raison que le `max` du besoin 1 : un littéral (`7`) serait faux dans une
 * des deux positions du drapeau sans qu'aucun test tournant dans l'autre ne le
 * voie. Vaut 0 quand la forme servie ne déclare pas ce sous-score — la forme
 * courte — et c'est sans conséquence : le moteur n'émet alors aucune valeur,
 * `calculerCouvertureSource` rend `null` avant toute division.
 */
export const MAX_RYTHME_CHRONO = (() => {
  const scoring = Q_ALI_01.scoring as {
    bareme?: Array<{ id: string; points: number }>;
    sousScoresBesoins?: Array<{ id: string; items: string[] }>;
  };
  const declaration = (scoring.sousScoresBesoins ?? []).find(s => s.id === 'RYTHME_CHRONO');
  if (!declaration) return 0;
  const bareme = scoring.bareme ?? [];
  return declaration.items.reduce(
    (somme, id) => somme + (bareme.find(e => e.id === id)?.points ?? 0),
    0
  );
})();

/**
 * Maximum de la MESURE DÉRIVÉE de l'enquête alimentaire, au besoin 1 ([[D-516]]
 * §2.1) : la somme des points du barème sur tous les items SAUF ceux du sous-score
 * du rythme, qui restent au besoin 3. DÉRIVÉ du barème servi, jamais recopié :
 * le total maximal de la forme servie moins `MAX_RYTHME_CHRONO`.
 *
 * Vaut 0 quand la forme servie ne déclare pas ce sous-score — la forme courte :
 * le besoin 1 y est NON ÉVALUÉ ([[D-516]] §6.2), et `evaluerCouvertureSource`
 * refuse alors la source avant toute division (`forme_sans_sous_score`), au lieu
 * de rendre une couverture sur un barème que le dossier ne couvre pas.
 */
export const MAX_MESURE_DERIVEE_ALIMENTAIRE = MAX_RYTHME_CHRONO > 0 ? Q_ALI_01.scoring.maxTotal - MAX_RYTHME_CHRONO : 0;

// 12 besoins fondamentaux, docs/claude/GUIDE_12_BESOINS_NEURONUTRITION.md.
export const BESOINS: BesoinDefinition[] = [
  { id: 1, libellePatient: "L'équilibre de votre assiette", libellePraticien: 'Équilibre de l’assiette', pilier: 1, strate: 'CORPS' },
  { id: 2, libellePatient: 'Vos micronutriments essentiels', libellePraticien: 'Micronutriments essentiels', pilier: 1, strate: 'CORPS' },
  { id: 3, libellePatient: 'Votre rythme alimentaire', libellePraticien: 'Rythme alimentaire (chronobiologie)', pilier: 1, strate: 'CORPS' },
  { id: 4, libellePatient: 'Votre confort corporel', libellePraticien: 'Perception et sensations corporelles', pilier: 2, strate: 'CORPS' },
  { id: 5, libellePatient: 'Votre mouvement et votre repos', libellePraticien: 'Mouvement, fonctions corporelles et repos', pilier: 2, strate: 'CORPS' },
  { id: 6, libellePatient: 'Votre respiration', libellePraticien: 'Besoin de respirer (oxygénation)', pilier: 2, strate: 'CORPS' },
  { id: 7, libellePatient: 'Vos sensations favorables', libellePraticien: 'Sensations favorables (cinq sens)', pilier: 3, strate: 'ANCRAGE' },
  { id: 8, libellePatient: 'Vos sensations plaisantes', libellePraticien: 'Sensations plaisantes (anhédonie)', pilier: 3, strate: 'ANCRAGE' },
  { id: 9, libellePatient: 'Votre gestion du stress', libellePraticien: 'Sensations-émotions fondamentales (stress)', pilier: 3, strate: 'ANCRAGE' },
  { id: 10, libellePatient: 'Vos pensées', libellePraticien: 'Pensées fonctionnelles, positives et stables', pilier: 4, strate: 'ESPRIT' },
  { id: 11, libellePatient: 'Votre sens et vos valeurs', libellePraticien: 'Besoins de sens et de valeurs', pilier: 4, strate: 'ESPRIT' },
  { id: 12, libellePatient: 'Votre lien aux autres', libellePraticien: 'Besoins de reliance', pilier: 4, strate: 'ESPRIT' },
];

// PLUS DE FONDATIONS CRITIQUES NI DE PLAFOND ([[D-547]], [[D-548]], v18/v19).
// Le seuil d'effondrement (0,34), le plafond du total (50) et la liste des cinq
// besoins qui les déclenchaient, validés « tels quels » en 2026-08 ([[D-106]]
// décision 3) sans qu'aucun n'ait de source, sont retirés avec les parts
// 60/20/20 entre strates. Le total est la moyenne directe, à parts égales, des
// besoins mesurés : l'égalité entre besoins est une CONVENTION DE MODÈLE déclarée
// ([[D-547]] §2, `DC-21`), et aucune règle du cabinet ne fonde une hiérarchie
// entre les douze besoins. La contrepartie — un besoin très bas peut être
// compensé dans le total par des besoins élevés — est assumée par le responsable
// ([[D-547]] §3) : la lecture besoin par besoin est essentielle, le total reste
// un repère de suivi sans interprétation clinique.

// Mapping besoin → questionnaire(s) existants (web/src/lib/questions.ts).
// Besoins 2, 6, 7, 11 : aucun questionnaire pertinent disponible dans le
// catalogue actuel — non évaluables (retournent une couverture null), plutôt
// que d'inventer une source. Le besoin 2 en particulier ne peut PAS l'être par
// un questionnaire : le guide lui donne des biomarqueurs pour seules variables
// d'entrée (ferritine, zinc, magnésium, iode, sélénium, vitamine D, B9, B12).
// Le besoin 3 a quitté cette liste le 2026-07-28 ; un test la fige désormais,
// pour qu'un branchement futur ne s'y fasse pas en silence. Voir docs/claude/GUIDE_12_BESOINS_NEURONUTRITION.md
// pour la justification clinique de chaque source retenue.
//
// Toute entrée ajoutée ou retirée ici doit être répercutée sur le champ
// `sourceMonEquilibre` de docs/claude/corpus/instrument_registry.json : le
// garde scripts/lib/verifier_registre_instruments.js contrôle l'alignement
// dans les deux sens et fait échouer `scoring-check` (T1) sinon.
export const BESOIN_SOURCES: Record<number, SourceQuestionnaire[]> = {
  // Besoin 1 « Équilibre de l'assiette » : la MESURE DÉRIVÉE de l'enquête
  // alimentaire, forme complète — le total de la forme servie moins le sous-score
  // du rythme, qui reste au besoin 3 ([[D-516]] §2.1, [[D-548]] §2.2). Aucun poids
  // de dimension, aucune tranche : un test fige qu'aucune règle ne la lit. Le
  // maximum est DÉRIVÉ (`MAX_MESURE_DERIVEE_ALIMENTAIRE`), et vaut 0 sous la forme
  // courte : aucune source, besoin non évalué ([[D-516]] §6.2).
  1: [{ idQuestionnaire: 'Q_ALI_01', sansSousScore: 'RYTHME_CHRONO', max: MAX_MESURE_DERIVEE_ALIMENTAIRE, inverser: false }],
  // 2 : voir la note v3 → v4 en tête de fichier — Q_SOM_06 (fatigue de Pichot)
  // retiré, la fatigue ne mesurant pas la couverture micronutritionnelle.
  2: [],
  // Besoin 3 « Rythme alimentaire (chronobiologie) ». Sous-score dédié, DISTINCT
  // de la catégorie d'affichage `RYTHME_ALIMENTAIRE` (6 items, /10) : il ne
  // porte que les 4 items correspondant aux variables d'entrée que le guide
  // nomme. `inverser: false` — les points sont acquis quand le repère est
  // atteint, plus haut vaut mieux.
  3: [{ idQuestionnaire: 'Q_ALI_01', sousScore: 'RYTHME_CHRONO', max: MAX_RYTHME_CHRONO, inverser: false }],
  4: [
    { idQuestionnaire: 'Q_GAS_01', max: 93, inverser: true },
    { idQuestionnaire: 'Q_INF_01', max: 96, inverser: true },
  ],
  // Besoin 5 « Bouger et se reposer » — deux groupes à parts égales, MOUVEMENT
  // et REPOS. Le repos se partage entre le questionnaire scoré et l'agenda
  // (2 / 1). Sans regroupement, la moyenne simple des trois sources donnait 2/3
  // du besoin au sommeil : l'ajout d'une troisième source sommeil en v3 avait
  // déplacé l'équilibre sans que ce soit une décision.
  //
  // Le groupe, et non des poids plats, parce qu'une pondération plate ne tient
  // pas sa promesse quand une source manque : avec 3/2/1 et un agenda absent —
  // le cas de presque tous les patients — le repos serait retombé à 2/5. Groupé,
  // il garde son demi, et le score d'un patient sans agenda est inchangé.
  5: [
    { idQuestionnaire: 'Q_MOD_01', sousScore: 'ACTIVITE_PHYSIQUE', max: 20, inverser: false, groupe: 'mouvement' },
    { idQuestionnaire: 'Q_SOM_01', max: 21, inverser: true, groupe: 'repos', poids: 2 },
    // Agenda du sommeil 21 nuits : indice longitudinal /100 (plus haut = mieux),
    // niveau de preuve D. Il COMPLÈTE le PSQI, il ne le remplace pas — d'où un
    // poids moindre dans le repos. Absent tant que l'agenda n'est pas clôturé,
    // ou quand la couverture ne permet pas l'indice (couverture null, jamais 0).
    { idQuestionnaire: 'Q_SOM_09', max: 100, inverser: false, groupe: 'repos', poids: 1 },
    // [[D-438]] §1 : somnolence diurne (Epworth, total 0-24, plus haut = pire)
    // et fatigue générale du MFI-20 (`GEN` seul, 4-20, plus haut = pire). Les
    // quatre autres sous-scores du MFI-20 n'entrent pas. `min: 4` : la fatigue
    // générale part de 4, et (20 − GEN) / 16 rend 1 à un patient sans fatigue.
    { idQuestionnaire: 'Q_SOM_02', max: 24, inverser: true, groupe: 'repos', poids: 1 },
    { idQuestionnaire: 'Q_SOM_07', sousScore: 'GEN', min: 4, max: 20, inverser: true, groupe: 'repos', poids: 1 },
  ],
  6: [],
  7: [],
  8: [{ idQuestionnaire: 'Q_NEU_11', sousScore: 'D', max: 21, inverser: true }],
  // Besoin 9 : la PSS-10 seule ([[D-541]] §5.1, signée le 2026-10-18). Le SIIN
  // stress (`Q_STR_01`) et le Cungi (`Q_STR_03`) sortent du calcul et restent lus
  // comme repères. `min: 10` : le total servi va de 10 à 50 (dix items cotés de
  // 1 à 5), et sans minimum déclaré un patient sans stress perçu n'atteindrait
  // jamais 1 ([[D-552]] §2, même forme que la fatigue du MFI-20 au besoin 5). La
  // plage (40) est la même dans les deux cotations de l'instrument : aucun total
  // stocké ne change, seule la lecture de la couverture est corrigée.
  9: [
    { idQuestionnaire: 'Q_STR_02', min: 10, max: 50, inverser: true },
  ],
  10: [
    { idQuestionnaire: 'Q_INF_03', sousScore: 'DA', max: 40, inverser: true },
    { idQuestionnaire: 'Q_INF_03', sousScore: 'NA', max: 40, inverser: true },
    { idQuestionnaire: 'Q_INF_03', sousScore: 'SE', max: 40, inverser: true },
  ],
  11: [],
  // Besoin 12 « Relation aux autres » : la sous-échelle `RELATION_AUX_AUTRES` du
  // questionnaire de mode de vie (`Q_MOD_01`), cible de la décision 4 c du
  // 2026-10-18, appliquée par [[D-565]] (acceptée le 2026-11-25). Le sous-score
  // `ME` de `Q_INF_03` quitte le besoin ; l'axe sommeil et rythmes n'est pas
  // réintroduit. Le sous-score va de 0 au maximum de son axe (cinq items cotés de
  // 0 à 4, `mode-de-vie.ts`) et plus haut vaut mieux : `inverser: false`, comme
  // l'activité physique du besoin 5. Niveau B de `Q_MOD_01`, valable pour les
  // besoins 5 et 12 ([[D-424]] §2 et §3, table ci-dessous).
  12: [{ idQuestionnaire: 'Q_MOD_01', sousScore: 'RELATION_AUX_AUTRES', max: 20, inverser: false }],
};

// Jalons glissants (feat/e2-momentum-tracking) : nombre de jours depuis
// L'ANCRE DU CYCLE, pas des dates calendaires fixes — un retard patient ne doit
// pas invalider le jalon suivant.
//
// LA TABLE PORTE LES SEULS JALONS DE MESURE DEPUIS `D-113`, et l'entrée `T0: 0`
// en est sortie. Ce n'est pas un changement de cadence — 21, 42 et 90 sont
// inchangés — c'est un changement de CLÉ : les ancres forment désormais une
// série ouverte (`T0`, `T1`, `T2`…), et un `Record` indexé par elles dégénère
// en SIGNATURE D'INDEX. `JOURS_JALON['T1']` aurait alors été typé `number` tout
// en valant `undefined` à l'exécution — donc un `NaN` silencieux dans un calcul
// de date. Mesuré, pas supposé : c'est ce que rendait le premier essai de
// `D-113`.
//
// L'offset d'une ancre ne vit plus dans une table : il est nul PAR DÉFINITION —
// une ancre est le jour 0 de son propre cycle. `joursDepuisAncre` le dit.
export const JOURS_JALON: Record<JalonMesure, number> = { J21: 21, J42: 42, J90: 90 };

/** Les jalons de mesure, dans l'ordre où ils s'ouvrent. */
export const ORDRE_JALONS_MESURE: readonly JalonMesure[] = ['J21', 'J42', 'J90'] as const;

// La règle « une ancre est le jour 0 de son propre cycle » N'EST PAS ICI, et
// c'est délibéré : ce fichier est une TABLE CLINIQUE. Lui faire importer le
// prédicat d'ancre le ferait dépendre du protocole, alors que la dépendance va
// dans l'autre sens — le protocole lit les cadences, jamais l'inverse. La règle
// vit dans `lib/protocol/fenetreJalon.ts`, qui lit les deux.

// Tolérance de départ (±8 jours), explicitement ajustable selon retour
// d'expérience patient réel — cf. docs/claude/E2_EVIDENCE_LEVELS_MOMENTUM_CONTEXTE.md §3.
export const TOLERANCE_JOURS_JALON = 8;

// Niveau de preuve par source — TABLE SIGNÉE ([[D-424]], appliquée par [[D-548]]
// §2.6). Trois niveaux : A = questionnaire clinique internationalement validé
// (PSQI, HAD, PSS-10, Epworth, MFI-20), B = référentiel neuronutrition SIIN ou
// DNST, sans validation psychométrique tierce, D = hypothèse WellNeuro. Le
// niveau C (« biologie fonctionnelle ») est RETIRÉ : il désignait un type de
// mesure, pas un niveau de preuve, et aucune source n'y était classée. Un
// niveau par clé (par questionnaire), le besoin portant celui de sa source la
// plus faible.
export const NIVEAU_PREUVE_PAR_SOURCE: Record<string, NiveauPreuve> = {
  Q_ALI_01: 'B',
  // Q_SOM_06 retiré en v4 avec sa source (besoin 2) : cette table n'est lue
  // que pour les entrées de BESOIN_SOURCES (equilibre/evidence.ts), une clé
  // orpheline affirmerait que Pichot reste une source de Mon équilibre.
  Q_GAS_01: 'B',
  Q_INF_01: 'B',
  Q_SOM_01: 'A',
  Q_MOD_01: 'B',
  // Agenda du sommeil. Le SUPPORT est un instrument standard (SIIN, Consensus
  // Sleep Diary) ; l'INDICE composite /100 qui alimente « Mon équilibre » ne
  // l'est pas — ni validation psychométrique tierce, ni cohorte de calibration,
  // ni seuil publié pour l'écart-type du milieu de sommeil. C'est la valeur
  // consommée ici, donc D (hypothèse WellNeuro) et non B : classer l'indice au
  // niveau de son support ferait passer une construction maison pour un
  // référentiel. Corrigé le 2026-07-27.
  Q_SOM_09: 'D',
  // [[D-438]] §1, niveau renvoyé par [[D-424]] §5. Les validations françaises
  // (Kaminska 2010, Gentile 2003) sont des limites de population et de
  // structure, pas un changement de niveau (D-438 §3).
  Q_SOM_02: 'A',
  Q_SOM_07: 'A',
  Q_NEU_11: 'A',
  // `Q_STR_01` et `Q_STR_03` quittent la table avec leur retrait du besoin 9
  // ([[D-548]] §2.6) : elle n'est lue que pour les entrées du mapping, et une clé
  // orpheline affirmerait qu'ils en restent des sources.
  Q_STR_02: 'A',
  Q_INF_03: 'B',
};

// Ordre du plus faible au plus fort — sert à déterminer "le niveau le plus
// faible parmi les sources d'un besoin" (règle actée : jamais de dilution
// d'une source faible par une source plus robuste sur le même besoin). `RANG_PREUVE`
// PERD C ([[D-424]] §4) : les valeurs de B et de A ne bougent pas, seul l'ordre
// compte.
export const RANG_PREUVE: Record<NiveauPreuve, number> = { D: 0, B: 2, A: 3 };
