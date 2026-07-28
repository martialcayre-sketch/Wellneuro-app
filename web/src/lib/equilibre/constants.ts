import type { BesoinDefinition, JalonMomentum, NiveauPreuve, SourceQuestionnaire, StrateCode } from './types';

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
// Le lot 1 porte aussi le retrait des conclusions de Q_ALI_01 et sa sortie des
// fondations critiques (session distincte) — même version v5.
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
// NB rédaction : ne jamais écrire le nom de la table de mapping en toutes
// lettres AU-DESSUS de sa déclaration. Le garde du registre l'extrait par
// `indexOf` (scripts/lib/verifier_registre_instruments.js) et tomberait sur le
// commentaire au lieu de la table — il refuse alors de valider plutôt que de
// contrôler dans le vide.
export const VERSION_SCORE_EQUILIBRE = 'v5' as const;

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
// Besoins 2, 3, 6, 7, 11 : aucun questionnaire pertinent disponible dans le
// catalogue actuel — non évaluables (retournent une couverture null), plutôt
// que d'inventer une source. Voir docs/claude/GUIDE_12_BESOINS_NEURONUTRITION.md
// pour la justification clinique de chaque source retenue.
//
// Toute entrée ajoutée ou retirée ici doit être répercutée sur le champ
// `sourceMonEquilibre` de docs/claude/corpus/instrument_registry.json : le
// garde scripts/lib/verifier_registre_instruments.js contrôle l'alignement
// dans les deux sens et fait échouer `scoring-check` (T1) sinon.
export const BESOIN_SOURCES: Record<number, SourceQuestionnaire[]> = {
  1: [{ idQuestionnaire: 'Q_ALI_01', max: 42, inverser: false }],
  // 2 : voir la note v3 → v4 en tête de fichier — Q_SOM_06 (fatigue de Pichot)
  // retiré, la fatigue ne mesurant pas la couverture micronutritionnelle.
  2: [],
  3: [],
  4: [
    { idQuestionnaire: 'Q_GAS_01', max: 93, inverser: true },
    { idQuestionnaire: 'Q_INF_01', max: 96, inverser: true },
  ],
  5: [
    { idQuestionnaire: 'Q_SOM_01', max: 21, inverser: true },
    { idQuestionnaire: 'Q_MOD_01', sousScore: 'ACTIVITE_PHYSIQUE', max: 20, inverser: false },
    // Agenda du sommeil 21 nuits : score composite /100 (plus haut = mieux).
    // Complète le PSQI ; absent tant que l'agenda n'est pas clôturé (couverture
    // null, jamais 0). Barème /100 validé cliniquement le 2026-07-26.
    { idQuestionnaire: 'Q_SOM_09', max: 100, inverser: false },
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
  // Agenda du sommeil : outil standard francophone, mais l'indice composite /100
  // est une construction WellNeuro (pas de validation psychométrique tierce) → B.
  Q_SOM_09: 'B',
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
