import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma, journal, ouverts } = vi.hoisted(() => {
  const journal: string[] = [];
  // Travaux ouverts que l'UPDATE de clôture trouve, par compte rendu.
  const ouverts: Record<string, number> = {};
  const prisma = {
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(async (...args: unknown[]) => {
      if ((args[0] as string[]).join('?').includes('UPDATE travaux_extraction_biologique')) {
        journal.push('travaux.clos');
        return ouverts[args[1] as string] ?? 0;
      }
      journal.push('verrou');
      return 1;
    }),
    $transaction: vi.fn(),
    importBiologique: { updateMany: vi.fn(), count: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() },
    compteRenduBiologique: { updateMany: vi.fn() },
    ligneBiologiqueCandidate: { deleteMany: vi.fn() },
    travailExtractionBiologique: { count: vi.fn(), deleteMany: vi.fn() },
  };
  return { prisma, journal, ouverts };
});
vi.mock('@/lib/prisma', () => ({ prisma }));

import { effacerNonValide, GRACE_TRAVAIL_OUVERT_MS, purgerAEcheance } from './purge';

/** Le texte SQL d'un appel `$queryRaw` (gabarit étiqueté). */
const sql = (args: unknown[]) => (args[0] as string[]).join('?');

let candidats: string[];
let perimes: Record<string, string[]>;
/** Comptes rendus dont l'échéance ET la grâce sont passées, à l'horloge de la base. */
let graceEchue: string[];
let espions: Array<ReturnType<typeof vi.spyOn>>;

