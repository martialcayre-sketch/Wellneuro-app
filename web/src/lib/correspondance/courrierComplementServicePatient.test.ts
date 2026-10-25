import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// [[D-345]], J3-12h lot 4 — ce que le portail sert du courrier complément
// remis. Données synthétiques ; la base est simulée, la règle d'état ne l'est pas.

const { prisma } = vi.hoisted(() => ({
  prisma: {
    courrierComplementRemise: { findFirst: vi.fn(), findUnique: vi.fn() },
    patient: { findUnique: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));

import {
  aUnCourrierComplementRemis,
  courrierComplementALire,
  courrierComplementImprimable,
  courrierComplementRemisAuPatient,
} from './courrierComplementServicePatient';

const TEXTE = 'Docteur,\n\n- Magnésium bisglycinate.\n\nCourrier préparé le 2026-10-24.';
const sha = (texte: string) => createHash('sha256').update(texte, 'utf8').digest('hex');
const REMISE = {
  id: 'ccr_1',
  remiseLe: new Date('2026-10-25T08:00:00.000Z'),
  texte: TEXTE,
  texteSha256: sha(TEXTE),
  correspondance: { medecinLibelle: 'Médecin traitant' },
};
const CORRESPONDANCE = {
  consigneLe: new Date('2026-10-24T08:00:00.000Z'),
  ancrageSha256: 'a'.repeat(64),
  ancrageVersion: `complement-cible-${'a'.repeat(64)}`,
};

beforeEach(() => {
  vi.clearAllMocks();
  prisma.courrierComplementRemise.findFirst.mockResolvedValue(REMISE);
  prisma.courrierComplementRemise.findUnique.mockResolvedValue({ correspondance: CORRESPONDANCE });
  prisma.patient.findUnique.mockResolvedValue({ prenom: 'Jennifer', nom: 'Martin' });
});

describe('Courrier complément servi au patient (D-345, J3-12h lot 4)', () => {
  it('sert la remise la plus récente, texte et destinataire compris', async () => {
    expect(await courrierComplementRemisAuPatient('PAT_1')).toEqual({
      idRemise: 'ccr_1',
      remiseLe: '2026-10-25T08:00:00.000Z',
      etat: 'servie',
      texte: TEXTE,
      destinataire: 'Médecin traitant',
    });
    expect(prisma.courrierComplementRemise.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { idPatient: 'PAT_1' }, orderBy: { ordre: 'desc' },
    }));
  });

  it('ne sélectionne ni la liste couverte, ni l’approbation, ni le courrier consigné', async () => {
    await courrierComplementRemisAuPatient('PAT_1');
    const { select } = prisma.courrierComplementRemise.findFirst.mock.calls[0][0];
    expect(Object.keys(select).sort()).toEqual(['correspondance', 'id', 'remiseLe', 'texte', 'texteSha256']);
    expect(select.correspondance).toEqual({ select: { medecinLibelle: true } });
  });

  it('aucune remise : `null`', async () => {
    prisma.courrierComplementRemise.findFirst.mockResolvedValue(null);
    expect(await courrierComplementRemisAuPatient('PAT_1')).toBeNull();
  });

  it('empreinte qui ne correspond plus : « indisponible », sans texte ni destinataire', async () => {
    prisma.courrierComplementRemise.findFirst.mockResolvedValue({ ...REMISE, texteSha256: '0'.repeat(64) });
    expect(await courrierComplementRemisAuPatient('PAT_1')).toEqual(expect.objectContaining({
      etat: 'indisponible', texte: null, destinataire: null,
    }));
  });

  it('le fil n’annonce que le courrier servi', async () => {
    expect(await courrierComplementALire('PAT_1')).toEqual([{ id: 'ccr_1', remiseLe: REMISE.remiseLe }]);
    prisma.courrierComplementRemise.findFirst.mockResolvedValue({ ...REMISE, texteSha256: '0'.repeat(64) });
    expect(await courrierComplementALire('PAT_1')).toEqual([]);
  });

  it('le lien de l’accueil ne lit aucun texte', async () => {
    prisma.courrierComplementRemise.findFirst.mockResolvedValue({ id: 'ccr_1' });
    expect(await aUnCourrierComplementRemis('PAT_1')).toBe(true);
    expect(prisma.courrierComplementRemise.findFirst).toHaveBeenCalledWith({ where: { idPatient: 'PAT_1' }, select: { id: true } });
    prisma.courrierComplementRemise.findFirst.mockResolvedValue(null);
    expect(await aUnCourrierComplementRemis('PAT_1')).toBe(false);
  });

  it('la version à imprimer : le texte figé, par le rendu médecin, avec le nom du patient', async () => {
    const html = await courrierComplementImprimable('PAT_1');
    expect(html).toContain('Jennifer Martin');
    expect(html).toContain('Magnésium bisglycinate.');
    expect(prisma.courrierComplementRemise.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'ccr_1' } }));
  });

  it('indisponible : rien à imprimer, rien d’autre n’est lu', async () => {
    prisma.courrierComplementRemise.findFirst.mockResolvedValue({ ...REMISE, texteSha256: '0'.repeat(64) });
    expect(await courrierComplementImprimable('PAT_1')).toBeNull();
    expect(prisma.courrierComplementRemise.findUnique).not.toHaveBeenCalled();
  });

  it('un ancrage qui n’est pas celui du courrier complément : rien à imprimer (aucune provenance fabriquée)', async () => {
    prisma.courrierComplementRemise.findUnique.mockResolvedValue({
      correspondance: { ...CORRESPONDANCE, ancrageVersion: 'safety-signals-nnpp2-v1' },
    });
    expect(await courrierComplementImprimable('PAT_1')).toBeNull();
  });

  it('un terme prescriptif dans le texte figé : le chokepoint refuse, rien à imprimer', async () => {
    const texte = `${TEXTE}\nPosologie : deux gélules.`;
    prisma.courrierComplementRemise.findFirst.mockResolvedValue({ ...REMISE, texte, texteSha256: sha(texte) });
    expect(await courrierComplementImprimable('PAT_1')).toBeNull();
  });
});
