import { describe, expect, it } from 'vitest';
import {
  DIFFUSION_CONFIRMATION,
  isApprovalStale,
  resolveActiveApproval,
  validateDiffusionApproval,
  type DiffusionVersionRow,
  type PersistedApprovalRow,
} from './diffusion';

const version: DiffusionVersionRow = {
  inputHash: 'HASH_V1',
  decisionCardInputHash: 'HASH_DEC',
  status: 'practitioner_reviewed',
  reviewedAt: new Date('2026-01-02T00:00:00.000Z'),
};

const validApproval = {
  decisionCardInputHash: 'HASH_DEC',
  protocolDraftInputHash: 'HASH_V1',
  approvedAt: '2026-01-03T00:00:00.000Z',
  approvedBy: 'practitioner',
  confirmation: DIFFUSION_CONFIRMATION,
};

describe('validateDiffusionApproval', () => {
  it('accepte une approbation praticien postérieure à la relecture, bien ancrée', () => {
    expect(validateDiffusionApproval({ version, approval: validApproval })).toEqual({ ok: true });
  });

  it('refuse une version non relue', () => {
    const res = validateDiffusionApproval({ version: { ...version, status: 'draft' }, approval: validApproval });
    expect(res).toEqual({ ok: false, reason: 'not_reviewed' });
  });

  it('refuse un ancrage de hash discordant', () => {
    const res = validateDiffusionApproval({
      version,
      approval: { ...validApproval, protocolDraftInputHash: 'AUTRE' },
    });
    expect(res).toEqual({ ok: false, reason: 'anchor_mismatch' });
  });

  it('refuse une approbation antérieure ou égale à la relecture', () => {
    const res = validateDiffusionApproval({
      version,
      approval: { ...validApproval, approvedAt: '2026-01-02T00:00:00.000Z' },
    });
    expect(res).toEqual({ ok: false, reason: 'not_after_review' });
  });

  it('refuse une confirmation invalide', () => {
    const res = validateDiffusionApproval({
      version,
      approval: { ...validApproval, confirmation: 'autre' },
    });
    expect(res).toEqual({ ok: false, reason: 'invalid_confirmation' });
  });
});

describe('resolveActiveApproval / isApprovalStale', () => {
  const row = (id: string, hash: string, supersedes: string | null, iso: string): PersistedApprovalRow => ({
    id,
    protocolDraftInputHash: hash,
    supersedesApprovalId: supersedes,
    createdAt: new Date(iso),
  });

  it('retourne la tête de chaîne des approbations', () => {
    const rows = [
      row('a1', 'HASH_V1', null, '2026-01-03T00:00:00.000Z'),
      row('a2', 'HASH_V2', 'a1', '2026-01-05T00:00:00.000Z'),
    ];
    expect(resolveActiveApproval(rows)?.id).toBe('a2');
  });

  it('marque l’approbation caduque si elle n’ancre plus la version active', () => {
    const approval = row('a1', 'HASH_V1', null, '2026-01-03T00:00:00.000Z');
    expect(isApprovalStale(approval, 'HASH_V2')).toBe(true);
    expect(isApprovalStale(approval, 'HASH_V1')).toBe(false);
    expect(isApprovalStale(null, 'HASH_V1')).toBe(false);
  });
});
