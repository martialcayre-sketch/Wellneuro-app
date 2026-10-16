import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma, transactions } = vi.hoisted(() => {
  const transactions = { annulees: 0 };
  const prisma = {
    biologyAnalyte: { findUnique: vi.fn() },
    biologyCatalogVersionCourante: { findUnique: vi.fn() },
    biologyNabmActe: { findUnique: vi.fn(), findMany: vi.fn() },
    biologyAnalyteNabm: {
      create: vi.fn(),
      updateMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    biologyAnalyteNabmJournal: { create: vi.fn() },
    biologyAnalyteNabmConstat: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      deleteMany: vi.fn(),
    },
    $executeRaw: vi.fn(),
    // Une transaction interactive : le client de transaction est le même mock ;
    // une exception du corps l'annule (compteur), comme Prisma.
    $transaction: vi.fn(),
  };
  return { prisma, transactions };
});

vi.mock('@/lib/prisma', () => ({ prisma }));

import {
  chercherActeNabm,
  deciderConstat,
  deciderCorrespondance,
  lireCorrespondancesAnalyte,
} from './correspondancesNabm';

const PRATICIEN = 'praticien@wellneuro.fr';
/** La date que la base pose (trigger) : ni celle du serveur, ni celle du client. */
const DATE_BASE = new Date('2026-01-02T03:04:05.678Z');

function acte(surcharge: Record<string, unknown> = {}) {
  return {
    codeActe: '1208',
    libelle: 'Libellé de l’acte',
    coefficientB: 20,
    inactif: false,
    ententePrealable: null,
    acteReserve: null,
    remboursementTotal: null,
    ...surcharge,
  };
}

const SIGNER = {
  analyteCode: 'BIO_FERRITINE',
  codeActe: '1208',
  decision: 'signer' as const,
  etatAttendu: 'absente' as const,
  nature: 'isole',
  praticien: PRATICIEN,
};

beforeEach(() => {
  vi.clearAllMocks();
  prisma.biologyCatalogVersionCourante.findUnique.mockResolvedValue({ versionSource: 'V105' });
  prisma.biologyAnalyte.findUnique.mockResolvedValue({ actif: true, constatNabm: null });
  prisma.biologyNabmActe.findUnique.mockResolvedValue(acte());
  prisma.biologyNabmActe.findMany.mockResolvedValue([]);
  prisma.biologyAnalyteNabm.create.mockResolvedValue({ id: 'x' });
  prisma.biologyAnalyteNabm.updateMany.mockResolvedValue({ count: 1 });
  prisma.biologyAnalyteNabm.findFirst.mockResolvedValue(null);
  prisma.biologyAnalyteNabm.findUnique.mockResolvedValue(null);
  prisma.biologyAnalyteNabm.findUniqueOrThrow.mockResolvedValue({ verifiePar: PRATICIEN, verifieLe: DATE_BASE });
  prisma.biologyAnalyteNabmJournal.create.mockResolvedValue({ id: 'j' });
  prisma.biologyAnalyteNabmConstat.create.mockResolvedValue({ id: 'k' });
  prisma.biologyAnalyteNabmConstat.findFirst.mockResolvedValue(null);
  prisma.biologyAnalyteNabmConstat.findUniqueOrThrow.mockResolvedValue({
    millesime: 'V105',
    verifiePar: PRATICIEN,
    verifieLe: DATE_BASE,
  });
  prisma.biologyAnalyteNabmConstat.deleteMany.mockResolvedValue({ count: 1 });
  prisma.$executeRaw.mockResolvedValue(0);
  transactions.annulees = 0;
  prisma.$transaction.mockImplementation(async (corps: (tx: typeof prisma) => Promise<unknown>) => {
    try {
      return await corps(prisma);
    } catch (err) {
      transactions.annulees += 1;
      throw err;
    }
  });
});

