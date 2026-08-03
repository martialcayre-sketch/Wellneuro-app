import type { DrapeauxAnamnese } from '@/lib/consultation/drapeauxAnamnese';
import type { FunctionalCategoryId, PackId } from '@/lib/questionnaires-functional';
import { sha256 } from './corpusSyntheseV1';

// Table de règles d'orientation NNPP2 (campagne certification corpus, lot 7,
// contrat v2 après intégration de l'audit externe).
//
// Chaque règle traduit une recommandation des fiches de synthèse NNPP2 :
// « si ces déclencheurs sont TOUS atteints, proposer ces explorations ». La
// table est du CODE VERSIONNÉ, relu en PR — jamais du runtime dynamique. Elle
// est régénérée par `tools/corpus/orientation/` (lot 9) à partir des seuls
// claims VALIDÉS par le praticien dans l'Atelier corpus (barrière D-003) :
// chaque règle épingle ses claims justificatifs (id + version immuable).
//
// Doctrine : le graphe clinique choisit les explorations POSSIBLES ; le
// praticien décide ; rien n'est jamais auto-assigné ; le LLM de synthèse ne
// reçoit que des candidats issus de cette table, jamais l'inverse.
//
// V1 : table VIDE, `validationExterne: false` — le moteur et la route existent
// mais ne recommandent rien tant que le praticien n'a pas validé les claims
// d'orientation puis signé la table compilée (même discipline que
// CORPUS_CLINIQUE_METADATA dans ./corpusSyntheseV1.ts).

export type OrientationZone =
  // Plage numérique inclusive sur le score brut (total ou sous-score).
  | { type: 'plage'; min: number; max: number }
  // Libellés d'interprétation servis par le catalogue (questions.ts).
  | { type: 'interpretation'; labels: string[] }
  // Couleurs de zone servies par le catalogue (jamais `success` : une zone
  // favorable ne déclenche pas d'exploration).
  //
  // `dark` EST une couleur défavorable, et la plus sévère de toutes : les
  // grilles l'emploient pour les bandes « Très sévère » (DASS-21, cf.
  // `questions.ts`). Elle manquait à cette union, si bien qu'une règle écrite
  // sur `['warning', 'danger']` aurait ignoré exactement les patients les plus
  // atteints — sans erreur ni trace. Une règle qui vise une zone défavorable
  // doit citer les TROIS couleurs.
  | { type: 'couleur'; couleurs: Array<'warning' | 'danger' | 'dark'> };

export type OrientationDeclencheur =
  | {
      type: 'zone';
      idQuestionnaire: string;
      /** Id ou libellé du sous-score visé ; absent = score global. */
      sousScore?: string;
      zone: OrientationZone;
    }
  | {
      type: 'comparaison';
      idQuestionnaire: string;
      sousScore?: string;
      operateur: '>=' | '<=' | '>' | '<' | '==';
      valeur: number;
    }
  // Drapeau d'anamnèse (`extraireDrapeauxAnamnese`, LOT-04) : ce que le patient
  // a DÉCLARÉ, par opposition à ce qu'un instrument a mesuré. Un déclencheur de
  // ce type est atteint si le drapeau porte au moins une des `valeurs` (champ
  // liste) ou lui est égal (champ radio).
  //
  // `champ` est typé par `keyof` : un nom de champ erroné ne compile pas. Les
  // `valeurs`, elles, sont des chaînes libres — c'est le banc anti-dérive de
  // `orientationRulesV1.test.ts` qui les confronte aux options réelles de
  // `ANAMNESE_SECTIONS`, car un libellé qui dérive ferait taire la règle sans
  // rien casser.
  //
  // JAMAIS `signauxAlerte` — et le motif n'est PAS le filtrage.
  //
  // Ce drapeau est bien filtré contre l'énuméré courant, mais tous les autres le
  // sont aussi, `attentes` et `antecedentsDomaines` compris, qui eux portent des
  // règles : « c'est filtré » ne distinguerait donc rien. La vraie raison est
  // qu'un signal d'alerte — « Idées noires ou suicidaires », « Douleur
  // thoracique » — appelle un ADRESSAGE, pas une exploration. Or cette table ne
  // sait produire qu'une cible (questionnaire ou pack) : y répondre par un
  // questionnaire ferait passer un signal d'alerte pour une chose que l'outil
  // traite. Mieux vaut ne rien produire que produire la mauvaise forme.
  //
  // Arbitrage praticien du 2026-08-03 : ces signaux DOIVENT être visibles à la
  // surface d'orientation, mais sans être présentés comme une exploration. La
  // surface manque — c'est un lot dédié, pas une règle. Question ouverte
  // consignée au SESSION_LOG. En attendant, `extraireVigilanceDeterministe`
  // (non filtré) reste le seul chemin par lequel ces signaux remontent.
  | {
      type: 'drapeau';
      champ: keyof DrapeauxAnamnese;
      valeurs: string[];
    };

