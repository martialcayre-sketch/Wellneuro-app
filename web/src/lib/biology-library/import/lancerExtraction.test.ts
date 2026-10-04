import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma, extraire, journal, resoudre } = vi.hoisted(() => {
  const journal: string[] = [];
  const trace = (nom: string, valeur: unknown = undefined) =>
    vi.fn(async (..._args: unknown[]) => {
      journal.push(nom);
      return valeur;
    });
  const prisma = {
    $executeRaw: trace('verrou', 1),
    compteRenduBiologique: {
      findFirst: trace('compteRendu.findFirst', { id: 'cr_1', typeMime: 'application/pdf', purgeLe: null }),
      findUnique: trace('compteRendu.findUnique', { contenu: new Uint8Array([37, 80, 68, 70, 45]), typeMime: 'application/pdf' }),
    },
    importBiologique: {
      findMany: trace('import.findMany', []),
      create: trace('import.create', { id: 'imp_1' }),
      update: trace('import.update', {}),
      updateMany: trace('import.updateMany', { count: 1 }),
      count: trace('import.count', 1),
    },
    ligneBiologiqueCandidate: { createMany: trace('lignes.createMany', { count: 0 }) },
    biologyAnalyte: {
      findMany: trace('analytes.findMany', [
        { code: 'BIO_FERRITINE', unite: 'ng/mL' },
        { code: 'BIO_CRP_US', unite: 'mg/L' },
        { code: 'BIO_NEUTROPHILES', unite: '10^9/L' },
        { code: 'BIO_NEUTROPHILES_PCT', unite: '%' },
      ]),
    },
    $transaction: vi.fn(),
  };
  return { prisma, extraire: vi.fn(), journal, resoudre: vi.fn() };
});

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('./extraction', () => ({
  extraireCompteRendu: extraire,
  MODELE_EXTRACTION: 'claude-sonnet-5-5',
  VERSION_PROCEDE_EXTRACTION: 'bio-extraction-v1',
}));
vi.mock('./resolverLibellesV1', async importOriginal => {
  const reel = await importOriginal<typeof import('./resolverLibellesV1')>();
  resoudre.mockImplementation((l: string, u: string | null, unites: ReadonlyMap<string, string | null>) =>
    reel.resoudreLigne(l, u, unites));
  return { ...reel, resoudreLigne: resoudre };
});

import { lancerExtraction } from './lancerExtraction';

/** Le premier argument d'un appel simulé, typé pour l'assertion. */
function argument<T>(fn: { mock: { calls: unknown[][] } }, rang = 0): T {
  return fn.mock.calls[rang][0] as T;
}
type Lignes = { data: Array<Record<string, unknown>> };

const MAINTENANT = new Date('2026-10-02T10:00:00.000Z');
const PARAMS = { idPatient: 'pat_sophie', idCompteRendu: 'cr_1', lancePar: 'praticien@wellneuro.fr', maintenant: MAINTENANT };

const LIGNES = [
  { page: 1, libelle: 'Ferritine', valeur: '48', unite: 'ng/mL', preleveLe: new Date('2026-09-15T06:30:00.000Z'), heureLue: true },
  { page: 2, libelle: 'CRP ultrasensible', valeur: '<0,5', unite: 'mg/L', preleveLe: null, heureLue: false },
];

let espions: Array<ReturnType<typeof vi.spyOn>>;

beforeEach(() => {
  journal.length = 0;
  prisma.$transaction.mockImplementation(async (cb: (tx: typeof prisma) => unknown) => cb(prisma));
  prisma.importBiologique.findMany.mockImplementation(async () => {
    journal.push('import.findMany');
    return [];
  });
  extraire.mockImplementation(async () => {
    journal.push('appel');
    return { ok: true, laboratoire: 'Laboratoire de fixture', lignes: LIGNES };
  });
  espions = (['error', 'warn', 'log', 'info', 'debug'] as const).map(m => vi.spyOn(console, m).mockImplementation(() => {}));
});

afterEach(() => {
  vi.clearAllMocks();
  for (const e of espions) e.mockRestore();
});

