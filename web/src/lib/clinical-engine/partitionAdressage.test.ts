import { describe, expect, it } from 'vitest';
import { partitionnerConstatsAdresses } from './safetyFindings';
import { PREFIXE_FINDING_ANAMNESE, PREFIXE_FINDING_EFFET_INDESIRABLE } from './safetyFindingSource';
import type { SafetyFinding } from './types';

// LA PARTITION OUVERTS / ADRESSÉS ([[D-257]], LOT-04), hors de toute chaîne.

function constat(findingId: string): SafetyFinding {
  return {
    findingId,
    kind: 'safety',
    disposition: 'requires_practitioner_review',
    confidence: 'à_documenter',
    rationale: 'Constat de banc.',
    ruleId: 'SAF-ANAM-01',
    provenance: { responseIds: [], needIds: [], clinicalObjectCodes: [] },
    limitations: [],
  };
}

const ANAM_A = `${PREFIXE_FINDING_ANAMNESE}aaaaaaaaaaaaaaaa`;
const ANAM_B = `${PREFIXE_FINDING_ANAMNESE}bbbbbbbbbbbbbbbb`;
const EI = `${PREFIXE_FINDING_EFFET_INDESIRABLE}ei_1`;
const couverture = (findingIds: string[]) => ({
  idAdressage: 'adr_1', idCorrespondance: 'lettre_1', findingIds, acteLe: '2026-10-03T08:00:00.000Z',
});

describe('partitionnerConstatsAdresses', () => {
  it('sans couverture, tout reste ouvert, dans l’ordre d’entrée', () => {
    const findings = [constat(ANAM_B), constat(EI), constat(ANAM_A)];
    expect(partitionnerConstatsAdresses(findings, [])).toEqual({ ouverts: findings, adresses: [] });
  });

  it('seuls les constats nommés par une couverture passent adressés', () => {
    const { ouverts, adresses } = partitionnerConstatsAdresses(
      [constat(ANAM_A), constat(ANAM_B)],
      [couverture([ANAM_A])],
    );
    expect(ouverts.map(f => f.findingId)).toEqual([ANAM_B]);
    expect(adresses.map(f => f.findingId)).toEqual([ANAM_A]);
  });

  it('un effet indésirable ne se lève JAMAIS par une lettre, même nommé dans une couverture', () => {
    const { ouverts, adresses } = partitionnerConstatsAdresses([constat(EI)], [couverture([EI])]);
    expect(ouverts.map(f => f.findingId)).toEqual([EI]);
    expect(adresses).toEqual([]);
  });
});
