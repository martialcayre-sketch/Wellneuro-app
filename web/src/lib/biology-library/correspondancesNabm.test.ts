import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    biologyAnalyte: { findUnique: vi.fn() },
    biologyCatalogVersionCourante: { findUnique: vi.fn() },
    biologyNabmActe: { findUnique: vi.fn(), findMany: vi.fn() },
    biologyAnalyteNabm: { create: vi.fn(), updateMany: vi.fn() },
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma }));

import {
  chercherActeNabm,
  deciderCorrespondance,
  lireCorrespondancesAnalyte,
} from './correspondancesNabm';

const PRATICIEN = 'praticien@wellneuro.fr';

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
  prisma.biologyAnalyte.findUnique.mockResolvedValue({ actif: true });
  prisma.biologyNabmActe.findUnique.mockResolvedValue(acte());
  prisma.biologyNabmActe.findMany.mockResolvedValue([]);
  prisma.biologyAnalyteNabm.create.mockResolvedValue({ id: 'x' });
  prisma.biologyAnalyteNabm.updateMany.mockResolvedValue({ count: 1 });
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
  it('depuis « absente » : crée la ligne signée, signataire et date posés par le serveur', async () => {
    const avant = Date.now();
    const resultat = await deciderCorrespondance(SIGNER);
    expect(resultat.ok).toBe(true);
    const data = prisma.biologyAnalyteNabm.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      analyteCode: 'BIO_FERRITINE',
      codeActe: '1208',
      nature: 'isole',
      verifiePar: PRATICIEN,
    });
    expect(data.verifieLe).toBeInstanceOf(Date);
    expect(data.verifieLe.getTime()).toBeGreaterThanOrEqual(avant);
  });

  it('couple déjà présent (P2002) : etat_divergent, aucune autre écriture', async () => {
    prisma.biologyAnalyteNabm.create.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }));
    expect(await deciderCorrespondance(SIGNER)).toEqual({ ok: false, raison: 'etat_divergent' });
    expect(prisma.biologyAnalyteNabm.updateMany).not.toHaveBeenCalled();
  });

  it('une autre erreur de base remonte, elle n’est pas maquillée en état divergent', async () => {
    prisma.biologyAnalyteNabm.create.mockRejectedValue(Object.assign(new Error('panne'), { code: 'P1001' }));
    await expect(deciderCorrespondance(SIGNER)).rejects.toThrow('panne');
  });

  it('depuis « proposition » : n’écrit que sur une ligne NON signée', async () => {
    const resultat = await deciderCorrespondance({ ...SIGNER, etatAttendu: 'proposition', nature: 'groupe_et' });
    expect(resultat.ok).toBe(true);
    const appel = prisma.biologyAnalyteNabm.updateMany.mock.calls[0][0];
    expect(appel.where).toEqual({ analyteCode: 'BIO_FERRITINE', codeActe: '1208', verifiePar: null });
    expect(appel.data).toMatchObject({ nature: 'groupe_et', verifiePar: PRATICIEN });
    // Signataire sans date : le CHECK de signature refuserait la ligne.
    expect(appel.data.verifieLe).toBeInstanceOf(Date);
    expect(prisma.biologyAnalyteNabm.create).not.toHaveBeenCalled();
  });

  it('proposition déjà signée ailleurs (0 ligne touchée) : etat_divergent', async () => {
    prisma.biologyAnalyteNabm.updateMany.mockResolvedValue({ count: 0 });
    expect(await deciderCorrespondance({ ...SIGNER, etatAttendu: 'proposition' })).toEqual({
      ok: false,
      raison: 'etat_divergent',
    });
  });

  it('signer depuis « signee » : transition invalide, rien n’est lu ni écrit', async () => {
    expect(await deciderCorrespondance({ ...SIGNER, etatAttendu: 'signee' })).toEqual({
      ok: false,
      raison: 'transition_invalide',
    });
    expect(prisma.biologyAnalyte.findUnique).not.toHaveBeenCalled();
  });

  it('nature absente ou hors des trois : refusée', async () => {
    for (const nature of [undefined, '', 'groupe', 'ISOLE']) {
      expect(await deciderCorrespondance({ ...SIGNER, nature })).toEqual({
        ok: false,
        raison: 'nature_requise',
      });
    }
    expect(prisma.biologyAnalyteNabm.create).not.toHaveBeenCalled();
  });

  it.each([
    ['analyte inconnu', () => prisma.biologyAnalyte.findUnique.mockResolvedValue(null), 'analyte_inconnu'],
    ['analyte inactif', () => prisma.biologyAnalyte.findUnique.mockResolvedValue({ actif: false }), 'analyte_inactif'],
    ['nomenclature non importée', () => prisma.biologyCatalogVersionCourante.findUnique.mockResolvedValue(null), 'millesime_absent'],
    ['acte absent du millésime courant', () => prisma.biologyNabmActe.findUnique.mockResolvedValue(null), 'acte_introuvable'],
    ['acte inactif', () => prisma.biologyNabmActe.findUnique.mockResolvedValue(acte({ inactif: true })), 'acte_inactif'],
  ])('%s : refusé, rien n’est écrit', async (_cas, preparer, raison) => {
    preparer();
    expect(await deciderCorrespondance(SIGNER)).toEqual({ ok: false, raison });
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

  it('efface la signature VUE d’une ligne signée, sans la supprimer', async () => {
    const resultat = await deciderCorrespondance(RETIRER);
    expect(resultat).toEqual({
      ok: true,
      correspondance: { codeActe: '1208', etat: 'proposition', verifiePar: null, verifieLe: null },
    });
    const appel = prisma.biologyAnalyteNabm.updateMany.mock.calls[0][0];
    expect(appel.where).toEqual({
      analyteCode: 'BIO_FERRITINE',
      codeActe: '1208',
      verifiePar: { not: null },
      verifieLe: VUE,
    });
    expect(appel.data).toEqual({ verifiePar: null, verifieLe: null });
  });

  it('sans la date de la signature vue : transition invalide, rien n’est écrit', async () => {
    expect(await deciderCorrespondance({ ...RETIRER, verifieLeVu: undefined })).toEqual({
      ok: false,
      raison: 'transition_invalide',
    });
    expect(prisma.biologyAnalyteNabm.updateMany).not.toHaveBeenCalled();
  });

  it('ligne non signée, ou signée de nouveau depuis l’affichage (0 ligne touchée) : etat_divergent', async () => {
    prisma.biologyAnalyteNabm.updateMany.mockResolvedValue({ count: 0 });
    expect(await deciderCorrespondance(RETIRER)).toEqual({ ok: false, raison: 'etat_divergent' });
  });

  it.each(['absente', 'proposition'] as const)('retirer depuis « %s » : transition invalide', async etatAttendu => {
    expect(await deciderCorrespondance({ ...RETIRER, etatAttendu })).toEqual({
      ok: false,
      raison: 'transition_invalide',
    });
    expect(prisma.biologyAnalyteNabm.updateMany).not.toHaveBeenCalled();
  });
});