describe('lancerExtraction — modèle et version enregistrés à chaque fois (v4)', () => {
  it('une photo passe à l’extracteur avec son type, par le même pipeline (LOT-03)', async () => {
    const octets = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    prisma.compteRenduBiologique.findFirst.mockResolvedValueOnce({ id: 'cr_1', typeMime: 'image/jpeg', purgeLe: null });
    prisma.compteRenduBiologique.findUnique.mockResolvedValueOnce({ contenu: octets, typeMime: 'image/jpeg' });
    await lancerExtraction(PARAMS);
    expect(extraire).toHaveBeenCalledWith(Buffer.from(octets), 'image/jpeg');
  });

  it('crée l’import en cours avec le modèle et la version AVANT l’appel', async () => {
    await lancerExtraction(PARAMS);
    expect(prisma.importBiologique.create).toHaveBeenCalledWith({
      data: {
        idPatient: 'pat_sophie',
        idCompteRendu: 'cr_1',
        modele: 'claude-sonnet-5-5',
        versionPrompt: 'bio-extraction-v1',
        lancePar: 'praticien@wellneuro.fr',
      },
      select: { id: true },
    });
    expect(journal.indexOf('import.create')).toBeLessThan(journal.indexOf('appel'));
  });

  it.each(['erreur_fournisseur', 'reponse_invalide', 'document_illisible', 'delai_depasse'] as const)(
    'en échec (%s), l’import garde son modèle et sa version et passe en échec, sans ligne',
    async motif => {
      extraire.mockResolvedValueOnce({ ok: false, motif });
      const issue = await lancerExtraction(PARAMS);
      expect(issue).toEqual({ ok: true, idImport: 'imp_1', statut: 'echec', motif });
      expect(argument<{ data: unknown }>(prisma.importBiologique.create).data).toMatchObject({
        modele: 'claude-sonnet-5-5', versionPrompt: 'bio-extraction-v1',
      });
      expect(prisma.importBiologique.updateMany).toHaveBeenCalledWith({
        where: { id: 'imp_1', statut: 'en_cours' },
        data: { statut: 'echec', motifEchec: motif },
      });
      expect(prisma.ligneBiologiqueCandidate.createMany).not.toHaveBeenCalled();
    },
  );
});

describe('lancerExtraction — les lignes, puis la terminaison, dans UNE transaction', () => {
  it('écrit les lignes AVANT de terminer l’import, sans écriture imbriquée', async () => {
    const issue = await lancerExtraction(PARAMS);
    expect(issue).toEqual({ ok: true, idImport: 'imp_1', statut: 'extrait', lignes: 2 });
    // Deux transactions interactives : l'ouverture (avant l'appel), puis lignes + terminaison.
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    const apres = journal.slice(journal.indexOf('appel'));
    expect(apres).toEqual(['appel', 'verrou', 'import.count', 'analytes.findMany', 'lignes.createMany', 'import.update']);
    const terminaison = argument<{ data: Record<string, unknown> }>(prisma.importBiologique.update);
    expect(terminaison).toEqual({
      where: { id: 'imp_1' },
      data: { statut: 'extrait', laboratoireLu: 'Laboratoire de fixture' },
    });
    expect(terminaison.data).not.toHaveProperty('lignes');
  });

  it('enregistre la date du prélèvement relevée et le texte tel que lu', async () => {
    await lancerExtraction(PARAMS);
    const { data } = argument<Lignes>(prisma.ligneBiologiqueCandidate.createMany);
    expect(data[0]).toMatchObject({
      idPatient: 'pat_sophie', idImport: 'imp_1', rang: 1, page: 1,
      libelleLu: 'Ferritine', valeurLue: '48', uniteLue: 'ng/mL',
      preleveLeLu: new Date('2026-09-15T06:30:00.000Z'), heureLue: true,
    });
    expect(data[1]).toMatchObject({ rang: 2, valeurLue: '<0,5', preleveLeLu: null, heureLue: false });
  });

  it('resolver signé ([[D-259]]) : la table réelle propose l’analyte du libellé lu', async () => {
    await lancerExtraction(PARAMS);
    const { data } = argument<Lignes>(prisma.ligneBiologiqueCandidate.createMany);
    expect(data[0]).toMatchObject({ libelleLu: 'Ferritine', analytePropose: 'BIO_FERRITINE', statutMapping: 'resolu' });
  });

  it('un libellé ambigu se départage par l’unité lue, contre les unités du catalogue ([[D-263]])', async () => {
    extraire.mockResolvedValueOnce({
      ok: true,
      laboratoire: 'Laboratoire de fixture',
      lignes: [
        { page: 1, libelle: 'Polynucléaires neutrophiles', valeur: '52', unite: '%', preleveLe: null, heureLue: false },
        { page: 1, libelle: 'Polynucléaires neutrophiles', valeur: '3,1', unite: 'G/L', preleveLe: null, heureLue: false },
      ],
    });
    await lancerExtraction(PARAMS);
    const { data } = argument<Lignes>(prisma.ligneBiologiqueCandidate.createMany);
    expect(data[0]).toMatchObject({ analytePropose: 'BIO_NEUTROPHILES_PCT', statutMapping: 'resolu' });
    expect(data[1]).toMatchObject({ analytePropose: 'BIO_NEUTROPHILES', statutMapping: 'resolu' });
  });

  it('l’analyte proposé vient du resolver seul, `ambigu` sans code', async () => {
    resoudre
      .mockReturnValueOnce({ statut: 'resolu', code: 'BIO_FERRITINE' })
      .mockReturnValueOnce({ statut: 'ambigu', code: null });
    await lancerExtraction(PARAMS);
    const { data } = argument<Lignes>(prisma.ligneBiologiqueCandidate.createMany);
    expect(data[0]).toMatchObject({ analytePropose: 'BIO_FERRITINE', statutMapping: 'resolu' });
    expect(data[1]).toMatchObject({ analytePropose: null, statutMapping: 'ambigu' });
  });
});

