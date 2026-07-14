import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma, tx } = vi.hoisted(() => {
  const tx = { $queryRaw: vi.fn(), patient: { update: vi.fn() } };
  return { prisma: { $transaction: vi.fn((operation: (client: typeof tx) => unknown) => operation(tx)) }, tx };
});

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/ids', () => ({ createPublicId: () => 'TOK_TEST_CREATED' }));

import { ensureActivePortalAccess, PortalAccessError } from './portal-access';

describe('ensureActivePortalAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_URL = 'https://app.wellneuro.fr/';
  });

  it('réutilise le token actif existant', async () => {
    tx.$queryRaw.mockResolvedValue([{ actif: true, accessToken: 'TOK_EXISTANT', accessTokenRevoked: false }]);
    await expect(ensureActivePortalAccess('PAT_1')).resolves.toEqual({
      accessToken: 'TOK_EXISTANT',
      url: 'https://app.wellneuro.fr/portail/TOK_EXISTANT',
    });
    expect(tx.patient.update).not.toHaveBeenCalled();
  });

  it('crée un token uniquement lorsqu’il est absent', async () => {
    tx.$queryRaw.mockResolvedValue([{ actif: true, accessToken: null, accessTokenRevoked: false }]);
    await expect(ensureActivePortalAccess('PAT_1')).resolves.toMatchObject({ accessToken: 'TOK_TEST_CREATED' });
    expect(tx.patient.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { idPatient: 'PAT_1' },
      data: expect.objectContaining({ accessToken: 'TOK_TEST_CREATED' }),
    }));
    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });

  it('refuse un portail révoqué sans le réactiver', async () => {
    tx.$queryRaw.mockResolvedValue([{ actif: true, accessToken: 'TOK_REVOQUE', accessTokenRevoked: true }]);
    await expect(ensureActivePortalAccess('PAT_1')).rejects.toEqual(new PortalAccessError('portal_revoked'));
    expect(tx.patient.update).not.toHaveBeenCalled();
  });

  it('refuse un patient absent ou inactif', async () => {
    tx.$queryRaw.mockResolvedValue([{ actif: false, accessToken: null, accessTokenRevoked: false }]);
    await expect(ensureActivePortalAccess('PAT_1')).rejects.toEqual(new PortalAccessError('patient_not_found'));
  });
});
