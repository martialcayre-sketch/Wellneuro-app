import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// [[D-345]], J3-12h lot 4 — ce que le portail sert des courriers complément
// remis ([[D-362]] §2 : TOUTES les remises). Données synthétiques ; la base est
// simulée, la règle d'état et le rendu ne le sont pas.

const { prisma } = vi.hoisted(() => ({
  prisma: {
    courrierComplementRemise: { findMany: vi.fn(), findFirst: vi.fn() },
    patient: { findUnique: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));

import {
  aUnCourrierComplementRemis,
  courrierComplementALire,
  courrierComplementImprimable,
  courriersComplementRemisAuPatient,
} from './courrierComplementServicePatient';

const sha = (texte: string) => createHash('sha256').update(texte, 'utf8').digest('hex');
const CORRESPONDANCE = {
  medecinLibelle: 'Médecin traitant',
  consigneLe: new Date('2026-10-24T08:00:00.000Z'),
  ancrageSha256: 'a'.repeat(64),
  ancrageVersion: `complement-cible-${'a'.repeat(64)}`,
};
function remise(id: string, texte: string, remiseLe: string, extra: Record<string, unknown> = {}) {
  return { id, remiseLe: new Date(remiseLe), texte, texteSha256: sha(texte), correspondance: CORRESPONDANCE, ...extra };
}
// Le scénario de la revue (P1-1) : R1 couvre {X, Y}, R2 couvre {Y, Z} ; une
// version {X} est couverte par R1 seule. Les deux doivent rester servies.
const R2 = remise('ccr_2', 'Docteur,\n\n- Y.\n- Z.', '2026-10-25T08:00:00.000Z');
const R1 = remise('ccr_1', 'Docteur,\n\n- X.\n- Y.', '2026-10-20T08:00:00.000Z');

beforeEach(() => {
  vi.clearAllMocks();
  prisma.courrierComplementRemise.findMany.mockResolvedValue([R2, R1]);
  prisma.courrierComplementRemise.findFirst.mockResolvedValue(R1);
  prisma.patient.findUnique.mockResolvedValue({ prenom: 'Jennifer', nom: 'Martin' });
});

describe('Courriers complément servis au patient (D-345, J3-12h lot 4)', () => {
  it('sert TOUTES les remises, la plus récente en tête : le courrier qui couvre les compléments en cours reste visible', async () => {
    const courriers = await courriersComplementRemisAuPatient('PAT_1');
    expect(courriers.map(c => c.idRemise)).toEqual(['ccr_2', 'ccr_1']);
    expect(courriers[1]).toEqual({
      idRemise: 'ccr_1',
      remiseLe: '2026-10-20T08:00:00.000Z',
      etat: 'servie',
      texte: R1.texte,
      destinataire: 'Médecin traitant',
      imprimable: true,
    });
    expect(prisma.courrierComplementRemise.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { idPatient: 'PAT_1' }, orderBy: { ordre: 'desc' },
    }));
  });

  it('ne sélectionne ni la liste couverte, ni l’approbation, ni l’identifiant du courrier consigné', async () => {
    await courriersComplementRemisAuPatient('PAT_1');
    const { select } = prisma.courrierComplementRemise.findMany.mock.calls[0][0];
    expect(Object.keys(select).sort()).toEqual(['correspondance', 'id', 'remiseLe', 'texte', 'texteSha256']);
    expect(Object.keys(select.correspondance.select).sort())
      .toEqual(['ancrageSha256', 'ancrageVersion', 'consigneLe', 'medecinLibelle']);
  });

  it('aucune remise : une liste vide', async () => {
    prisma.courrierComplementRemise.findMany.mockResolvedValue([]);
    expect(await courriersComplementRemisAuPatient('PAT_1')).toEqual([]);
  });

  it('empreinte qui ne correspond plus : « indisponible », sans texte, destinataire ni impression — les autres restent servies', async () => {
    prisma.courrierComplementRemise.findMany.mockResolvedValue([{ ...R2, texteSha256: '0'.repeat(64) }, R1]);
    const [r2, r1] = await courriersComplementRemisAuPatient('PAT_1');
    expect(r2).toEqual(expect.objectContaining({ etat: 'indisponible', texte: null, destinataire: null, imprimable: false }));
    expect(r1.etat).toBe('servie');
  });

  it('servi mais pas imprimable : un ancrage étranger, ou un terme prescriptif dans le texte figé', async () => {
    prisma.courrierComplementRemise.findMany.mockResolvedValue([
      remise('ccr_a', 'Docteur, ancrage.', '2026-10-25T08:00:00.000Z', {
        correspondance: { ...CORRESPONDANCE, ancrageVersion: 'safety-signals-nnpp2-v1' },
      }),
      remise('ccr_p', 'Docteur,\nPosologie : deux gélules.', '2026-10-24T08:00:00.000Z'),
    ]);
    const courriers = await courriersComplementRemisAuPatient('PAT_1');
    expect(courriers.map(c => [c.etat, c.imprimable])).toEqual([['servie', false], ['servie', false]]);
  });

  it('le fil annonce chaque courrier servi, et lui seul', async () => {
    expect(await courrierComplementALire('PAT_1')).toEqual([
      { id: 'ccr_2', remiseLe: R2.remiseLe },
      { id: 'ccr_1', remiseLe: R1.remiseLe },
    ]);
    prisma.courrierComplementRemise.findMany.mockResolvedValue([{ ...R2, texteSha256: '0'.repeat(64) }, R1]);
    expect(await courrierComplementALire('PAT_1')).toEqual([{ id: 'ccr_1', remiseLe: R1.remiseLe }]);
  });

  it('le lien de l’accueil ne lit aucun texte', async () => {
    prisma.courrierComplementRemise.findFirst.mockResolvedValue({ id: 'ccr_1' });
    expect(await aUnCourrierComplementRemis('PAT_1')).toBe(true);
    expect(prisma.courrierComplementRemise.findFirst).toHaveBeenCalledWith({ where: { idPatient: 'PAT_1' }, select: { id: true } });
    prisma.courrierComplementRemise.findFirst.mockResolvedValue(null);
    expect(await aUnCourrierComplementRemis('PAT_1')).toBe(false);
  });

  it('la version à imprimer : LA remise désignée, cherchée dans CE dossier, texte figé, balises échappées', async () => {
    prisma.patient.findUnique.mockResolvedValue({ prenom: '<script>x</script>', nom: 'Martin' });
    prisma.courrierComplementRemise.findFirst.mockResolvedValue(
      remise('ccr_1', 'Docteur,\n- X <script>y</script>.', '2026-10-20T08:00:00.000Z'),
    );
    const html = await courrierComplementImprimable('PAT_1', 'ccr_1');
    expect(prisma.courrierComplementRemise.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'ccr_1', idPatient: 'PAT_1' },
    }));
    expect(html).toContain('Martin');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('impression : une remise d’un autre dossier (ou inconnue) ne rend rien', async () => {
    prisma.courrierComplementRemise.findFirst.mockResolvedValue(null);
    expect(await courrierComplementImprimable('PAT_1', 'ccr_autre')).toBeNull();
  });

  it('impression : une remise indisponible, ou dont le rendu est refusé, ne rend rien', async () => {
    prisma.courrierComplementRemise.findFirst.mockResolvedValue({ ...R1, texteSha256: '0'.repeat(64) });
    expect(await courrierComplementImprimable('PAT_1', 'ccr_1')).toBeNull();
    prisma.courrierComplementRemise.findFirst.mockResolvedValue({
      ...R1, correspondance: { ...CORRESPONDANCE, ancrageVersion: 'safety-signals-nnpp2-v1' },
    });
    expect(await courrierComplementImprimable('PAT_1', 'ccr_1')).toBeNull();
  });
});