describe('chercherActeNabm — par code exact, dans le millésime courant', () => {
  it('un code qui n’a pas quatre chiffres est refusé sans lire la base', async () => {
    for (const code of ['120', '12080', 'ferr', '12 8', '']) {
      expect(await chercherActeNabm(code)).toEqual({ ok: false, raison: 'code_invalide' });
    }
    expect(prisma.biologyNabmActe.findUnique).not.toHaveBeenCalled();
  });

  it('sans pointeur de millésime : millesime_absent', async () => {
    prisma.biologyCatalogVersionCourante.findUnique.mockResolvedValue(null);
    expect(await chercherActeNabm('1208')).toEqual({ ok: false, raison: 'millesime_absent' });
  });

  it('lit la ligne (code, millésime courant) et rien d’autre', async () => {
    const resultat = await chercherActeNabm('1208');
    expect(resultat).toEqual({ ok: true, millesime: 'V105', acte: acte() });
    expect(prisma.biologyNabmActe.findUnique.mock.calls[0][0].where).toEqual({
      codeActe_versionSource: { codeActe: '1208', versionSource: 'V105' },
    });
  });
});

describe('lireCorrespondancesAnalyte', () => {
  it('analyte inconnu : refusé', async () => {
    prisma.biologyAnalyte.findUnique.mockResolvedValue(null);
    expect(await lireCorrespondancesAnalyte('BIO_X')).toEqual({ ok: false, raison: 'analyte_inconnu' });
  });

  it('distingue signée et proposition, résout l’acte au millésime courant', async () => {
    const le = new Date('2026-10-15T10:00:00Z');
    // Un analyte hors de la liste préparée : aucun candidat ne s'y mêle.
    prisma.biologyAnalyte.findUnique.mockResolvedValue({
      code: 'BIO_HORS_LISTE',
      correspondancesNabm: [
        { codeActe: '1208', nature: 'isole', verifiePar: PRATICIEN, verifieLe: le },
        { codeActe: '9999', nature: 'groupe_ou', verifiePar: null, verifieLe: null },
      ],
    });
    prisma.biologyNabmActe.findMany.mockResolvedValue([acte()]);
    const resultat = await lireCorrespondancesAnalyte('BIO_HORS_LISTE');
    expect(resultat).toEqual({
      ok: true,
      millesime: 'V105',
      candidats: null,
      constat: null,
      correspondances: [
        { codeActe: '1208', nature: 'isole', etat: 'signee', verifiePar: PRATICIEN, verifieLe: le.toISOString(), acte: acte() },
        { codeActe: '9999', nature: 'groupe_ou', etat: 'proposition', verifiePar: null, verifieLe: null, acte: null },
      ],
    });
    expect(prisma.biologyNabmActe.findMany.mock.calls[0][0].where).toEqual({
      versionSource: 'V105',
      codeActe: { in: ['1208', '9999'] },
    });
  });
});

