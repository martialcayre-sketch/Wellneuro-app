import { beforeEach, describe, expect, it, vi } from 'vitest';

const { tx, transaction } = vi.hoisted(() => {
  const tx = {
    $executeRaw: vi.fn(),
    ficheUsageVersion: { findFirst: vi.fn(), create: vi.fn() },
    ficheUsageLibelle: { findFirst: vi.fn(), create: vi.fn() },
  };
  return { tx, transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)) };
});

vi.mock('@/lib/prisma', () => ({ prisma: { $transaction: transaction } }));

import type { ContexteControle } from './controle';
import { empreinteTexte } from './empreintes';
import { deposerBrouillonLibelle, deposerBrouillonVersionUsage } from './ingestion';

// Structure et textes SYNTHÉTIQUES ([[D-251]] §4).
const S = 'c'.repeat(64);
const CONTEXTE: ContexteControle = {
  structure: {
    fiches: [
      { id: 'FU_SYNTH', population: 'POP_SYNTH', hypotheses: ['HYP_SYNTH'], codesAnalyte: [], claims: [], rubriques: ['question', 'population'] },
    ],
    hypotheses: ['HYP_SYNTH'],
    populations: ['POP_SYNTH'],
  },
  empreinte: S,
};
const VERSION = {
  ficheId: 'FU_SYNTH',
  contenu: { question: 'Question synthétique.', population: 'Population synthétique.' },
  structureSha256: S,
  modeleRedaction: 'r',
  modeleContreLecture: 'c',
  versionConsigne: 'v1',
};
const LIBELLE = {
  termeId: 'HYP_SYNTH',
  nature: 'hypothese' as const,
  libelle: 'Libellé synthétique',
  structureSha256: S,
  modeleRedaction: 'r',
  modeleContreLecture: 'c',
  versionConsigne: 'v1',
};

describe('deposerBrouillonVersionUsage — un brouillon, sous le verrou de la fiche', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tx.ficheUsageVersion.findFirst.mockResolvedValue(null);
    tx.ficheUsageVersion.create.mockResolvedValue({ id: 'v1', numero: 1 });
  });

  it('dépose la version n° 1, après le verrou de la fiche, sans aucun acte', async () => {
    expect(await deposerBrouillonVersionUsage(VERSION, CONTEXTE)).toEqual({ issue: 'deposee', id: 'v1', numero: 1 });
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(String(tx.$executeRaw.mock.calls[0][1])).toBe('fiches_usage_versions:FU_SYNTH');
    expect(tx.ficheUsageVersion.create.mock.calls[0][0].data).toMatchObject({ ficheId: 'FU_SYNTH', numero: 1, structureSha256: S });
    expect(tx.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.ficheUsageVersion.findFirst.mock.invocationCallOrder[0]);
  });

  it('prend le numéro qui suit le dernier', async () => {
    tx.ficheUsageVersion.findFirst.mockResolvedValue({ ...VERSION, id: 'v3', numero: 3, contenu: { question: 'Autre.' } });
    tx.ficheUsageVersion.create.mockResolvedValue({ id: 'v4', numero: 4 });
    expect(await deposerBrouillonVersionUsage(VERSION, CONTEXTE)).toEqual({ issue: 'deposee', id: 'v4', numero: 4 });
    expect(tx.ficheUsageVersion.create.mock.calls[0][0].data.numero).toBe(4);
  });

  it('le même dépôt rejoué ne crée rien (idempotent), même dans un autre ordre des clés', async () => {
    tx.ficheUsageVersion.findFirst.mockResolvedValue({
      ...VERSION,
      id: 'v2',
      numero: 2,
      contenu: { population: 'Population synthétique.', question: 'Question synthétique.' },
    });
    expect(await deposerBrouillonVersionUsage(VERSION, CONTEXTE)).toEqual({ issue: 'inchangee', id: 'v2', numero: 2 });
    expect(tx.ficheUsageVersion.create).not.toHaveBeenCalled();
  });

  it('un autre modèle de contre-lecture est un dépôt neuf', async () => {
    tx.ficheUsageVersion.findFirst.mockResolvedValue({ ...VERSION, id: 'v2', numero: 2, modeleContreLecture: 'autre' });
    tx.ficheUsageVersion.create.mockResolvedValue({ id: 'v3', numero: 3 });
    expect((await deposerBrouillonVersionUsage(VERSION, CONTEXTE)).issue).toBe('deposee');
  });

  it('refuse, sans rien lire ni écrire, un texte qui ne rédige pas la structure du jour', async () => {
    const issue = await deposerBrouillonVersionUsage({ ...VERSION, structureSha256: 'd'.repeat(64) }, CONTEXTE);
    expect(issue).toEqual({ issue: 'refusee', anomalies: [{ code: 'structure_perimee' }] });
    expect(transaction).not.toHaveBeenCalled();
  });

  it('refuse des rubriques qui ne sont pas celles qu’attend la structure', async () => {
    const issue = await deposerBrouillonVersionUsage({ ...VERSION, contenu: { question: 'Q.' } }, CONTEXTE);
    expect(issue).toEqual({ issue: 'refusee', anomalies: [{ code: 'rubriques_non_conformes', manquantes: ['population'], enTrop: [] }] });
  });

  it('par défaut, la structure du dépôt — vide — refuse tout', async () => {
    expect((await deposerBrouillonVersionUsage(VERSION)).issue).toBe('refusee');
    expect(transaction).not.toHaveBeenCalled();
  });
});

describe('deposerBrouillonLibelle — l’empreinte posée par le serveur', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tx.ficheUsageLibelle.findFirst.mockResolvedValue(null);
    tx.ficheUsageLibelle.create.mockResolvedValue({ id: 'l1', numero: 1 });
  });

  it('dépose le libellé n° 1 avec l’empreinte de son texte et sa nature', async () => {
    expect(await deposerBrouillonLibelle(LIBELLE, CONTEXTE)).toEqual({ issue: 'deposee', id: 'l1', numero: 1 });
    expect(String(tx.$executeRaw.mock.calls[0][1])).toBe('fiches_usage_libelles:HYP_SYNTH');
    expect(tx.ficheUsageLibelle.create.mock.calls[0][0].data).toMatchObject({
      nature: 'hypothese',
      termeId: 'HYP_SYNTH',
      numero: 1,
      libelleSha256: empreinteTexte('Libellé synthétique'),
      structureSha256: S,
    });
  });

  it('le même libellé rejoué ne crée rien', async () => {
    tx.ficheUsageLibelle.findFirst.mockResolvedValue({
      ...LIBELLE,
      id: 'l2',
      numero: 2,
      libelleSha256: empreinteTexte('Libellé synthétique'),
    });
    expect(await deposerBrouillonLibelle(LIBELLE, CONTEXTE)).toEqual({ issue: 'inchangee', id: 'l2', numero: 2 });
    expect(tx.ficheUsageLibelle.create).not.toHaveBeenCalled();
  });

  it('refuse un terme que la structure ne déclare pas', async () => {
    expect(await deposerBrouillonLibelle({ ...LIBELLE, termeId: 'HYP_AUTRE' }, CONTEXTE)).toEqual({
      issue: 'refusee',
      anomalies: [{ code: 'terme_hors_structure' }],
    });
    expect(transaction).not.toHaveBeenCalled();
  });
});
