import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    ficheUsageVersion: { findMany: vi.fn(), findUnique: vi.fn() },
    ficheUsageLibelle: { findMany: vi.fn() },
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma }));

import type { ContexteControle } from './controle';
import { empreinteTexte } from './empreintes';
import { lireRayonFichesUsage, lireVersionFicheUsage } from './lecture';

// Structure et textes SYNTHÉTIQUES ([[D-251]] §4).
const S = 'c'.repeat(64);
const CONTEXTE: ContexteControle = {
  structure: {
    fiches: [
      { id: 'FU_SYNTH', question: 'QC_SYNTH', besoins: [2], nature: 'mesure_directe', usageDecisionnel: 'confirmer_hypothese', securiteAdmissibilite: false, statutUsage: 'etaye_valide', population: 'POP_SYNTH', hypotheses: ['HYP_SYNTH'], codesAnalyte: [], claims: [], rubriques: ['question', 'population'] },
    ],
    questions: ['QC_SYNTH'],
    hypotheses: ['HYP_SYNTH'],
    populations: ['POP_SYNTH'],
  },
  empreinte: S,
};
const CONTENU = { population: 'Population synthétique.', question: 'Question synthétique.' };
const LE = new Date('2026-10-16T02:00:00.000Z');

function acte(ordre: number, rubrique: string, texte: string) {
  return { ordre: BigInt(ordre), rubrique, acte: 'validee', empreinte: empreinteTexte(texte), validateur: 'x@exemple.fr', relectureIntegrale: true, motif: null, le: LE };
}

describe('lireRayonFichesUsage — fiches et vocabulaire, états dérivés', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.ficheUsageVersion.findMany.mockResolvedValue([
      {
        id: 'v2',
        ficheId: 'FU_SYNTH',
        numero: 2,
        contenu: CONTENU,
        structureSha256: S,
        creeLe: LE,
        actes: [acte(1, 'question', CONTENU.question), acte(2, 'population', CONTENU.population)],
      },
      { id: 'v1', ficheId: 'FU_SYNTH', numero: 1, contenu: CONTENU, structureSha256: 'd'.repeat(64), creeLe: LE, actes: [] },
      { id: 'w1', ficheId: 'FU_RETIREE', numero: 1, contenu: { question: 'Q.' }, structureSha256: S, creeLe: LE, actes: [] },
    ]);
    prisma.ficheUsageLibelle.findMany.mockResolvedValue([
      {
        id: 'l1',
        nature: 'hypothese',
        termeId: 'HYP_SYNTH',
        numero: 1,
        libelle: 'Libellé synthétique',
        libelleSha256: empreinteTexte('Libellé synthétique'),
        structureSha256: S,
        creeLe: LE,
        actes: [],
      },
    ]);
  });

  it('dérive les états, désigne la référence, garde visible ce qui sort de la structure', async () => {
    const rayon = await lireRayonFichesUsage(CONTEXTE, false);
    expect(rayon.structure).toEqual({ signee: false, empreinte: S, fiches: 1, termes: 2 });

    const fiche = rayon.fiches.find(f => f.ficheId === 'FU_SYNTH');
    // Structure non signée : rien ne fait foi, pas même une version validée.
    expect(fiche).toMatchObject({ declaree: true, population: 'POP_SYNTH', reference: null });
    expect(fiche?.versions.map(v => [v.id, v.etat.etat])).toEqual([
      ['v2', 'validee'],
      ['v1', 'a_relire'],
    ]);

    const horsStructure = rayon.fiches.find(f => f.ficheId === 'FU_RETIREE');
    expect(horsStructure).toMatchObject({ declaree: false, reference: null });
    expect(horsStructure?.versions[0].etat).toEqual({ etat: 'hors_structure' });
  });

  it('structure signée : la version validée la plus récente fait référence', async () => {
    const rayon = await lireRayonFichesUsage(CONTEXTE, true);
    expect(rayon.fiches.find(f => f.ficheId === 'FU_SYNTH')?.reference).toBe('v2');
  });

  it('libellés : le plus récent validé fait foi, l’ancien est dépassé, l’état du texte est rendu sous l’état de structure', async () => {
    const texte = (n: number) => `Libellé synthétique ${n}`;
    const libelle = (numero: number, valide: boolean, structureSha256 = S) => ({
      id: `l${numero}`,
      nature: 'hypothese',
      termeId: 'HYP_SYNTH',
      numero,
      libelle: texte(numero),
      libelleSha256: empreinteTexte(texte(numero)),
      structureSha256,
      creeLe: LE,
      actes: valide
        ? [{ ordre: BigInt(numero), acte: 'validee', empreinte: empreinteTexte(texte(numero)), validateur: 'x@exemple.fr', relectureIntegrale: true, motif: null, le: LE }]
        : [],
    });
    prisma.ficheUsageLibelle.findMany.mockResolvedValue([libelle(3, false), libelle(2, true), libelle(1, true)]);
    const rayon = await lireRayonFichesUsage(CONTEXTE, true);
    const terme = rayon.termes.find(t => t.termeId === 'HYP_SYNTH');
    expect(terme?.reference).toBe('l2');
    expect(terme?.libelles.map(l => [l.id, l.etat.etat, l.depasse])).toEqual([
      ['l3', 'a_valider', false],
      ['l2', 'validee', false],
      ['l1', 'validee', true],
    ]);
    // Non signée : aucun libellé ne fait foi.
    expect((await lireRayonFichesUsage(CONTEXTE, false)).termes.find(t => t.termeId === 'HYP_SYNTH')?.reference).toBeNull();

    // Un libellé validé rédigé pour une autre structure : « à relire » sous la
    // structure, « validé » pour ses actes — l'écran y offre le retrait.
    prisma.ficheUsageLibelle.findMany.mockResolvedValue([libelle(1, true, 'd'.repeat(64))]);
    const l = (await lireRayonFichesUsage(CONTEXTE, true)).termes.find(t => t.termeId === 'HYP_SYNTH')?.libelles[0];
    expect(l?.etat).toEqual({ etat: 'a_relire' });
    expect(l?.etatTexte.etat).toBe('validee');
  });

  it('liste chaque terme déclaré, même sans libellé, avec l’état de ses libellés', async () => {
    const rayon = await lireRayonFichesUsage(CONTEXTE, false);
    expect(rayon.termes.map(t => [t.termeId, t.nature, t.libelles.length])).toEqual([
      ['HYP_SYNTH', 'hypothese', 1],
      ['POP_SYNTH', 'population', 0],
    ]);
    expect(rayon.termes[0].libelles[0]).toMatchObject({ etat: { etat: 'a_valider' }, dernierActe: null });
  });
});

