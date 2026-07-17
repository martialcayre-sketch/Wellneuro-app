import type { ActionCareer, ActionCareerStage } from './types';
import { canonicalIso, nonEmpty } from './validation';

/**
 * Carrière d'action (A7-14) : proposée → essayée → adaptée → stabilisée →
 * intégrée / abandonnée-informative, à travers les tours de spirale.
 *
 * L'abandon est informatif — une donnée pour la conception du tour suivant,
 * jamais un échec. L'adaptation peut se répéter (nouveaux tours) et une
 * action stabilisée peut redevenir adaptée si le contexte change.
 */
const TRANSITIONS_CARRIERE: Record<ActionCareerStage, ActionCareerStage[]> = {
  proposee: ['essayee', 'abandonnee_informative'],
  essayee: ['adaptee', 'stabilisee', 'abandonnee_informative'],
  adaptee: ['adaptee', 'stabilisee', 'abandonnee_informative'],
  stabilisee: ['adaptee', 'integree', 'abandonnee_informative'],
  integree: [],
  abandonnee_informative: [],
};

export function createActionCareer(input: {
  careerId: string;
  actionId: string;
  patientId: string;
  proposedAt: string;
}): ActionCareer {
  nonEmpty(input.careerId, 'careerId');
  nonEmpty(input.actionId, 'actionId');
  nonEmpty(input.patientId, 'patientId');
  canonicalIso(input.proposedAt, 'proposedAt');
  return {
    careerId: input.careerId,
    actionId: input.actionId,
    patientId: input.patientId,
    stage: 'proposee',
    historique: [{ stage: 'proposee', at: input.proposedAt }],
  };
}

export function advanceActionCareer(
  career: ActionCareer,
  stage: ActionCareerStage,
  at: string
): ActionCareer {
  canonicalIso(at, 'at');
  if (!TRANSITIONS_CARRIERE[career.stage].includes(stage)) {
    throw new TypeError(
      `Transition de carrière interdite : ${career.stage} → ${stage}.`
    );
  }
  const last = career.historique[career.historique.length - 1];
  if (last && at < last.at) {
    throw new TypeError('L’historique de carrière est chronologique (append-only).');
  }
  return {
    ...career,
    stage,
    historique: [...career.historique, { stage, at }],
  };
}

/** Une carrière close (intégrée ou abandonnée-informative) ne bouge plus. */
export function isCareerClosed(career: ActionCareer): boolean {
  return TRANSITIONS_CARRIERE[career.stage].length === 0;
}
