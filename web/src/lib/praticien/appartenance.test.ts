import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma, journaliserAccesDossier } = vi.hoisted(() => ({
  prisma: { patient: { findUnique: vi.fn() } },
  journaliserAccesDossier: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('./journalAcces', () => ({ journaliserAccesDossier }));

import { verifierAppartenancePatient } from './appartenance';

const ACCES = { route: '/api/praticien/reperes', methode: 'GET' };

describe('verifierAppartenancePatient — journalisation des accès (G-TRUST-04)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    journaliserAccesDossier.mockResolvedValue(undefined);
  });

  it('journalise sur verdict accessible quand `acces` est fourni', async () => {
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'praticien@wellneuro.fr' });
    const verdict = await verifierAppartenancePatient('PAT_1', 'praticien@wellneuro.fr', ACCES);
    expect(verdict).toBe('accessible');
    expect(journaliserAccesDossier).toHaveBeenCalledTimes(1);
    expect(journaliserAccesDossier).toHaveBeenCalledWith({
      idPatient: 'PAT_1',
      praticienEmail: 'praticien@wellneuro.fr',
      route: '/api/praticien/reperes',
      methode: 'GET',
    });
  });

  it('ne journalise pas un patient introuvable — une ligne nommerait un dossier non lu', async () => {
    prisma.patient.findUnique.mockResolvedValue(null);
    const verdict = await verifierAppartenancePatient('PAT_INCONNU', 'praticien@wellneuro.fr', ACCES);
    expect(verdict).toBe('introuvable');
    expect(journaliserAccesDossier).not.toHaveBeenCalled();
  });

  it('ne journalise pas le dossier d’un autre praticien', async () => {
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'autre@wellneuro.fr' });
    const verdict = await verifierAppartenancePatient('PAT_1', 'praticien@wellneuro.fr', ACCES);
    expect(verdict).toBe('autre_praticien');
    expect(journaliserAccesDossier).not.toHaveBeenCalled();
  });

  it('ne journalise pas sans e-mail de session', async () => {
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'praticien@wellneuro.fr' });
    const verdict = await verifierAppartenancePatient('PAT_1', null, ACCES);
    expect(verdict).toBe('autre_praticien');
    expect(journaliserAccesDossier).not.toHaveBeenCalled();
  });

  it('ne journalise pas sans `acces` — les appels existants à 2 arguments restent muets', async () => {
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'praticien@wellneuro.fr' });
    const verdict = await verifierAppartenancePatient('PAT_1', 'praticien@wellneuro.fr');
    expect(verdict).toBe('accessible');
    expect(journaliserAccesDossier).not.toHaveBeenCalled();
  });

  it('reste insensible à la casse d’une ligne héritée non normalisée', async () => {
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'Praticien@Wellneuro.FR' });
    const verdict = await verifierAppartenancePatient('PAT_1', 'praticien@wellneuro.fr', ACCES);
    expect(verdict).toBe('accessible');
    expect(journaliserAccesDossier).toHaveBeenCalledTimes(1);
  });
});
