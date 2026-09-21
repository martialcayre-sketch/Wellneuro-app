import { canonicalSha256 } from '@/lib/clinical-engine/canonical';
import {
  VERSION_PROTOCOL_DRAFT_V2,
  type ProtocolDraft,
} from '@/lib/clinical-engine/types';
import { assertFoodCompassActionRef, assertProtocolDraftC5Structure } from './refValidation';
import { recomputeDraftInputHash } from '@/lib/protocol/fromPrisma';

function canonicalIso(value: string): string {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime()) || date.toISOString() !== value) {
    throw new TypeError('updatedAt doit être une date ISO canonique valide.');
  }
  return value;
}

// `attachFoodCompassRef` A ÉTÉ RETIRÉE — arbitrage B1 du cadrage du 2026-09-16,
// rendu le 2026-09-21 ([[D-239]]).
//
// ELLE N'ÉTAIT PAS SEULEMENT MORTE, ELLE ÉTAIT UNE SECONDE FAÇON DE FAIRE. Le
// cadrage la décrivait comme « morte de bout en bout », ce qui est vrai de la
// FONCTION — aucun appelant hors son propre banc — mais faux du champ qu'elle
// posait : `foodCompassRef` est vivant, écrit au geste praticien par
// `ProtocolMiniBuilder` et lu par la voie patient (`api/portail/protocole`).
//
// CE QUI LA REND SUPPRIMABLE SANS PERTE : la voie vivante garde PLUS FORT.
// `api/praticien/protocoles/versions` exige un protocole source actif, refuse
// si C5 est éteinte, appelle `assertFoodCompassActionRef` contre le brouillon
// actif — puis **RE-DÉRIVE** la référence depuis les données officielles et
// compare son `refHash`. Elle ne valide pas ce qu'on lui soumet : elle le
// recalcule. La fonction retirée, elle, validait une référence soumise ; elle
// était le maillon faible d'un invariant tenu deux fois.
//
// ET LE BANC LE PLUS FOURNI COUVRAIT LE CHEMIN MORT. `foodCompass.test.ts` lui
// consacrait un cas entier, quand le constructeur VIVANT
// (`buildFoodCompassProtocolV2FromSource`, appelé en `versions/route.ts:472`)
// est éprouvé ailleurs, par `patientReference.test.ts`. Les assertions qui
// visaient ses gardes propres sont parties avec elle ; celles qui s'en
// servaient comme FIXTURE ont gardé leur objet.

export function reviewFoodCompassProtocolV2(input: {
  protocolDraft: ProtocolDraft;
  reviewedAt: string;
  c5Enabled: boolean;
}): ProtocolDraft {
  if (!input.c5Enabled) throw new TypeError('C5 est désactivée.');
  canonicalIso(input.reviewedAt);
  if (recomputeDraftInputHash(input.protocolDraft) !== input.protocolDraft.inputHash
    || input.protocolDraft.version !== VERSION_PROTOCOL_DRAFT_V2) {
    throw new TypeError('Le protocole C5 V2 est incompatible ou altéré.');
  }
  assertProtocolDraftC5Structure(input.protocolDraft);
  if (input.reviewedAt < input.protocolDraft.updatedAt) {
    throw new TypeError('La revue doit être postérieure à la dernière modification.');
  }
  const withoutHash = {
    ...input.protocolDraft,
    status: 'practitioner_reviewed' as const,
    review: {
      reviewedAt: input.reviewedAt,
      reviewerRole: 'practitioner' as const,
      confirmation: 'content_reviewed' as const,
    },
  };
  const { protocolDraftId: _protocolDraftId, inputHash: _inputHash, ...hashInput } = withoutHash;
  return { ...withoutHash, inputHash: canonicalSha256(hashInput) };
}

export function buildFoodCompassProtocolV2FromSource(input: {
  sourceProtocolDraft: ProtocolDraft;
  targetProtocolDraft: ProtocolDraft;
  actions: ProtocolDraft['actions'];
  c5Enabled: boolean;
}): ProtocolDraft {
  if (!input.c5Enabled) throw new TypeError('C5 est désactivée.');
  if (recomputeDraftInputHash(input.sourceProtocolDraft) !== input.sourceProtocolDraft.inputHash
    || recomputeDraftInputHash(input.targetProtocolDraft) !== input.targetProtocolDraft.inputHash) {
    throw new TypeError('Empreinte protocole incohérente.');
  }
  assertProtocolDraftC5Structure(input.sourceProtocolDraft);
  assertProtocolDraftC5Structure(input.targetProtocolDraft);
  if (input.targetProtocolDraft.version !== 'c1-protocol-draft-v1'
    || input.targetProtocolDraft.status !== 'practitioner_reviewed'
    || input.actions.length !== input.targetProtocolDraft.actions.length) {
    throw new TypeError('Cible protocole V2 invalide.');
  }
  if (input.targetProtocolDraft.protocolDraftId !== input.sourceProtocolDraft.protocolDraftId
    || input.targetProtocolDraft.selectedPriorityId !== input.sourceProtocolDraft.selectedPriorityId) {
    throw new TypeError('La cible C5 doit conserver le protocole et la priorité de sa source.');
  }
  const refsByActionId = new Map(input.actions.map(action => [action.actionId, action.foodCompassRef]));
  const targetIds = new Set(input.targetProtocolDraft.actions.map(action => action.actionId));
  if (input.actions.some(action => !targetIds.has(action.actionId))) {
    throw new TypeError('Action C5 étrangère à la cible.');
  }
  const actions = input.targetProtocolDraft.actions.map(action => {
    const foodCompassRef = refsByActionId.get(action.actionId);
    if (foodCompassRef) {
      if (action.type !== 'food') throw new TypeError('Une référence C5 exige une action alimentaire.');
      assertFoodCompassActionRef(foodCompassRef, {
        protocolDraftId: input.sourceProtocolDraft.protocolDraftId,
        selectedPriorityId: input.sourceProtocolDraft.selectedPriorityId,
      });
      if (foodCompassRef.sourceProtocolInputHash !== input.sourceProtocolDraft.inputHash) {
        throw new TypeError('La référence C5 est caduque pour le protocole source.');
      }
    }
    return { ...action, foodCompassRef: foodCompassRef ? { ...foodCompassRef } : undefined };
  });
  if (!actions.some(action => action.foodCompassRef !== undefined)) {
    throw new TypeError('Aucune référence C5 à insérer.');
  }
  const withoutHash = {
    ...input.targetProtocolDraft,
    version: VERSION_PROTOCOL_DRAFT_V2,
    actions,
  };
  const { protocolDraftId: _protocolDraftId, inputHash: _inputHash, ...hashInput } = withoutHash;
  const result = { ...withoutHash, inputHash: canonicalSha256(hashInput) };
  assertProtocolDraftC5Structure(result);
  return result;
}
