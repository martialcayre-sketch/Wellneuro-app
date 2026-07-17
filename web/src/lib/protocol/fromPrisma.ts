import { canonicalSha256 } from '@/lib/clinical-engine/canonical';
import type { ProtocolDraft } from '@/lib/clinical-engine/types';

// Reconstruction d'un `ProtocolDraft` depuis le `payload` JSONB persisté, avec
// re-vérification d'intégrité (comble le trou LOT-02 : aucun code ne revalidait
// le payload en lecture). L'`inputHash` du contrat est calculé sur le draft privé
// de son `protocolDraftId` et de son `inputHash` (cf. buildProtocolDraft) : on le
// recalcule à l'identique et on refuse toute divergence avec la colonne stockée.

export class ProtocolPayloadIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProtocolPayloadIntegrityError';
  }
}

// Recalcule l'empreinte d'intégrité d'un draft, exactement comme buildProtocolDraft.
export function recomputeDraftInputHash(draft: ProtocolDraft): string {
  const { protocolDraftId: _id, inputHash: _hash, ...hashInput } = draft;
  return canonicalSha256(hashInput);
}

// `payload` = JSONB stocké ; `expectedInputHash` = colonne `input_hash` de la ligne.
export function reconstructProtocolDraft(
  payload: unknown,
  expectedInputHash: string,
): ProtocolDraft {
  if (!payload || typeof payload !== 'object') {
    throw new ProtocolPayloadIntegrityError('Payload de protocole illisible.');
  }
  const draft = payload as ProtocolDraft;
  if (typeof draft.protocolDraftId !== 'string' || typeof draft.inputHash !== 'string') {
    throw new ProtocolPayloadIntegrityError('Payload de protocole incomplet.');
  }
  const recomputed = recomputeDraftInputHash(draft);
  if (recomputed !== draft.inputHash || draft.inputHash !== expectedInputHash) {
    throw new ProtocolPayloadIntegrityError(
      'Empreinte du protocole incohérente avec le payload stocké.',
    );
  }
  return draft;
}
