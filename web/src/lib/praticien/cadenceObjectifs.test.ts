import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    objectifNegocie: { count: vi.fn() },
    accordAtteste: { count: vi.fn() },
    finObjectif: { count: vi.fn() },
    dispositionProposition: { count: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { cadenceObjectifsAtteinte } from './cadenceObjectifs';

describe('cadence praticien des objectifs (D-327)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.objectifNegocie.count.mockResolvedValue(0);
    prisma.accordAtteste.count.mockResolvedValue(0);
    prisma.finObjectif.count.mockResolvedValue(0);
    prisma.dispositionProposition.count.mockResolvedValue(0);
  });

  it('additionne les quatre tables du dossier, sur l’heure écoulée', async () => {
    prisma.objectifNegocie.count.mockResolvedValue(10);
    prisma.accordAtteste.count.mockResolvedValue(10);
    prisma.finObjectif.count.mockResolvedValue(5);
    prisma.dispositionProposition.count.mockResolvedValue(4);
    expect(await cadenceObjectifsAtteinte('PAT_TEST')).toBe(false);
    prisma.dispositionProposition.count.mockResolvedValue(5);
    expect(await cadenceObjectifsAtteinte('PAT_TEST')).toBe(true);
    const where = prisma.accordAtteste.count.mock.calls[0][0].where;
    expect(where.idPatient).toBe('PAT_TEST');
    expect(Date.now() - where.creeLe.gte.getTime()).toBeGreaterThanOrEqual(3_600_000 - 1000);
  });
});

// Les routes `accord` et `fin` n'ont pas de banc de route : cette garde
// structurelle prouve au moins le branchement — la cadence est consultée, et
// AVANT l'écriture, dans chacune des quatre routes de la famille.
describe('branchement de la cadence dans les routes de la famille (D-327)', () => {
  const RACINE = join(__dirname, '..', '..');
  it.each([
    ['app/api/praticien/objectifs/route.ts', 'prisma.objectifNegocie.create('],
    ['app/api/praticien/objectifs/accord/route.ts', 'prisma.accordAtteste.create('],
    ['app/api/praticien/objectifs/fin/route.ts', 'prisma.finObjectif.create('],
    ['app/api/praticien/propositions-objectif/route.ts', 'prisma.dispositionProposition.create('],
  ])('%s : la cadence précède l’écriture', (chemin, ecriture) => {
    const code = readFileSync(join(RACINE, chemin), 'utf8');
    const cadence = code.indexOf('await cadenceObjectifsAtteinte(idPatient)');
    const premiereEcriture = code.indexOf(ecriture);
    expect(cadence).toBeGreaterThan(-1);
    expect(premiereEcriture).toBeGreaterThan(cadence);
    expect(code.slice(cadence, cadence + 200)).toMatch(/return echec\('cadence', MESSAGE_CADENCE_PRATICIEN, 429\)/);
  });
});