describe('lireCorrespondancesAnalyte — candidats de la liste préparée (M-3b)', () => {
  const analyte = (code: string, correspondancesNabm: unknown[] = []) =>
    prisma.biologyAnalyte.findUnique.mockResolvedValue({ code, actif: true, correspondancesNabm });

  it('rend le candidat résolu au millésime courant ; absent ou inactif, il ne s’affiche pas', async () => {
    analyte('BIO_TSH_US');
    // 1208 actif, 1211 inactif, 1212 absent du millésime.
    prisma.biologyNabmActe.findMany.mockResolvedValue([
      acte({ codeActe: '1208', libelle: 'T.S.H.(SANG)' }),
      acte({ codeActe: '1211', inactif: true }),
    ]);
    const resultat = await lireCorrespondancesAnalyte('BIO_TSH_US');
    expect(resultat.ok && resultat.candidats).toEqual({
      millesimeListe: 'V105',
      situation: 'libelle_explicite',
      motif: null,
      propositions: [
        { codeActe: '1208', nature: 'isole', motif: 'T.S.H. seule.', acte: acte({ codeActe: '1208', libelle: 'T.S.H.(SANG)' }) },
      ],
    });
    expect(prisma.biologyNabmActe.findMany.mock.calls[0][0].where).toEqual({
      versionSource: 'V105',
      codeActe: { in: ['1208', '1211', '1212'] },
    });
    // Rien n'est écrit : une proposition n'est pas une ligne en base.
    expect(prisma.biologyAnalyteNabm.create).not.toHaveBeenCalled();
    expect(prisma.biologyAnalyteNabm.updateMany).not.toHaveBeenCalled();
  });

  it('un couple qui a déjà une ligne n’est pas reproposé ; les autres candidats le sont', async () => {
    analyte('BIO_ALAT', [
      { codeActe: '0516', nature: 'isole', verifiePar: PRATICIEN, verifieLe: new Date('2026-10-15T10:00:00Z') },
    ]);
    prisma.biologyNabmActe.findMany.mockResolvedValue([acte({ codeActe: '0516' }), acte({ codeActe: '0522' })]);
    const resultat = await lireCorrespondancesAnalyte('BIO_ALAT');
    expect(resultat.ok && resultat.candidats?.propositions.map(p => [p.codeActe, p.nature])).toEqual([
      ['0522', 'groupe_et'],
    ]);
  });

  it('une proposition non signée déjà en base n’est pas doublée par le candidat', async () => {
    analyte('BIO_FERRITINE', [{ codeActe: '1213', nature: 'isole', verifiePar: null, verifieLe: null }]);
    prisma.biologyNabmActe.findMany.mockResolvedValue([acte({ codeActe: '1213' })]);
    const resultat = await lireCorrespondancesAnalyte('BIO_FERRITINE');
    expect(resultat.ok && resultat.candidats?.propositions).toEqual([]);
  });

  it('analyte inactif : aucune proposition, sa signature serait refusée', async () => {
    prisma.biologyAnalyte.findUnique.mockResolvedValue({ code: 'BIO_TSH_US', actif: false, correspondancesNabm: [] });
    const resultat = await lireCorrespondancesAnalyte('BIO_TSH_US');
    expect(resultat.ok && resultat.candidats?.propositions).toEqual([]);
    expect(prisma.biologyNabmActe.findMany).not.toHaveBeenCalled();
  });

  it('sans millésime courant : aucune proposition, aucune lecture d’acte', async () => {
    analyte('BIO_TSH_US');
    prisma.biologyCatalogVersionCourante.findUnique.mockResolvedValue(null);
    const resultat = await lireCorrespondancesAnalyte('BIO_TSH_US');
    expect(resultat.ok && resultat.candidats?.propositions).toEqual([]);
    expect(prisma.biologyNabmActe.findMany).not.toHaveBeenCalled();
  });

  it('analyte sans acte : la situation et son motif, rien à signer', async () => {
    analyte('BIO_HOMOCYSTEINE');
    const resultat = await lireCorrespondancesAnalyte('BIO_HOMOCYSTEINE');
    expect(resultat.ok && resultat.candidats).toEqual({
      millesimeListe: 'V105',
      situation: 'aucun_acte',
      motif: 'Aucun libellé de la V105 ne nomme cet analyte.',
      propositions: [],
    });
    expect(prisma.biologyNabmActe.findMany).not.toHaveBeenCalled();
  });
});