beforeEach(() => {
  journal.length = 0;
  candidats = ['cr_1'];
  perimes = {};
  graceEchue = [];
  for (const cle of Object.keys(ouverts)) delete ouverts[cle];
  prisma.$queryRaw.mockImplementation(async (...args: unknown[]) => {
    if (sql(args).includes('AS grace_echue')) {
      journal.push('grace');
      return [{ grace_echue: graceEchue.includes(args[3] as string) }];
    }
    if (sql(args).includes('FROM comptes_rendus_biologiques')) {
      journal.push('candidats');
      return candidats.map(id => ({ id, id_patient: 'pat_jennifer' }));
    }
    if (sql(args).includes('FROM patients')) {
      journal.push('dossier');
      return [{}];
    }
    journal.push('perimes');
    return (perimes[args[1] as string] ?? []).map(id => ({ id }));
  });
  prisma.$transaction.mockImplementation(async (cb: (tx: typeof prisma) => unknown) => cb(prisma));
  prisma.importBiologique.updateMany.mockImplementation(async ({ where }: { where: { id?: { in: string[] } } }) => {
    journal.push('import.clos');
    return { count: where.id?.in.length ?? 1 };
  });
  prisma.importBiologique.count.mockResolvedValue(0);
  prisma.travailExtractionBiologique.count.mockResolvedValue(0);
  prisma.compteRenduBiologique.updateMany.mockImplementation(async () => {
    journal.push('compteRendu.purge');
    return { count: 1 };
  });
  prisma.ligneBiologiqueCandidate.deleteMany.mockImplementation(async () => {
    journal.push('lignes.effacees');
    return { count: 0 };
  });
  prisma.importBiologique.findMany.mockResolvedValue([]);
  prisma.importBiologique.deleteMany.mockImplementation(async ({ where }: { where: { id: { in: string[] } } }) => {
    journal.push('imports.effaces');
    return { count: where.id.in.length };
  });
  prisma.travailExtractionBiologique.deleteMany.mockImplementation(async () => {
    journal.push('travaux.effaces');
    return { count: 0 };
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
    expect(await purgerAEcheance()).toEqual({
      candidats: 2, purges: 2, importsClos: 0, differes: 0, lignesEffacees: 0, importsEffaces: 0, travauxClos: 0, echecs: 0,
    });
    const requete = sql(prisma.$queryRaw.mock.calls[0]);
    expect(requete).toContain('c.contenu IS NOT NULL');
    expect(requete).toContain("clock_timestamp() AT TIME ZONE 'UTC') - interval '30 days'");
    // Un document déjà purgé reste candidat tant qu'il garde une ligne non
    // validée ou une extraction sans ligne validée (D-283 §2, F44).
    expect(requete).toContain("l.statut <> 'validee'");
    expect(requete).toContain("NOT EXISTS (SELECT 1 FROM lignes_biologiques_candidates l WHERE l.id_import = i.id AND l.statut = 'validee')");
    // Le dossier en partage AVANT le verrou du compte rendu : l'ordre de
    // l'effacement du dossier (revue adverse de F44, P2-1).
    const dossier = prisma.$queryRaw.mock.calls[1] as [string[], string];
    expect(dossier[0].join('?')).toContain('FOR KEY SHARE');
    expect(dossier[1]).toBe('pat_jennifer');
    // Une transaction par compte rendu.
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(journal).toEqual([
      'candidats',
      'dossier', 'verrou', 'grace', 'perimes', 'compteRendu.purge', 'lignes.effacees',
      'dossier', 'verrou', 'grace', 'perimes', 'compteRendu.purge', 'lignes.effacees',
    ]);
    expect(prisma.compteRenduBiologique.updateMany).toHaveBeenCalledWith({
      where: { id: 'cr_1', contenu: { not: null } },
      data: { contenu: null, motifPurge: 'echeance' },
    });
  });

  it('clôt d’abord un import en cours abandonné, PUIS purge — sinon il bloquerait la purge pour toujours (revue, P1)', async () => {
    perimes = { cr_1: ['imp_mort'] };
    expect(await purgerAEcheance()).toMatchObject({ purges: 1, importsClos: 1 });
    expect(journal).toEqual(['candidats', 'dossier', 'verrou', 'grace', 'perimes', 'import.clos', 'compteRendu.purge', 'lignes.effacees']);
    expect(prisma.importBiologique.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['imp_mort'] }, statut: 'en_cours' },
      data: { statut: 'echec', motifEchec: 'delai_depasse' },
    });
    const [gabarit, idCompteRendu, intervalle] = prisma.$queryRaw.mock.calls[3] as [string[], string, string];
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
    expect(prisma.ligneBiologiqueCandidate.deleteMany).not.toHaveBeenCalled();
  });

  it('un travail de la file en attente ou en cours diffère tout, document et lignes (F44, cas 4)', async () => {
    prisma.travailExtractionBiologique.count.mockResolvedValueOnce(1);
    expect(await purgerAEcheance()).toMatchObject({ purges: 0, differes: 1, lignesEffacees: 0, echecs: 0 });
    expect(prisma.travailExtractionBiologique.count).toHaveBeenCalledWith({
      where: { idCompteRendu: 'cr_1', statut: { in: ['en_attente', 'en_cours'] } },
    });
    expect(prisma.compteRenduBiologique.updateMany).not.toHaveBeenCalled();
    expect(prisma.ligneBiologiqueCandidate.deleteMany).not.toHaveBeenCalled();
    // Dans la période de grâce, rien n'est clos (D-451).
    expect(journal).not.toContain('travaux.clos');
  });

  it('une période du cron passée après J30, un travail encore ouvert est clos `document_purge`, son import en cours aussi, PUIS la purge (D-451)', async () => {
    graceEchue = ['cr_1'];
    ouverts.cr_1 = 1;
    expect(await purgerAEcheance()).toMatchObject({ purges: 1, travauxClos: 1, importsClos: 1, differes: 0, echecs: 0 });
    expect(journal).toEqual([
      'candidats', 'dossier', 'verrou', 'grace', 'import.clos', 'travaux.clos', 'compteRendu.purge', 'lignes.effacees',
    ]);
    // L'échéance et la grâce jugées par l'horloge de la base, celle du trigger.
    const [gabarit, jours, grace, idCompteRendu] = prisma.$queryRaw.mock.calls[2] as [string[], string, string, string];
    expect(gabarit.join('?')).toContain("depose_le <= (clock_timestamp() AT TIME ZONE 'UTC') - ?::interval - ?::interval");
    expect([jours, grace, idCompteRendu]).toEqual(['30 days', `${GRACE_TRAVAIL_OUVERT_MS} milliseconds`, 'cr_1']);
    // Tout import en cours du compte rendu, frais ou non : la base refuse le
    // motif `echeance` sous une extraction en cours.
    expect(prisma.importBiologique.updateMany).toHaveBeenCalledWith({
      where: { idCompteRendu: 'cr_1', statut: 'en_cours' },
      data: { statut: 'echec', motifEchec: 'delai_depasse' },
    });
    const cloture = prisma.$executeRaw.mock.calls.find(c => sql(c).includes('UPDATE travaux_extraction_biologique'))!;
    expect(sql(cloture)).toContain("SET statut = 'echec', motif_echec = 'document_purge', reserve_jusqua = NULL");
    expect(sql(cloture)).toContain("termine_le = clock_timestamp() AT TIME ZONE 'UTC'");
    expect(sql(cloture)).toContain("statut IN ('en_attente', 'en_cours')");
    expect(cloture[1]).toBe('cr_1');
    // Plus aucun report : la purge suit dans la même transaction.
    expect(prisma.travailExtractionBiologique.count).not.toHaveBeenCalled();
  });

  it('la grâce vaut UNE période du cron de la purge : horaire dans `web/cron.json` (D-451)', () => {
    const cron = JSON.parse(readFileSync(new URL('../../../../cron.json', import.meta.url), 'utf8')) as {
      jobs: { command: string }[];
    };
    const purge = cron.jobs.filter(j => j.command.includes('npm run bio:purge-echeance'));
    expect(purge).toHaveLength(1);
    // Minute fixe, toutes les heures : si la cadence change, la grâce change avec elle.
    expect(purge[0].command).toMatch(/^\d{1,2} \* \* \* \* npm run bio:purge-echeance$/);
    expect(GRACE_TRAVAIL_OUVERT_MS).toBe(60 * 60_000);
  });

  it('compte les lignes et les extractions effacées, document déjà purgé ou non', async () => {
    prisma.compteRenduBiologique.updateMany.mockResolvedValueOnce({ count: 0 });
    prisma.ligneBiologiqueCandidate.deleteMany.mockResolvedValueOnce({ count: 3 });
    prisma.importBiologique.findMany.mockResolvedValueOnce([{ id: 'imp_1' }]);
    expect(await purgerAEcheance()).toMatchObject({ purges: 0, lignesEffacees: 3, importsEffaces: 1, echecs: 0 });
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
    expect(await purgerAEcheance()).toEqual({
      candidats: 2, purges: 1, importsClos: 0, differes: 0, lignesEffacees: 0, importsEffaces: 0, travauxClos: 0, echecs: 1,
    });
    const ecrit = JSON.stringify(espions.flatMap(e => e.mock.calls));
    expect(ecrit).toContain('P2010');
    for (const interdit of ['cr_1', 'pat_sophie', 'purge refusée']) expect(ecrit).not.toContain(interdit);
  });
});

