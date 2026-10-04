import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// [[D-262]], LOT-03a — ce que le portail sert du courrier remis. Données
// synthétiques ; la base est simulée, la règle d'état ne l'est pas.

const { prisma } = vi.hoisted(() => ({
  prisma: {
    lettreAdressageRemise: { findFirst: vi.fn(), findUnique: vi.fn() },
    adressageSignalAlerte: { findFirst: vi.fn() },
    patient: { findUnique: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { aUneLettreRemise, lettreALire, lettreImprimable, lettreRemiseAuPatient } from './lettreServicePatient';

const TEXTE = 'Docteur, je vous adresse Michel Dogné.';
const REMISE = {
  id: 'lar_1',
  remiseLe: new Date('2026-10-04T08:00:00.000Z'),
  texte: TEXTE,
  texteSha256: createHash('sha256').update(TEXTE, 'utf8').digest('hex'),
  idCorrespondance: 'lettre_1',
};

beforeEach(() => {
  vi.clearAllMocks();
  prisma.lettreAdressageRemise.findFirst.mockResolvedValue(REMISE);
  prisma.adressageSignalAlerte.findFirst.mockResolvedValue({ id: 'cov_1' });
});

describe('Courrier servi au patient (D-262, LOT-03a)', () => {
  it('sert la remise la plus récente, texte compris, et relit la couverture de SA lettre', async () => {
    expect(await lettreRemiseAuPatient('PAT_1')).toEqual({
      idRemise: 'lar_1', remiseLe: '2026-10-04T08:00:00.000Z', etat: 'servie', texte: TEXTE,
    });
    expect(prisma.lettreAdressageRemise.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { idPatient: 'PAT_1' }, orderBy: { ordre: 'desc' },
    }));
    expect(prisma.adressageSignalAlerte.findFirst).toHaveBeenCalledWith({
      where: { idPatient: 'PAT_1', idCorrespondance: 'lettre_1', acte: 'adressage', revocations: { none: {} } },
      select: { id: true },
    });
  });

  it('aucune remise : `null`, et rien d’autre n’est lu', async () => {
    prisma.lettreAdressageRemise.findFirst.mockResolvedValue(null);
    expect(await lettreRemiseAuPatient('PAT_1')).toBeNull();
    expect(prisma.adressageSignalAlerte.findFirst).not.toHaveBeenCalled();
  });

  it('lettre révoquée après remise : « retirée », sans texte ni motif', async () => {
    prisma.adressageSignalAlerte.findFirst.mockResolvedValue(null);
    expect(await lettreRemiseAuPatient('PAT_1')).toEqual(expect.objectContaining({ etat: 'retiree', texte: null }));
  });

  it('empreinte qui ne correspond plus : « indisponible », sans texte', async () => {
    prisma.lettreAdressageRemise.findFirst.mockResolvedValue({ ...REMISE, texteSha256: '0'.repeat(64) });
    expect(await lettreRemiseAuPatient('PAT_1')).toEqual(expect.objectContaining({ etat: 'indisponible', texte: null }));
  });

  it('le fil n’annonce que la lettre servie', async () => {
    expect(await lettreALire('PAT_1')).toEqual([{ id: 'lar_1', remiseLe: REMISE.remiseLe }]);
    prisma.adressageSignalAlerte.findFirst.mockResolvedValue(null);
    expect(await lettreALire('PAT_1')).toEqual([]);
  });

  it('le lien de l’accueil ne lit aucun texte', async () => {
    prisma.lettreAdressageRemise.findFirst.mockResolvedValue({ id: 'lar_1' });
    expect(await aUneLettreRemise('PAT_1')).toBe(true);
    expect(prisma.lettreAdressageRemise.findFirst).toHaveBeenCalledWith({ where: { idPatient: 'PAT_1' }, select: { id: true } });
    prisma.lettreAdressageRemise.findFirst.mockResolvedValue(null);
    expect(await aUneLettreRemise('PAT_1')).toBe(false);
  });

  it('LOT-03b — la version à imprimer : le texte figé, par le rendu médecin, avec le nom du patient', async () => {
    prisma.lettreAdressageRemise.findUnique.mockResolvedValue({
      correspondance: { consigneLe: new Date('2026-10-03T08:00:00.000Z'), ancrageSha256: 'a'.repeat(64), ancrageVersion: 'safety-signals-nnpp2-v1' },
    });
    prisma.patient.findUnique.mockResolvedValue({ prenom: 'Michel', nom: 'Dogné' });
    const html = await lettreImprimable('PAT_1');
    expect(html).toContain('Michel Dogné');
    expect(html).toContain('je vous adresse Michel Dogné.');
    expect(prisma.lettreAdressageRemise.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'lar_1' } }));
  });

  it('LOT-03b — retirée : rien à imprimer, rien d’autre n’est lu', async () => {
    prisma.adressageSignalAlerte.findFirst.mockResolvedValue(null);
    expect(await lettreImprimable('PAT_1')).toBeNull();
    expect(prisma.lettreAdressageRemise.findUnique).not.toHaveBeenCalled();
  });

  it('LOT-03b — indisponible : rien à imprimer', async () => {
    prisma.lettreAdressageRemise.findFirst.mockResolvedValue({ ...REMISE, texteSha256: '0'.repeat(64) });
    expect(await lettreImprimable('PAT_1')).toBeNull();
    expect(prisma.lettreAdressageRemise.findUnique).not.toHaveBeenCalled();
  });
});
