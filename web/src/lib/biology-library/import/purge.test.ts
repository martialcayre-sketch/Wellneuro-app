import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma, journal } = vi.hoisted(() => {
  const journal: string[] = [];
  const prisma = {
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(async () => {
      journal.push('verrou');
      return 1;
    }),
    $transaction: vi.fn(),
    importBiologique: { updateMany: vi.fn(), count: vi.fn() },
    compteRenduBiologique: { updateMany: vi.fn() },
  };
  return { prisma, journal };
});
vi.mock('@/lib/prisma', () => ({ prisma }));

import { purgerAEcheance } from './purge';

/** Le texte SQL d'un appel `$queryRaw` (gabarit étiqueté). */
const sql = (args: unknown[]) => (args[0] as string[]).join('?');

let candidats: string[];
let perimes: Record<string, string[]>;
let espions: Array<ReturnType<typeof vi.spyOn>>;

beforeEach(() => {
  journal.length = 0;
  candidats = ['cr_1'];
  perimes = {};
  prisma.$queryRaw.mockImplementation(async (...args: unknown[]) => {
    if (sql(args).includes('FROM comptes_rendus_biologiques')) {
      journal.push('candidats');
      return candidats.map(id => ({ id }));
    }
    journal.push('perimes');
    return (perimes[args[1] as string] ?? []).map(id => ({ id }));
  });
  prisma.$transaction.mockImplementation(async (cb: (tx: typeof prisma) => unknown) => cb(prisma));
  prisma.importBiologique.updateMany.mockImplementation(async ({ where }: { where: { id: { in: string[] } } }) => {
    journal.push('import.clos');
    return { count: where.id.in.length };
  });
  prisma.importBiologique.count.mockResolvedValue(0);
  prisma.compteRenduBiologique.updateMany.mockImplementation(async () => {
    journal.push('compteRendu.purge');
    return { count: 1 };
  });
  espions = (['error', 'warn', 'log'] as const).map(m => vi.spyOn(console, m).mockImplementation(() => {}));
});

afterEach(() => {
  vi.clearAllMocks();
  for (const e of espions) e.mockRestore();
});

describe('purgerAEcheance — 30 jours après le dépôt (D-258)', () => {
  it('choisit les candidats par l’horloge de la base, puis purge chacun sous son verrou', async () => {
    candidats = ['cr_1', 'cr_2'];
    expect(await purgerAEcheance()).toEqual({ candidats: 2, purges: 2, importsClos: 0, differes: 0, echecs: 0 });
    const requete = sql(prisma.$queryRaw.mock.calls[0]);
    expect(requete).toContain('contenu IS NOT NULL');
    expect(requete).toContain("clock_timestamp() AT TIME ZONE 'UTC') - interval '30 days'");
    // Une transaction par compte rendu.
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(journal).toEqual(['candidats', 'verrou', 'perimes', 'compteRendu.purge', 'verrou', 'perimes', 'compteRendu.purge']);
    expect(prisma.compteRenduBiologique.updateMany).toHaveBeenCalledWith({
      where: { id: 'cr_1', contenu: { not: null } },
      data: { contenu: null, motifPurge: 'echeance' },
    });
  });

  it('clôt d’abord un import en cours abandonné, PUIS purge — sinon il bloquerait la purge pour toujours (revue, P1)', async () => {
    perimes = { cr_1: ['imp_mort'] };
    expect(await purgerAEcheance()).toMatchObject({ purges: 1, importsClos: 1 });
    expect(journal).toEqual(['candidats', 'verrou', 'perimes', 'import.clos', 'compteRendu.purge']);
    expect(prisma.importBiologique.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['imp_mort'] }, statut: 'en_cours' },
      data: { statut: 'echec', motifEchec: 'delai_depasse' },
    });
    const [gabarit, idCompteRendu, intervalle] = prisma.$queryRaw.mock.calls[1] as [string[], string, string];
    expect(gabarit.join('?')).toContain("statut = 'en_cours'");
    expect(gabarit.join('?')).toContain("lance_le < (clock_timestamp() AT TIME ZONE 'UTC') - ?::interval");
    expect(idCompteRendu).toBe('cr_1');
    expect(intervalle).toBe('300000 milliseconds');
    expect(prisma.importBiologique.count).toHaveBeenCalledWith({ where: { idCompteRendu: 'cr_1', statut: 'en_cours' } });
  });

  it('une extraction encore fraîche diffère la purge au passage suivant, sans la tenter', async () => {
    prisma.importBiologique.count.mockResolvedValueOnce(1);
    expect(await purgerAEcheance()).toMatchObject({ purges: 0, differes: 1, echecs: 0 });
    expect(prisma.compteRenduBiologique.updateMany).not.toHaveBeenCalled();
  });

  it('un document purgé entre-temps n’est pas compté', async () => {
    prisma.compteRenduBiologique.updateMany.mockResolvedValueOnce({ count: 0 });
    expect(await purgerAEcheance()).toMatchObject({ candidats: 1, purges: 0, echecs: 0 });
  });

  it('un refus n’emporte que son compte rendu, et ne journalise ni identifiant ni message', async () => {
    candidats = ['cr_1', 'cr_2'];
    prisma.compteRenduBiologique.updateMany.mockRejectedValueOnce(
      Object.assign(new Error('purge refusée cr_1 pat_sophie'), { code: 'P2010' }),
    );
    expect(await purgerAEcheance()).toEqual({ candidats: 2, purges: 1, importsClos: 0, differes: 0, echecs: 1 });
    const ecrit = JSON.stringify(espions.flatMap(e => e.mock.calls));
    expect(ecrit).toContain('P2010');
    for (const interdit of ['cr_1', 'pat_sophie', 'purge refusée']) expect(ecrit).not.toContain(interdit);
  });
});