type SuggestionBase = {
  /** 1 = plus prioritaire ; ordonne le pack hiérarchisé présenté au praticien. */
  priorite: number;
  /** Objectif clinique de l'exploration, tel que la fiche NNPP2 l'énonce. */
  objectif?: string;
};

// Union : au moins une cible (questionnaire et/ou pack). Le type l'impose —
// une suggestion sans cible serait ignorée en silence par le moteur.
export type OrientationSuggestion =
  | (SuggestionBase & { questionnaireId: string; packId?: PackId })
  | (SuggestionBase & { questionnaireId?: string; packId: PackId });

export type OrientationClaimRef = {
  claimId: string;
  versionClaim: string;
};

export type OrientationRule = {
  id: string;
  /** Seules les règles `publiee` sont évaluées par le moteur. */
  statut: 'brouillon' | 'publiee' | 'suspendue';
  /** ET logique : tous les déclencheurs doivent être atteints. */
  declencheurs: OrientationDeclencheur[];
  suggestions: OrientationSuggestion[];
  /** Besoins (1-12) que l'exploration vise à mesurer ou préciser. */
  needIds?: number[];
  categoriesCibles?: FunctionalCategoryId[];
  /**
   * Claims VALIDÉS à l'appui. Jamais vide : une règle sans claim ne serait pas
   * traçable jusqu'à sa source, et le moteur l'ignore (invariant de doctrine,
   * vérifié par `evaluerOrientation`).
   */
  justificationClaims: OrientationClaimRef[];
  niveau: 'socle' | 'approfondissement' | 'specialise';
};

