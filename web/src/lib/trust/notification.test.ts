import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    trustAdverseEffectReport: { count: vi.fn() },
    trustPrivacyIncident: { count: vi.fn() },
    trustRightsRequest: { count: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { premierSignalementDeLHeure } from './notification';

describe('e-mail praticien des signalements : un par heure et par dossier (D-328)', () => {
  const maintenant = new Date('2026-10-18T20:00:00.000Z');

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.trustAdverseEffectReport.count.mockResolvedValue(0);
    prisma.trustPrivacyIncident.count.mockResolvedValue(0);
    prisma.trustRightsRequest.count.mockResolvedValue(0);
  });

  it('aucun signalement du dossier dans l’heure : le prochain prévient', async () => {
    expect(await premierSignalementDeLHeure('PAT_TEST', maintenant)).toBe(true);
    const where = prisma.trustPrivacyIncident.count.mock.calls[0][0].where;
    expect(where).toEqual({ idPatient: 'PAT_TEST', soumisLe: { gte: new Date('2026-10-18T19:00:00.000Z') } });
  });

  it.each(['trustAdverseEffectReport', 'trustPrivacyIncident', 'trustRightsRequest'] as const)(
    'un signalement déjà déposé dans l’heure (%s) : pas de nouvel e-mail — les trois natures comptent ensemble',
    async (table) => {
      prisma[table].count.mockResolvedValue(1);
      expect(await premierSignalementDeLHeure('PAT_TEST', maintenant)).toBe(false);
    },
  );

  it('lecture en échec : on prévient quand même — un e-mail de trop vaut mieux qu’un signalement ignoré', async () => {
    prisma.trustRightsRequest.count.mockRejectedValue(new Error('P1001'));
    const erreur = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await premierSignalementDeLHeure('PAT_TEST', maintenant)).toBe(true);
    erreur.mockRestore();
  });
});