describe('deciderCorrespondance — signer', () => {
  it('depuis « absente » : journal puis ligne signée, dans UNE transaction, après les deux verrous', async () => {
    const resultat = await deciderCorrespondance(SIGNER);
    expect(resultat).toEqual({
      ok: true,
      correspondance: { codeActe: '1208', etat: 'signee', verifiePar: PRATICIEN, verifieLe: DATE_BASE.toISOString() },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.biologyAnalyteNabmJournal.create.mock.calls[0][0].data).toEqual({
      analyteCode: 'BIO_FERRITINE',
      acte: 'signature',
      codeActe: '1208',
      nature: 'isole',
      millesime: 'V105',
      praticienEmail: PRATICIEN,
    });
    const data = prisma.biologyAnalyteNabm.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ analyteCode: 'BIO_FERRITINE', codeActe: '1208', nature: 'isole', verifiePar: PRATICIEN });
    // Les verrous passent avant toute lecture : import NABM, puis analyte.
    const sql = prisma.$executeRaw.mock.calls.map(c => (c[0] as TemplateStringsArray).join('?'));
    expect(sql).toEqual([
      "SET LOCAL lock_timeout = '3s'",
      'LOCK TABLE biology_catalog_versions_courantes IN SHARE MODE',
      'SELECT public.biology_analyte_nabm_verrouiller(?)',
    ]);
    expect(prisma.$executeRaw.mock.calls[2][1]).toBe('BIO_FERRITINE');
    // READ COMMITTED explicite : la fonction de verrou refuse tout autre niveau.
    expect(prisma.$transaction.mock.calls[0][1]).toEqual({ isolationLevel: 'ReadCommitted' });
    const ordre = (f: { mock: { invocationCallOrder: number[] } }) => f.mock.invocationCallOrder[0];
    expect(ordre(prisma.$executeRaw)).toBeLessThan(ordre(prisma.biologyAnalyte.findUnique));
    expect(ordre(prisma.biologyAnalyteNabmJournal.create)).toBeLessThan(ordre(prisma.biologyAnalyteNabm.create));
  });

  it.each([
    ['code SQLSTATE sur l’erreur', Object.assign(new Error('échec'), { code: '55P03' })],
    ['code dans la cause (adaptateur)', Object.assign(new Error('échec'), { cause: { code: '55P03' } })],
    ['message de PostgreSQL', new Error('canceling statement due to lock timeout')],
  ])('attente du verrou d’un import épuisée (%s) : import_en_cours, rien n’est écrit', async (_cas, erreur) => {
    prisma.$executeRaw.mockImplementation(async (sql: TemplateStringsArray) => {
      if (sql.join('?').startsWith('LOCK TABLE')) throw erreur;
      return 0;
    });
    expect(await deciderCorrespondance(SIGNER)).toEqual({ ok: false, raison: 'import_en_cours' });
    expect(prisma.biologyAnalyteNabmJournal.create).not.toHaveBeenCalled();
  });

  it('attente du verrou de l’ANALYTE épuisée (autre geste en cours) : etat_divergent, pas import_en_cours', async () => {
    prisma.$executeRaw.mockImplementation(async (sql: TemplateStringsArray) => {
      if (sql.join('?').includes('biology_analyte_nabm_verrouiller')) {
        throw Object.assign(new Error('échec'), { code: '55P03' });
      }
      return 0;
    });
    expect(await deciderCorrespondance(SIGNER)).toEqual({ ok: false, raison: 'etat_divergent' });
    expect(prisma.biologyAnalyteNabmJournal.create).not.toHaveBeenCalled();
  });

  it('rend la date RELUE en base, pas celle du serveur', async () => {
    const resultat = await deciderCorrespondance(SIGNER);
    expect(resultat.ok && resultat.correspondance.verifieLe).toBe(DATE_BASE.toISOString());
    expect(prisma.biologyAnalyteNabm.findUniqueOrThrow.mock.calls[0][0].where).toEqual({
      analyteCode_codeActe: { analyteCode: 'BIO_FERRITINE', codeActe: '1208' },
    });
  });

  it('couple déjà présent : etat_divergent, transaction annulée, aucun journal', async () => {
    prisma.biologyAnalyteNabm.findUnique.mockResolvedValue({ verifiePar: null });
    expect(await deciderCorrespondance(SIGNER)).toEqual({ ok: false, raison: 'etat_divergent' });
    expect(transactions.annulees).toBe(1);
    expect(prisma.biologyAnalyteNabmJournal.create).not.toHaveBeenCalled();
    expect(prisma.biologyAnalyteNabm.create).not.toHaveBeenCalled();
  });

  it('une erreur de base remonte, elle n’est pas maquillée en refus', async () => {
    prisma.biologyAnalyteNabm.create.mockRejectedValue(Object.assign(new Error('panne'), { code: 'P1001' }));
    await expect(deciderCorrespondance(SIGNER)).rejects.toThrow('panne');
    expect(transactions.annulees).toBe(1);
  });

  it('l’écriture du journal échoue : la transaction est annulée, la signature ne s’écrit pas', async () => {
    prisma.biologyAnalyteNabmJournal.create.mockRejectedValue(new Error('journal refusé'));
    await expect(deciderCorrespondance(SIGNER)).rejects.toThrow('journal refusé');
    expect(transactions.annulees).toBe(1);
    expect(prisma.biologyAnalyteNabm.create).not.toHaveBeenCalled();
  });

  it('depuis « proposition » : n’écrit que sur une ligne NON signée', async () => {
    prisma.biologyAnalyteNabm.findUnique.mockResolvedValue({ verifiePar: null });
    const resultat = await deciderCorrespondance({ ...SIGNER, etatAttendu: 'proposition', nature: 'groupe_et' });
    expect(resultat.ok).toBe(true);
    const appel = prisma.biologyAnalyteNabm.updateMany.mock.calls[0][0];
    expect(appel.where).toEqual({ analyteCode: 'BIO_FERRITINE', codeActe: '1208', verifiePar: null });
    expect(appel.data).toMatchObject({ nature: 'groupe_et', verifiePar: PRATICIEN });
    // Signataire sans date : le CHECK de signature refuserait la ligne.
    expect(appel.data.verifieLe).toBeInstanceOf(Date);
    expect(prisma.biologyAnalyteNabm.create).not.toHaveBeenCalled();
  });

  it('proposition déjà signée ailleurs : etat_divergent, aucun journal', async () => {
    prisma.biologyAnalyteNabm.findUnique.mockResolvedValue({ verifiePar: 'autre@wellneuro.fr' });
    expect(await deciderCorrespondance({ ...SIGNER, etatAttendu: 'proposition' })).toEqual({
      ok: false,
      raison: 'etat_divergent',
    });
    expect(prisma.biologyAnalyteNabmJournal.create).not.toHaveBeenCalled();
  });

  it('proposition signée entre la relecture et l’écriture (0 ligne touchée) : transaction ANNULÉE, journal compris (N-3 a)', async () => {
    prisma.biologyAnalyteNabm.findUnique.mockResolvedValue({ verifiePar: null });
    prisma.biologyAnalyteNabm.updateMany.mockResolvedValue({ count: 0 });
    expect(await deciderCorrespondance({ ...SIGNER, etatAttendu: 'proposition' })).toEqual({
      ok: false,
      raison: 'etat_divergent',
    });
    expect(transactions.annulees).toBe(1);
  });

  it('signer depuis « signee » : transition invalide, rien n’est lu ni écrit', async () => {
    expect(await deciderCorrespondance({ ...SIGNER, etatAttendu: 'signee' })).toEqual({
      ok: false,
      raison: 'transition_invalide',
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('nature absente ou hors des trois : refusée', async () => {
    for (const nature of [undefined, '', 'groupe', 'ISOLE']) {
      expect(await deciderCorrespondance({ ...SIGNER, nature })).toEqual({
        ok: false,
        raison: 'nature_requise',
      });
    }
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it.each([
    ['analyte inconnu', () => prisma.biologyAnalyte.findUnique.mockResolvedValue(null), 'analyte_inconnu'],
    ['analyte inactif', () => prisma.biologyAnalyte.findUnique.mockResolvedValue({ actif: false, constatNabm: null }), 'analyte_inactif'],
    [
      'analyte qui porte un constat « aucun acte »',
      () => prisma.biologyAnalyte.findUnique.mockResolvedValue({ actif: true, constatNabm: { id: 'k' } }),
      'constat_present',
    ],
    ['nomenclature non importée', () => prisma.biologyCatalogVersionCourante.findUnique.mockResolvedValue(null), 'millesime_absent'],
    ['acte absent du millésime courant', () => prisma.biologyNabmActe.findUnique.mockResolvedValue(null), 'acte_introuvable'],
    ['acte inactif', () => prisma.biologyNabmActe.findUnique.mockResolvedValue(acte({ inactif: true })), 'acte_inactif'],
  ])('%s : refusé, rien n’est écrit', async (_cas, preparer, raison) => {
    preparer();
    expect(await deciderCorrespondance(SIGNER)).toEqual({ ok: false, raison });
    expect(prisma.biologyAnalyteNabmJournal.create).not.toHaveBeenCalled();
    expect(prisma.biologyAnalyteNabm.create).not.toHaveBeenCalled();
    expect(prisma.biologyAnalyteNabm.updateMany).not.toHaveBeenCalled();
  });
});

describe('deciderCorrespondance — retirer', () => {
  const VUE = new Date('2026-10-15T10:00:00.000Z');
  const RETIRER = {
    ...SIGNER,
    decision: 'retirer' as const,
    etatAttendu: 'signee' as const,
    nature: undefined,
    verifieLeVu: VUE,
  };
  const SIGNATURE_VUE = { nature: 'groupe_ou', verifiePar: 'signataire@wellneuro.fr', verifieLe: VUE };

  beforeEach(() => {
    prisma.biologyAnalyteNabm.findFirst.mockResolvedValue(SIGNATURE_VUE);
  });

  it('journal qui recopie la signature effacée, puis effacement de la signature VUE, sans suppression', async () => {
    const resultat = await deciderCorrespondance(RETIRER);
    expect(resultat).toEqual({
      ok: true,
      correspondance: { codeActe: '1208', etat: 'proposition', verifiePar: null, verifieLe: null },
    });
    const vue = { analyteCode: 'BIO_FERRITINE', codeActe: '1208', verifiePar: { not: null }, verifieLe: VUE };
    expect(prisma.biologyAnalyteNabm.findFirst.mock.calls[0][0].where).toEqual(vue);
    expect(prisma.biologyAnalyteNabmJournal.create.mock.calls[0][0].data).toEqual({
      analyteCode: 'BIO_FERRITINE',
      acte: 'retrait_signature',
      codeActe: '1208',
      nature: 'groupe_ou',
      praticienEmail: PRATICIEN,
      effacePar: 'signataire@wellneuro.fr',
      effaceLe: VUE,
    });
    const appel = prisma.biologyAnalyteNabm.updateMany.mock.calls[0][0];
    expect(appel.where).toEqual(vue);
    expect(appel.data).toEqual({ verifiePar: null, verifieLe: null });
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(3);
  });

  it('sans la date de la signature vue : transition invalide, rien n’est écrit', async () => {
    expect(await deciderCorrespondance({ ...RETIRER, verifieLeVu: undefined })).toEqual({
      ok: false,
      raison: 'transition_invalide',
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('signature vue introuvable (retirée, ou signée de nouveau) : etat_divergent, aucun journal', async () => {
    prisma.biologyAnalyteNabm.findFirst.mockResolvedValue(null);
    expect(await deciderCorrespondance(RETIRER)).toEqual({ ok: false, raison: 'etat_divergent' });
    expect(prisma.biologyAnalyteNabmJournal.create).not.toHaveBeenCalled();
    expect(prisma.biologyAnalyteNabm.updateMany).not.toHaveBeenCalled();
  });

  it('signature retirée entre la relecture et l’écriture (0 ligne touchée) : transaction ANNULÉE (N-3 a)', async () => {
    prisma.biologyAnalyteNabm.updateMany.mockResolvedValue({ count: 0 });
    expect(await deciderCorrespondance(RETIRER)).toEqual({ ok: false, raison: 'etat_divergent' });
    expect(prisma.biologyAnalyteNabmJournal.create).toHaveBeenCalledTimes(1);
    expect(transactions.annulees).toBe(1);
  });

  it.each(['absente', 'proposition'] as const)('retirer depuis « %s » : transition invalide', async etatAttendu => {
    expect(await deciderCorrespondance({ ...RETIRER, etatAttendu })).toEqual({
      ok: false,
      raison: 'transition_invalide',
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('lireCorrespondancesAnalyte — constat « aucun acte » (M-3c)', () => {
  const le = new Date('2026-10-16T09:00:00Z');
  const avecConstat = (millesime: string) =>
    prisma.biologyAnalyte.findUnique.mockResolvedValue({
      code: 'BIO_HOMOCYSTEINE',
      actif: true,
      correspondancesNabm: [],
      constatNabm: { millesime, verifiePar: PRATICIEN, verifieLe: le },
    });

  it('rend le constat du millésime courant, non périmé', async () => {
    avecConstat('V105');
    const resultat = await lireCorrespondancesAnalyte('BIO_HOMOCYSTEINE');
    expect(resultat.ok && resultat.constat).toEqual({
      millesime: 'V105',
      verifiePar: PRATICIEN,
      verifieLe: le.toISOString(),
      perime: false,
    });
  });

  it('constat d’un autre millésime : périmé', async () => {
    avecConstat('V104');
    const resultat = await lireCorrespondancesAnalyte('BIO_HOMOCYSTEINE');
    expect(resultat.ok && resultat.constat?.perime).toBe(true);
  });

  it('sans nomenclature importée : périmé (il ne vaut pas)', async () => {
    avecConstat('V105');
    prisma.biologyCatalogVersionCourante.findUnique.mockResolvedValue(null);
    const resultat = await lireCorrespondancesAnalyte('BIO_HOMOCYSTEINE');
    expect(resultat.ok && resultat.constat?.perime).toBe(true);
  });

  it('sans constat : null', async () => {
    prisma.biologyAnalyte.findUnique.mockResolvedValue({
      code: 'BIO_HOMOCYSTEINE',
      actif: true,
      correspondancesNabm: [],
      constatNabm: null,
    });
    const resultat = await lireCorrespondancesAnalyte('BIO_HOMOCYSTEINE');
    expect(resultat.ok && resultat.constat).toBeNull();
  });
});

describe('deciderConstat — constater', () => {
  const CONSTATER = {
    analyteCode: 'BIO_HOMOCYSTEINE',
    decision: 'constater' as const,
    millesimeVu: 'V105',
    praticien: PRATICIEN,
  };

  beforeEach(() => {
    prisma.biologyAnalyte.findUnique.mockResolvedValue({ actif: true, constatNabm: null, correspondancesNabm: [] });
  });

  it('journal puis constat, dans UNE transaction ; la date rendue est celle RELUE en base', async () => {
    const resultat = await deciderConstat(CONSTATER);
    expect(resultat).toEqual({
      ok: true,
      constat: { millesime: 'V105', verifiePar: PRATICIEN, verifieLe: DATE_BASE.toISOString(), perime: false },
    });
    expect(prisma.biologyAnalyteNabmJournal.create.mock.calls[0][0].data).toEqual({
      analyteCode: 'BIO_HOMOCYSTEINE',
      acte: 'constat_aucun_acte',
      millesime: 'V105',
      praticienEmail: PRATICIEN,
    });
    expect(prisma.biologyAnalyteNabmConstat.create.mock.calls[0][0].data).toEqual({
      analyteCode: 'BIO_HOMOCYSTEINE',
      millesime: 'V105',
      verifiePar: PRATICIEN,
    });
    expect(prisma.$executeRaw.mock.calls[2][1]).toBe('BIO_HOMOCYSTEINE');
    expect(prisma.$transaction.mock.calls[0][1]).toEqual({ isolationLevel: 'ReadCommitted' });
  });

  it('attente du verrou d’un import épuisée : import_en_cours, rien n’est écrit', async () => {
    prisma.$executeRaw.mockImplementation(async (sql: TemplateStringsArray) => {
      if (sql.join('?').startsWith('LOCK TABLE')) throw Object.assign(new Error('échec'), { code: '55P03' });
      return 0;
    });
    expect(await deciderConstat(CONSTATER)).toEqual({ ok: false, raison: 'import_en_cours' });
    expect(prisma.biologyAnalyteNabmJournal.create).not.toHaveBeenCalled();
    expect(prisma.biologyAnalyteNabmConstat.create).not.toHaveBeenCalled();
  });

  it.each([
    ['analyte à candidat (libellé explicite)', 'BIO_FERRITINE'],
    ['valeur calculée', 'BIO_RATIO_HOMA'],
    ['analyte hors de la liste', 'BIO_HORS_LISTE'],
  ])('%s : constat_non_permis, sans transaction', async (_cas, analyteCode) => {
    expect(await deciderConstat({ ...CONSTATER, analyteCode })).toEqual({ ok: false, raison: 'constat_non_permis' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it.each([
    ['analyte inconnu', () => prisma.biologyAnalyte.findUnique.mockResolvedValue(null), 'analyte_inconnu'],
    [
      'analyte inactif',
      () => prisma.biologyAnalyte.findUnique.mockResolvedValue({ actif: false, constatNabm: null, correspondancesNabm: [] }),
      'analyte_inactif',
    ],
    [
      'correspondance signée présente',
      () =>
        prisma.biologyAnalyte.findUnique.mockResolvedValue({
          actif: true,
          constatNabm: null,
          correspondancesNabm: [{ id: 'c' }],
        }),
      'signature_presente',
    ],
    [
      'constat déjà posé',
      () =>
        prisma.biologyAnalyte.findUnique.mockResolvedValue({ actif: true, constatNabm: { id: 'k' }, correspondancesNabm: [] }),
      'etat_divergent',
    ],
    ['nomenclature non importée', () => prisma.biologyCatalogVersionCourante.findUnique.mockResolvedValue(null), 'millesime_absent'],
    [
      'millésime changé depuis l’affichage',
      () => prisma.biologyCatalogVersionCourante.findUnique.mockResolvedValue({ versionSource: 'V106' }),
      'etat_divergent',
    ],
  ])('%s : refusé, transaction annulée, rien n’est écrit', async (_cas, preparer, raison) => {
    preparer();
    expect(await deciderConstat(CONSTATER)).toEqual({ ok: false, raison });
    expect(transactions.annulees).toBe(1);
    expect(prisma.biologyAnalyteNabmJournal.create).not.toHaveBeenCalled();
    expect(prisma.biologyAnalyteNabmConstat.create).not.toHaveBeenCalled();
  });

  it('la recherche d’une signature ne lit que les lignes SIGNÉES', async () => {
    await deciderConstat(CONSTATER);
    expect(prisma.biologyAnalyte.findUnique.mock.calls[0][0].select.correspondancesNabm.where).toEqual({
      verifiePar: { not: null },
    });
  });

  it('sans millésime vu : etat_divergent, sans transaction', async () => {
    expect(await deciderConstat({ ...CONSTATER, millesimeVu: undefined })).toEqual({
      ok: false,
      raison: 'etat_divergent',
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('deciderConstat — retirer', () => {
  const VU = new Date('2026-10-16T09:00:00.000Z');
  const RETIRER = { analyteCode: 'BIO_HOMOCYSTEINE', decision: 'retirer' as const, verifieLeVu: VU, praticien: PRATICIEN };

  beforeEach(() => {
    prisma.biologyAnalyteNabmConstat.findFirst.mockResolvedValue({
      millesime: 'V104',
      verifiePar: 'signataire@wellneuro.fr',
      verifieLe: VU,
    });
  });

  it('journal qui recopie le constat effacé, puis suppression du constat VU — périmé compris', async () => {
    expect(await deciderConstat(RETIRER)).toEqual({ ok: true, constat: null });
    expect(prisma.biologyAnalyteNabmConstat.findFirst.mock.calls[0][0].where).toEqual({
      analyteCode: 'BIO_HOMOCYSTEINE',
      verifieLe: VU,
    });
    expect(prisma.biologyAnalyteNabmJournal.create.mock.calls[0][0].data).toEqual({
      analyteCode: 'BIO_HOMOCYSTEINE',
      acte: 'retrait_constat',
      millesime: 'V104',
      praticienEmail: PRATICIEN,
      effacePar: 'signataire@wellneuro.fr',
      effaceLe: VU,
    });
    expect(prisma.biologyAnalyteNabmConstat.deleteMany.mock.calls[0][0].where).toEqual({
      analyteCode: 'BIO_HOMOCYSTEINE',
      verifieLe: VU,
    });
  });

  it('constat vu introuvable : etat_divergent, aucun journal', async () => {
    prisma.biologyAnalyteNabmConstat.findFirst.mockResolvedValue(null);
    expect(await deciderConstat(RETIRER)).toEqual({ ok: false, raison: 'etat_divergent' });
    expect(prisma.biologyAnalyteNabmJournal.create).not.toHaveBeenCalled();
  });

  it('constat retiré entre la relecture et l’écriture (0 ligne) : transaction ANNULÉE', async () => {
    prisma.biologyAnalyteNabmConstat.deleteMany.mockResolvedValue({ count: 0 });
    expect(await deciderConstat(RETIRER)).toEqual({ ok: false, raison: 'etat_divergent' });
    expect(transactions.annulees).toBe(1);
  });

  it('sans la date du constat vu : etat_divergent, sans transaction', async () => {
    expect(await deciderConstat({ ...RETIRER, verifieLeVu: undefined })).toEqual({ ok: false, raison: 'etat_divergent' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
