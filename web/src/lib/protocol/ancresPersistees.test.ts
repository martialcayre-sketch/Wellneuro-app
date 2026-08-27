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

  it('demande un ordre déterministe à la base', async () => {
    // Sans `orderBy`, deux lignes de MÊME rang arrivent dans l'ordre que
    // PostgreSQL veut bien rendre, et `ancreCourante` — donc l'ancre de toute
    // fenêtre de jalon — devient non déterministe.
    prisma.assessmentEpisode.findMany.mockResolvedValue([]);
    await lireAncresPersistees('PAT_1');
    expect(prisma.assessmentEpisode.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { confirmedAt: 'asc' } }),
    );
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
  // L'identifiant compte désormais : une re-confirmation vise LA ligne posée.
  const ep = (milestone: string, assessmentEpisodeId = 'a') => ({ milestone, assessmentEpisodeId });

  it('un jalon de mesure ne pose aucune ancre : rien à refuser', () => {
    expect(refusAncreNonRecevable(ep('J21', 'peu-importe'), ancres)).toBeNull();
  });

  it('accepte l’ancre suivante et la re-confirmation d’une ancre posée', () => {
    expect(refusAncreNonRecevable(ep('T1', 'b'), ancres)).toBeNull();
    expect(refusAncreNonRecevable(ep('T0', 'a'), ancres)).toBeNull();
  });

  it('REFUSE un rang sauté — le trou ne se referme pas, il se propage', () => {
    // `milestone` vient du navigateur. Un `T7` sur un dossier qui n'a que `T0`
    // ouvrirait un cycle de rang 7, et `ancreSuivante` proposerait ensuite `T8`.
    const refus = refusAncreNonRecevable(ep('T7', 'z'), ancres);
    expect(refus).not.toBeNull();
    expect(refus).toContain('T7');
    expect(refus).toContain('T1');
  });

  it('REFUSE ce qui n’est ni une ancre ni une mesure — la colonne n’a aucun CHECK', () => {
    // `T01` et `T1` désigneraient le même cycle pour un humain et deux pour la
    // lecture ; `TA` et `J7` ne seraient relus par personne. Écrits en base,
    // ils y resteraient invisibles.
    for (const inconnu of ['T01', 'TA', 'J7', 'T', '']) {
      expect(refusAncreNonRecevable(ep(inconnu, 'z'), ancres)).toContain('Jalon inconnu');
    }
  });

  it('sur un dossier vierge, seul `T0` passe', () => {
    expect(refusAncreNonRecevable(ep('T0', 'neuf'), [])).toBeNull();
    expect(refusAncreNonRecevable(ep('T1', 'neuf'), [])).not.toBeNull();
  });

  // CONTRE-REVUE ADVERSE DU 2026-08-27, affirmation `N1.1` RÉFUTÉE.
  //
  // La garde raisonnait sur les NOMS : `T0` déjà posé ⇒ recevable. Mais
  // l'`upsert` de persistance est idempotent SUR SON IDENTIFIANT — un `T0`
  // posté sous un identifiant inconnu de la base est une CRÉATION, et le
  // dossier se retrouve avec deux cycles nommés `T0`. Or le nom est ce dont
  // l'identifiant des mesures est dérivé : les `J21` des deux cycles
  // reprennent tous deux `…-T0-J21`, et la collision de clé primaire que
  // `D-113` avait fermée se rouvre.
  it('REFUSE un second `T0` sous un autre identifiant — la collision reviendrait', () => {
    const refus = refusAncreNonRecevable(ep('T0', 'autre-ligne'), ancres);
    expect(refus).not.toBeNull();
    expect(refus).toContain('déjà posée');
  });

  it('la re-confirmation reste possible, mais seulement sur la ligne existante', () => {
    expect(refusAncreNonRecevable(ep('T0', 'a'), ancres)).toBeNull();
  });

  it('un dossier portant déjà deux lignes de même rang accepte chacune d’elles', () => {
    // Aucune unicité en base ne l'interdit aujourd'hui (dette `D-113`) : la
    // garde ne doit pas rendre irréparable un dossier qui porterait déjà le
    // doublon, elle doit empêcher d'en créer un nouveau.
    const deux = [ligne('a', 'T0', '2026-01-01T00:00:00.000Z'), ligne('b', 'T0', '2026-02-01T00:00:00.000Z')];
    expect(refusAncreNonRecevable(ep('T0', 'a'), deux)).toBeNull();
    expect(refusAncreNonRecevable(ep('T0', 'b'), deux)).toBeNull();
    expect(refusAncreNonRecevable(ep('T0', 'c'), deux)).not.toBeNull();
  });
});