describe('effacerNonValide — ce que D-283 §2 ne garde pas (F44)', () => {
  it('efface les lignes non validées, puis chaque extraction restée sans ligne, ses travaux d’abord', async () => {
    prisma.ligneBiologiqueCandidate.deleteMany.mockImplementationOnce(async () => {
      journal.push('lignes.effacees');
      return { count: 2 };
    });
    prisma.importBiologique.findMany.mockResolvedValueOnce([{ id: 'imp_vide' }, { id: 'imp_echec' }]);
    expect(await effacerNonValide(prisma as never, 'cr_1')).toEqual({ lignes: 2, imports: 2 });
    expect(prisma.ligneBiologiqueCandidate.deleteMany).toHaveBeenCalledWith({
      where: { statut: { not: 'validee' }, import: { idCompteRendu: 'cr_1' } },
    });
    expect(prisma.importBiologique.findMany).toHaveBeenCalledWith({
      where: { idCompteRendu: 'cr_1', lignes: { none: {} } },
      select: { id: true },
    });
    expect(prisma.travailExtractionBiologique.deleteMany).toHaveBeenCalledWith({
      where: { idImportCourant: { in: ['imp_vide', 'imp_echec'] } },
    });
    // L'ordre des FK RESTRICT : lignes, travaux, extractions.
    expect(journal).toEqual(['lignes.effacees', 'travaux.effaces', 'imports.effaces']);
  });

  it('une extraction qui garde une ligne validée reste, et rien d’autre n’est touché', async () => {
    expect(await effacerNonValide(prisma as never, 'cr_1')).toEqual({ lignes: 0, imports: 0 });
    expect(prisma.travailExtractionBiologique.deleteMany).not.toHaveBeenCalled();
    expect(prisma.importBiologique.deleteMany).not.toHaveBeenCalled();
  });
});