describe('lireVersionFicheUsage — le détail, rubrique par rubrique', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rend chaque rubrique dans l’ordre de la liste, avec son empreinte et son jeton', async () => {
    prisma.ficheUsageVersion.findMany.mockResolvedValue([]);
    prisma.ficheUsageVersion.findUnique.mockResolvedValue({
      id: 'v2',
      ficheId: 'FU_SYNTH',
      numero: 2,
      contenu: CONTENU,
      structureSha256: S,
      modeleRedaction: 'r',
      modeleContreLecture: 'c',
      versionConsigne: 'v1',
      creeLe: LE,
      actes: [acte(4, 'question', CONTENU.question)],
    });
    const detail = await lireVersionFicheUsage('v2', CONTEXTE, true);
    expect(detail?.rubriques.map(r => r.rubrique)).toEqual(['question', 'population']);
    expect(detail?.rubriques[0]).toMatchObject({
      texte: CONTENU.question,
      empreinte: empreinteTexte(CONTENU.question),
      etat: { etat: 'validee' },
      dernierActe: '4',
    });
    expect(detail?.rubriques[1]).toMatchObject({ etat: { etat: 'a_valider' }, dernierActe: null });
    expect(detail).toMatchObject({
      structureDuJour: true,
      structureSignee: true,
      depassee: false,
      etat: { etat: 'a_valider', validees: 1, attendues: 2 },
    });
    expect(prisma.ficheUsageVersion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ficheId: 'FU_SYNTH', numero: { gt: 2 } } }),
    );
  });

  it('une version plus récente validée rend celle-ci « dépassée » ; une plus récente non validée, non', async () => {
    const plusRecente = (actes: ReturnType<typeof acte>[]) => ({ contenu: CONTENU, structureSha256: S, actes });
    prisma.ficheUsageVersion.findUnique.mockResolvedValue({
      id: 'v1',
      ficheId: 'FU_SYNTH',
      numero: 1,
      contenu: CONTENU,
      structureSha256: S,
      modeleRedaction: 'r',
      modeleContreLecture: 'c',
      versionConsigne: 'v1',
      creeLe: LE,
      actes: [],
    });
    prisma.ficheUsageVersion.findMany.mockResolvedValue([
      plusRecente([acte(1, 'question', CONTENU.question), acte(2, 'population', CONTENU.population)]),
    ]);
    expect((await lireVersionFicheUsage('v1', CONTEXTE, true))?.depassee).toBe(true);
    prisma.ficheUsageVersion.findMany.mockResolvedValue([plusRecente([acte(1, 'question', CONTENU.question)])]);
    expect((await lireVersionFicheUsage('v1', CONTEXTE, true))?.depassee).toBe(false);
  });

  it('rend null pour une version introuvable', async () => {
    prisma.ficheUsageVersion.findUnique.mockResolvedValue(null);
    expect(await lireVersionFicheUsage('absente', CONTEXTE, true)).toBeNull();
  });
});
