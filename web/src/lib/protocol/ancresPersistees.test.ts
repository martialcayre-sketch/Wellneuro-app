import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: { assessmentEpisode: { findMany: vi.fn() } },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { ancreCourante, lireAncresPersistees, refusAncreNonRecevable } from './ancresPersistees';

// Ce que ce banc défend (`D-113`) : cinq routes lisaient « l'ancre du cycle »
// par `where: { milestone: 'T0' }` + « la plus récente ». Les deux moitiés sont
// fausses depuis que la série des ancres est ouverte — le filtre ne voit pas
// `T1`, et la date départage ce que le RANG identifie.

const ligne = (id: string, milestone: string, iso: string, cycleId: string | null = id) => ({
  id,
  cycleId,
  confirmedAt: new Date(iso),
  milestone,
});

describe('lireAncresPersistees', () => {
  beforeEach(() => vi.clearAllMocks());

  it('interroge la base sur un filtre LARGE, et tranche la forme en mémoire', async () => {
    prisma.assessmentEpisode.findMany.mockResolvedValue([
      ligne('a', 'T0', '2026-01-01T00:00:00.000Z'),
      // Rien en base n'interdit ces deux-là : la colonne `milestone` ne porte
      // aucun CHECK (dette nommée par `D-113`).
      ligne('x', 'TA', '2026-02-01T00:00:00.000Z'),
      ligne('y', 'T01', '2026-02-15T00:00:00.000Z'),
      ligne('b', 'T1', '2026-03-01T00:00:00.000Z'),
    ]);

    const ancres = await lireAncresPersistees('PAT_1');

    expect(prisma.assessmentEpisode.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { idPatient: 'PAT_1', milestone: { startsWith: 'T' } } }),
    );
    expect(ancres.map((a) => a.milestone)).toEqual(['T0', 'T1']);
  });

  it('ordonne par RANG, jamais par date de confirmation', async () => {
    prisma.assessmentEpisode.findMany.mockResolvedValue([
      ligne('b', 'T1', '2026-01-01T00:00:00.000Z'),
      ligne('a', 'T0', '2026-03-01T00:00:00.000Z'),
    ]);
    const ancres = await lireAncresPersistees('PAT_1');
    expect(ancres.map((a) => a.milestone)).toEqual(['T0', 'T1']);
    expect(ancreCourante(ancres)?.milestone).toBe('T1');
  });

  it('borne la lecture à une date quand l’appelant lit un état passé', async () => {
    prisma.assessmentEpisode.findMany.mockResolvedValue([]);
    await lireAncresPersistees('PAT_1', new Date('2026-02-01T00:00:00.000Z'));
    expect(prisma.assessmentEpisode.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ confirmedAt: { lte: new Date('2026-02-01T00:00:00.000Z') } }),
      }),
    );
  });

  it('sans aucune ancre, le cycle courant est `null` — jamais un premier cycle supposé', async () => {
    prisma.assessmentEpisode.findMany.mockResolvedValue([]);
    expect(ancreCourante(await lireAncresPersistees('PAT_1'))).toBeNull();
  });
});

describe('refusAncreNonRecevable — la garde des deux points de persistance', () => {
  const ancres = [ligne('a', 'T0', '2026-01-01T00:00:00.000Z')];

  it('un jalon de mesure ne pose aucune ancre : rien à refuser', () => {
    expect(refusAncreNonRecevable('J21', ancres)).toBeNull();
  });

  it('accepte l’ancre suivante et la re-confirmation d’une ancre posée', () => {
    expect(refusAncreNonRecevable('T1', ancres)).toBeNull();
    expect(refusAncreNonRecevable('T0', ancres)).toBeNull();
  });

  it('REFUSE un rang sauté — le trou ne se referme pas, il se propage', () => {
    // `milestone` vient du navigateur. Un `T7` sur un dossier qui n'a que `T0`
    // ouvrirait un cycle de rang 7, et `ancreSuivante` proposerait ensuite `T8`.
    const refus = refusAncreNonRecevable('T7', ancres);
    expect(refus).not.toBeNull();
    expect(refus).toContain('T7');
    expect(refus).toContain('T1');
  });

  it('REFUSE ce qui n’est ni une ancre ni une mesure — la colonne n’a aucun CHECK', () => {
    // `T01` et `T1` désigneraient le même cycle pour un humain et deux pour la
    // lecture ; `TA` et `J7` ne seraient relus par personne. Écrits en base,
    // ils y resteraient invisibles.
    for (const inconnu of ['T01', 'TA', 'J7', 'T', '']) {
      expect(refusAncreNonRecevable(inconnu, ancres)).toContain('Jalon inconnu');
    }
  });

  it('sur un dossier vierge, seul `T0` passe', () => {
    expect(refusAncreNonRecevable('T0', [])).toBeNull();
    expect(refusAncreNonRecevable('T1', [])).not.toBeNull();
  });
});
