import type { BesoinDefinition, JalonMomentum, NiveauPreuve, SourceQuestionnaire, StrateCode } from './types';
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
export const VERSION_SCORE_EQUILIBRE = Q_ALI_01.scoring.maxTotal === 90 ? 'v11' : 'v10';

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

export const POIDS_STRATE: Record<StrateCode, number> = {
  CORPS: 0.6,
  ANCRAGE: 0.2,
  ESPRIT: 0.2,
};

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

// Fondations critiques (MON_EQUILIBRE_CONTEXTE.md §2) : sommeil effondré,
// carences objectivées, troubles digestifs/hyperexcitabilité, stress
// chronique, déséquilibre alimentaire — si l'une est effondrée, le score
// global est plafonné quel que soit le niveau des autres besoins/strates.
export const BESOINS_FONDATIONS_CRITIQUES = [1, 2, 4, 5, 9] as const;

// Calibrage v1 — seuil et plafond initiaux, à valider par le praticien et
// ajuster si besoin (bump de VERSION_SCORE_EQUILIBRE en cas de changement).
export const SEUIL_EFFONDREMENT = 0.34;
export const PLAFOND_FONDATION_CRITIQUE = 50;

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
  1: [{ idQuestionnaire: 'Q_ALI_01', max: Q_ALI_01.scoring.maxTotal, inverser: false }],
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
  // et REPOS. Le repos se partage entre le questionnaire validé et l'agenda
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
  ],
  6: [],
  7: [],
  8: [{ idQuestionnaire: 'Q_NEU_11', sousScore: 'D', max: 21, inverser: true }],
  9: [
    { idQuestionnaire: 'Q_STR_01', max: 42, inverser: true },
    { idQuestionnaire: 'Q_STR_02', max: 50, inverser: true },
    { idQuestionnaire: 'Q_STR_03', max: 55, inverser: true },
  ],
  10: [
    { idQuestionnaire: 'Q_INF_03', sousScore: 'DA', max: 40, inverser: true },
    { idQuestionnaire: 'Q_INF_03', sousScore: 'NA', max: 40, inverser: true },
    { idQuestionnaire: 'Q_INF_03', sousScore: 'SE', max: 40, inverser: true },
  ],
  11: [],
  12: [{ idQuestionnaire: 'Q_INF_03', sousScore: 'ME', max: 40, inverser: true }],
};

// Jalons glissants (feat/e2-momentum-tracking) : nombre de jours depuis la
// date T0 réelle du patient, pas des dates calendaires fixes — un retard
// patient ne doit pas invalider le jalon suivant.
export const JOURS_JALON: Record<JalonMomentum, number> = { T0: 0, J21: 21, J42: 42, J90: 90 };

// Tolérance de départ (±8 jours), explicitement ajustable selon retour
// d'expérience patient réel — cf. docs/claude/E2_EVIDENCE_LEVELS_MOMENTUM_CONTEXTE.md §3.
export const TOLERANCE_JOURS_JALON = 8;

// Niveau de preuve par source (feat/e2-evidence-levels, cf.
// docs/claude/E2_EVIDENCE_LEVELS_MOMENTUM_CONTEXTE.md) : A = questionnaire
// clinique internationalement validé (PSQI, HAD, PSS-10, Pichot...), B =
// référentiel neuronutrition SIIN/DNST (pas de validation psychométrique
// tierce indépendante, mais référentiel clinique interne établi), C =
// biologie fonctionnelle (aucune source actuelle n'est en C — biomarqueurs
// hors périmètre v1), D = hypothèse WellNeuro.
//
// PROPOSITION INITIALE, PAS ENCORE VALIDÉE CLINIQUEMENT : ce mapping a été
// dérivé du statut de validation connu de chaque échelle, pas confirmé par
// un praticien. À faire valider avant tout affichage en production —
// contrairement au reste de ce fichier, ceci n'est pas encore une décision
// actée au même titre que POIDS_STRATE ou BESOIN_SOURCES.
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
  Q_NEU_11: 'A',
  Q_STR_01: 'B',
  Q_STR_02: 'A',
  Q_STR_03: 'B',
  Q_INF_03: 'B',
};

// Ordre du plus faible au plus fort — sert à déterminer "le niveau le plus
// faible parmi les sources d'un besoin" (règle actée : jamais de dilution
// d'une source faible par une source plus robuste sur le même besoin).
export const RANG_PREUVE: Record<NiveauPreuve, number> = { D: 0, C: 1, B: 2, A: 3 };