describe('lancerExtraction — imports en cours', () => {
  it('clôt `delai_depasse` un import en cours périmé, puis relance', async () => {
    prisma.importBiologique.findMany.mockResolvedValueOnce([
      { id: 'imp_vieux', lanceLe: new Date(MAINTENANT.getTime() - 6 * 60_000) },
    ]);
    await lancerExtraction(PARAMS);
    expect(prisma.importBiologique.update).toHaveBeenCalledWith({
      where: { id: 'imp_vieux' },
      data: { statut: 'echec', motifEchec: 'delai_depasse' },
    });
    expect(prisma.importBiologique.create).toHaveBeenCalled();
  });

  it('refuse une seconde extraction pendant qu’une première est en cours', async () => {
    prisma.importBiologique.findMany.mockResolvedValueOnce([
      { id: 'imp_frais', lanceLe: new Date(MAINTENANT.getTime() - 60_000) },
    ]);
    expect(await lancerExtraction(PARAMS)).toEqual({ ok: false, reason: 'extraction_en_cours' });
    expect(prisma.importBiologique.create).not.toHaveBeenCalled();
    expect(extraire).not.toHaveBeenCalled();
  });

  it('un document purgé (D-258) ne se relit plus : `document_purge`, aucun import ouvert', async () => {
    prisma.compteRenduBiologique.findFirst.mockResolvedValueOnce({
      id: 'cr_1', typeMime: 'application/pdf', purgeLe: new Date('2026-10-01T10:00:00.000Z'),
    });
    expect(await lancerExtraction(PARAMS)).toEqual({ ok: false, reason: 'document_purge' });
    expect(prisma.importBiologique.create).not.toHaveBeenCalled();
    expect(prisma.importBiologique.update).not.toHaveBeenCalled();
    expect(extraire).not.toHaveBeenCalled();
  });

  it('un compte rendu d’un autre dossier est introuvable — la lecture filtre par dossier', async () => {
    await lancerExtraction(PARAMS);
    expect(argument<{ where: unknown }>(prisma.compteRenduBiologique.findFirst).where)
      .toEqual({ id: 'cr_1', idPatient: 'pat_sophie' });
    vi.clearAllMocks();
    prisma.compteRenduBiologique.findFirst.mockResolvedValueOnce(null);
    expect(await lancerExtraction(PARAMS)).toEqual({ ok: false, reason: 'compte_rendu_introuvable' });
    expect(extraire).not.toHaveBeenCalled();
  });
});

describe('lancerExtraction — une suite tardive ne réécrit pas un import clos', () => {
  it('l’import clos entre-temps (péremption) : aucune ligne, aucune terminaison', async () => {
    prisma.importBiologique.count.mockResolvedValueOnce(0);
    expect(await lancerExtraction(PARAMS)).toEqual({ ok: false, reason: 'import_clos' });
    expect(prisma.ligneBiologiqueCandidate.createMany).not.toHaveBeenCalled();
    expect(prisma.importBiologique.update).not.toHaveBeenCalled();
  });
});

describe('lancerExtraction — aucune donnée de santé dans les journaux', () => {
  it('une panne d’écriture ne journalise ni libellé, ni valeur, ni message', async () => {
    prisma.ligneBiologiqueCandidate.createMany.mockRejectedValueOnce(
      Object.assign(new Error('Ferritine 48 ng/mL pat_sophie'), { code: 'P2003' }),
    );
    expect(await lancerExtraction(PARAMS)).toEqual({ ok: false, reason: 'server_error' });
    // L'import se clôt `reponse_invalide`, il ne reste pas en cours (revue, P2-3).
    expect(prisma.importBiologique.updateMany).toHaveBeenLastCalledWith({
      where: { id: 'imp_1', statut: 'en_cours' },
      data: { statut: 'echec', motifEchec: 'reponse_invalide' },
    });
    const ecrit = JSON.stringify(espions.flatMap(e => e.mock.calls));
    expect(ecrit).toContain('P2003');
    for (const interdit of ['Ferritine', '48', 'ng/mL', 'pat_sophie', '<0,5']) {
      expect(ecrit).not.toContain(interdit);
    }
  });
});
