import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    trustAdverseEffectReport: { count: vi.fn() },
    trustPrivacyIncident: { count: vi.fn() },
    trustRightsRequest: { count: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { debutHeureCivile, premierSignalementDeLHeure } from './notification';

describe('e-mail praticien des signalements : un par heure et par dossier (D-328)', () => {
  const maintenant = new Date('2026-10-18T20:00:00.000Z');

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.trustAdverseEffectReport.count.mockResolvedValue(0);
    prisma.trustPrivacyIncident.count.mockResolvedValue(0);
    prisma.trustRightsRequest.count.mockResolvedValue(0);
  });

  it('aucun signalement du dossier depuis le début de l’heure : le prochain prévient', async () => {
    expect(await premierSignalementDeLHeure('PAT_TEST', new Date('2026-10-18T20:42:10.000Z'))).toBe(true);
    const where = prisma.trustPrivacyIncident.count.mock.calls[0][0].where;
    expect(where).toEqual({ idPatient: 'PAT_TEST', soumisLe: { gte: new Date('2026-10-18T20:00:00.000Z') } });
  });

  it('heure CIVILE, pas glissante : 10:00, 10:50, 11:40 — le dépôt de 11:40 est le premier de son heure', () => {
    // Glissante, la fenêtre de 11:40 remontait à 10:40 et voyait 10:50 : la
    // chaîne taisait tout après le premier dépôt, sans borne de temps.
    expect(debutHeureCivile(new Date('2026-10-18T11:40:00.000Z'))).toEqual(new Date('2026-10-18T11:00:00.000Z'));
    expect(debutHeureCivile(new Date('2026-10-18T10:50:00.000Z'))).toEqual(new Date('2026-10-18T10:00:00.000Z'));
    expect(debutHeureCivile(new Date('2026-10-18T11:00:00.000Z'))).toEqual(new Date('2026-10-18T11:00:00.000Z'));
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