// ─────────────────────────────────────────────────────────────────────────────
// Table V1 — six règles, chacune adossée à des claims VALIDE du corpus NNPP2.
//
// AUCUN SEUIL CLINIQUE N'EST INTRODUIT ICI. Les déclencheurs de score citent la
// bande d'interprétation que la grille certifiée produit déjà (`type:
// 'couleur'`), jamais un nombre choisi à cet endroit : décider qu'un PSS-10 est
// « élevé » appartient à la grille, pas à cette table. C'est aussi ce qui rend
// les règles insensibles à une recalibration de barème.
//
// Ce que la table NE fait PAS : elle ne s'auto-signe pas. `ORIENTATION_METADATA`
// reste non validée plus bas, donc la route demeure fail-closed et ne sert
// encore RIEN. La signature est un acte praticien, postérieur à la relecture
// clinique de ces six règles.
//
// TRAÇABILITÉ DES CLAIMS — ce que le CI vérifie, et ce qu'il ne peut pas.
// Le banc n'atteint que le FORMAT d'un `claimId` : les claims vivent dans
// `rag_corpus_claims` (base), qu'aucun test unitaire n'ouvre. Un identifiant
// inventé passerait donc le CI. Les neuf claims cités ci-dessous ont été
// vérifiés à la main le 2026-08-03 par lecture de la base — tous existent en
// `version_claim = 'v1.0'`, `statut = 'VALIDE'`, `prescriptif = true`,
// `active = true`. Refaire cette lecture à chaque ajout de règle, et avant la
// signature de la table : c'est le maillon que l'automatisation ne couvre pas.
//
// `pack_humeur_motivation_neurochimie` n'est cible d'aucune règle : le pack
// correspondant (`PACK_HUMEUR_NEURO`) est `actif: false` en base. La route ne
// charge que les packs actifs, et une exploration humeur passe donc ici par le
// questionnaire HAD (`Q_NEU_11`) directement. Le jour où le pack est réactivé,
// c'est une décision produit — pas une correction de code.
export const ORIENTATION_RULES_V1: OrientationRule[] = [
  {
    id: 'R-SOM-01',
    statut: 'publiee',
    // PSQI : interprétation globale (success / info / warning / danger).
    declencheurs: [
      { type: 'zone', idQuestionnaire: 'Q_SOM_01', zone: { type: 'couleur', couleurs: ['warning', 'danger', 'dark'] } },
    ],
    suggestions: [
      { questionnaireId: 'Q_NEU_11', priorite: 1, objectif: "Explorer la dimension de l'humeur, que la source désigne explicitement par le test HAD." },
      { questionnaireId: 'Q_STR_02', priorite: 2, objectif: 'Explorer la dimension du stress associée au trouble du sommeil.' },
    ],
    justificationClaims: [
      // « Le test de stress de Cungi est plus pertinent […] pour explorer la
      // dimension du stress dans les troubles du sommeil, tandis que le test HAD
      // suffit à explorer la dimension de l'humeur. » Le test de Cungi n'est pas
      // au catalogue : la dimension stress est portée par le PSS-10, seule
      // échelle de stress perçu disponible — substitution assumée, et c'est
      // pourquoi elle est en priorité 2 quand HAD, lui nommé par la source,
      // est en priorité 1.
      { claimId: 'WN-CL-0323-013', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0323-001', versionClaim: 'v1.0' },
    ],
    niveau: 'socle',
  },
  {
    id: 'R-STR-01',
    statut: 'publiee',
    declencheurs: [
      { type: 'zone', idQuestionnaire: 'Q_STR_02', zone: { type: 'couleur', couleurs: ['warning', 'danger', 'dark'] } },
    ],
    suggestions: [
      { questionnaireId: 'Q_STR_05', priorite: 1, objectif: "Ajouter l'évaluation d'un risque éventuel de burnout à l'intensité du stress chronique." },
    ],
    justificationClaims: [
      { claimId: 'WN-CL-0314-008', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0319-010', versionClaim: 'v1.0' },
      // « Les questionnaires de surinvestissement (BMS et/ou Karasek) doivent
      // être utilisés pour évaluer le risque de burnout. » → BMS-10 = Q_STR_05.
      { claimId: 'WN-CL-0228-009', versionClaim: 'v1.0' },
    ],
    niveau: 'approfondissement',
  },
  {
    id: 'R-STR-02',
    statut: 'publiee',
    // Déclaré ET mesuré : le facteur déclenchant seul ne suffit pas à engager un
    // pack entier. C'est l'ET logique du moteur qui l'impose.
    declencheurs: [
      { type: 'drapeau', champ: 'facteursDeclenchants', valeurs: ['Stress aigu / burn-out'] },
      { type: 'zone', idQuestionnaire: 'Q_STR_02', zone: { type: 'couleur', couleurs: ['warning', 'danger', 'dark'] } },
    ],
    suggestions: [
      { packId: 'pack_stress_chronique_burnout', priorite: 1, objectif: 'Engager la prise en charge globale du stress : bilan personnalisé, puis rééquilibrage et suivi.' },
    ],
    justificationClaims: [
      { claimId: 'WN-CL-0105-001', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0314-008', versionClaim: 'v1.0' },
    ],
    niveau: 'approfondissement',
  },
  {
    id: 'R-GAS-01',
    statut: 'publiee',
    // TFD SIIN : interprétation globale sur 93 (A / B / C).
    declencheurs: [
      { type: 'zone', idQuestionnaire: 'Q_GAS_01', zone: { type: 'couleur', couleurs: ['warning', 'danger', 'dark'] } },
    ],
    suggestions: [
      { packId: 'pack_digestif_intestin_cerveau', priorite: 1, objectif: 'Approfondir l\'axe intestin-cerveau quand le score de troubles fonctionnels intestinaux est élevé.' },
    ],
    justificationClaims: [
      { claimId: 'WN-CL-0287-009', versionClaim: 'v1.0' },
    ],
    niveau: 'approfondissement',
  },
  {
    id: 'R-ANA-01',
    statut: 'publiee',
    // Une seule case cochée, aucune mesure : cette règle propose donc un
    // INSTRUMENT, jamais un pack. C'est la même ligne que R-STR-02 tient plus
    // haut — « le facteur déclenchant seul ne suffit pas à engager un pack
    // entier » — et il n'y a pas de raison qu'une attente déclarée en fasse
    // davantage qu'un facteur déclenchant. Le PSQI mesuré pourra ensuite
    // déclencher R-SOM-01, qui, elle, s'appuie sur une mesure.
    declencheurs: [
      { type: 'drapeau', champ: 'attentes', valeurs: ['Améliorer le sommeil'] },
    ],
    suggestions: [
      { questionnaireId: 'Q_SOM_01', priorite: 1, objectif: "L'exploration du sommeil est systématique dans la démarche de neuronutrition." },
    ],
    justificationClaims: [
      { claimId: 'WN-CL-0323-001', versionClaim: 'v1.0' },
    ],
    niveau: 'socle',
  },
  {
    id: 'R-ANA-02',
    statut: 'publiee',
    declencheurs: [
      { type: 'drapeau', champ: 'antecedentsDomaines', valeurs: ['Psychiatrique (anxiété, dépression, burn-out)'] },
    ],
    // Le questionnaire HAD, et non le pack humeur : celui-ci est inactif en base
    // (voir l'en-tête de la table).
    suggestions: [
      { questionnaireId: 'Q_NEU_11', priorite: 1, objectif: "Objectiver l'humeur et l'anxiété quand un antécédent psychiatrique est déclaré au bilan initial." },
    ],
    justificationClaims: [
      { claimId: 'WN-CL-0339-010', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0047-008', versionClaim: 'v1.0' },
    ],
    niveau: 'socle',
  },
];

export type OrientationMetadata = {
  version: string;
  /**
   * Passe à true uniquement quand le praticien a signé la table compilée
   * (lot 9). Second verrou du double verrou fail-closed de la route
   * `/api/praticien/orientation` — le premier est WN_ENABLE_ORIENTATION_NNPP2.
   */
  validationExterne: boolean;
  dateValidation: string | null;
  claimsSource: OrientationClaimRef[];
};

export const ORIENTATION_METADATA: OrientationMetadata = {
  version: 'orientation-nnpp2-v1',
  validationExterne: false,
  dateValidation: null,
  claimsSource: [],
};

export const ORIENTATION_RULES_SHA256 = sha256(JSON.stringify(ORIENTATION_RULES_V1));
