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
  | { type: 'couleur'; couleurs: Array<'warning' | 'danger'> };

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

export const ORIENTATION_RULES_V1: OrientationRule[] = [];

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
