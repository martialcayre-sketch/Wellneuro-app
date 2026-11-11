import { beforeEach, describe, expect, it, vi } from 'vitest';

// [[D-491]] §2 — le VRAI critère : valide au corpus ET non supplanté, couple
// exact, et un corpus illisible dès que l'une des deux lectures échoue. Les
// services sont éprouvés ailleurs avec ce module simulé ; ce banc-ci garde le
// module lui-même (revue de t72, P1-1).

const { lectures } = vi.hoisted(() => ({
  lectures: {
    valides: vi.fn<(refs: { claimId: string; versionClaim: string }[]) => Promise<ReadonlySet<string>>>(),
    nonSupplantes: vi.fn<(refs: { claimId: string; versionClaim: string }[]) => Promise<ReadonlySet<string>>>(),
  },
}));

// Sans `importOriginal` : le module réel instancie Prisma au chargement. La clé
// est recopiée telle quelle (`identifiant::version`, `validite.ts`).
vi.mock('@/lib/rag/claims/validite', () => ({
  cleClaim: (r: { claimId: string; versionClaim: string }) => `${r.claimId}::${r.versionClaim}`,
  claimsValidesAuCorpus: lectures.valides,
  claimsNonSupplantesAuCorpus: lectures.nonSupplantes,
}));

import { claimsAdmissiblesAuCorpus, couplesNonAdmissibles } from './admissibiliteClaims';

const A = { claimId: 'WN-CL-1111-001', versionClaim: 'v1.0' };
const B = { claimId: 'WN-CL-2222-002', versionClaim: 'v1.0' };
const C = { claimId: 'WN-CL-3333-003', versionClaim: 'v2.0' };
const cle = (r: { claimId: string; versionClaim: string }) => `${r.claimId}::${r.versionClaim}`;

beforeEach(() => {
  lectures.valides.mockReset();
  lectures.nonSupplantes.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('claimsAdmissiblesAuCorpus — intersection valide ∩ non supplanté', () => {
  it('valide mais SUPPLANTÉ : exclu', async () => {
    lectures.valides.mockResolvedValue(new Set([cle(A), cle(B)]));
    lectures.nonSupplantes.mockResolvedValue(new Set([cle(B)]));
    const admissibles = await claimsAdmissiblesAuCorpus([A, B], 'banc');
    expect(admissibles).toEqual(new Set([cle(B)]));
  });

  it('non supplanté mais NON VALIDE : exclu', async () => {
    lectures.valides.mockResolvedValue(new Set([cle(B)]));
    lectures.nonSupplantes.mockResolvedValue(new Set([cle(A), cle(B)]));
    const admissibles = await claimsAdmissiblesAuCorpus([A, B], 'banc');
    expect(admissibles).toEqual(new Set([cle(B)]));
  });

  it('les deux lectures reçoivent les mêmes couples, ceux demandés', async () => {
    lectures.valides.mockResolvedValue(new Set());
    lectures.nonSupplantes.mockResolvedValue(new Set());
    await claimsAdmissiblesAuCorpus([A, C], 'banc');
    expect(lectures.valides).toHaveBeenCalledWith([A, C]);
    expect(lectures.nonSupplantes).toHaveBeenCalledWith([A, C]);
  });

  it('la lecture des supplantations seule rejetée : corpus illisible (null), sans lever', async () => {
    lectures.valides.mockResolvedValue(new Set([cle(A)]));
    lectures.nonSupplantes.mockRejectedValue(Object.assign(new Error('panne'), { code: 'P1001' }));
    await expect(claimsAdmissiblesAuCorpus([A], 'banc')).resolves.toBeNull();
  });

  it('la lecture de validité seule rejetée : corpus illisible (null), sans lever', async () => {
    lectures.valides.mockRejectedValue(new Error('panne'));
    lectures.nonSupplantes.mockResolvedValue(new Set([cle(A)]));
    await expect(claimsAdmissiblesAuCorpus([A], 'banc')).resolves.toBeNull();
  });

  it('la trace serveur ne porte que la signature de l’erreur', async () => {
    const erreur = vi.spyOn(console, 'error').mockImplementation(() => {});
    lectures.valides.mockRejectedValue(Object.assign(new Error('détail sensible'), { code: 'P1001' }));
    lectures.nonSupplantes.mockResolvedValue(new Set());
    await claimsAdmissiblesAuCorpus([A], 'banc');
    expect(erreur).toHaveBeenCalledWith('[banc] corpus illisible', 'Error/P1001');
  });
});

describe('couplesNonAdmissibles', () => {
  it('rend les couples absents, dédoublonnés, dans l’ordre de la demande', () => {
    expect(couplesNonAdmissibles([C, A, B, C, A], new Set([cle(B)]))).toEqual([C, A]);
  });

  it('le couple exact fait l’identité : une autre version du même claim ne couvre pas', () => {
    expect(couplesNonAdmissibles([{ ...A, versionClaim: 'v2.0' }], new Set([cle(A)]))).toEqual([
      { claimId: A.claimId, versionClaim: 'v2.0' },
    ]);
  });
});
