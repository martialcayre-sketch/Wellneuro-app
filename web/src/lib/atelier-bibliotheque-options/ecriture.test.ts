import { beforeEach, describe, expect, it, vi } from 'vitest';

// Les refus de la route (D-480 §3), sur base simulée. Les refus de la base
// (numéro, dernière version, empreinte recopiée, ajout seul) sont tenus par le
// contrat négatif `bibliotheque_options_textes_v1_negatif.sql`. Textes et
// identifiants synthétiques ; aucune option réelle.

const { tx, prismaMock } = vi.hoisted(() => {
  const tx = {
    $executeRaw: vi.fn(),
    bibliothequeOptionTexte: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    bibliothequeOptionTexteActe: { create: vi.fn() },
  };
  const prismaMock = { $transaction: vi.fn(async (cb: (t: typeof tx) => unknown, _opts?: unknown) => cb(tx)) };
  return { tx, prismaMock };
});
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));

import { empreinteTexte } from '@/lib/fiches-usage/empreintes';
import { poserActeTexte, verserTexte } from './ecriture';
import type { ContexteAtelier } from './structure';

const STRUCTURE = 'b'.repeat(64);
const TEXTE = 'Texte synthétique de banc.';
const SHA = empreinteTexte(TEXTE);
const OPTION = 'OPT_BANC_A';

const contexte = (etatStructure: ContexteAtelier['etatStructure'] = 'signee', options = [OPTION]): ContexteAtelier => ({
  empreinteStructure: STRUCTURE,
  etatStructure,
  options: options.map(id => ({ id, hypothese: 'HYP_BANC', populations: ['POP_BANC'], renvois: {} as never })),
});

const acteLu = (ordre: number, genre: string) => ({
  ordre: BigInt(ordre),
  acte: genre,
  empreinte: SHA,
  validateur: 'responsable@exemple.fr',
  relectureIntegrale: genre === 'validee',
  motif: genre === 'retiree' ? 'motif' : null,
  le: new Date('2026-11-13T10:00:00Z'),
});
const derniere = (extra: Record<string, unknown> = {}) => ({
  id: 'texte0000001',
  numero: 1,
  texteSha256: SHA,
  structureSha256: STRUCTURE,
  actes: [] as ReturnType<typeof acteLu>[],
  ...extra,
});

const VERSION = { optionId: OPTION, rubrique: 'dose' as const, texte: TEXTE, derniereVersionVue: null, auteur: 'responsable@exemple.fr' };
const ACTE = {
  idTexte: 'texte0000001',
  acte: 'validee' as const,
  empreinteVue: SHA,
  dernierActeVu: null,
  relectureIntegrale: true,
  motif: null,
  validateur: 'responsable@exemple.fr',
};

beforeEach(() => {
  vi.clearAllMocks();
  tx.bibliothequeOptionTexte.findFirst.mockResolvedValue(null);
  tx.bibliothequeOptionTexte.findUnique.mockResolvedValue({ optionId: OPTION, rubrique: 'dose' });
  tx.bibliothequeOptionTexte.create.mockImplementation(async ({ data }) => ({ id: 'texte0000002', optionId: data.optionId, rubrique: data.rubrique, numero: data.numero }));
  tx.bibliothequeOptionTexteActe.create.mockImplementation(async ({ data }) => ({ ...acteLu(9, data.acte), motif: data.motif }));
});

describe('verser un texte (D-480 §3)', () => {
  it('une première version : numéro 1, empreintes du texte et de la structure du jour, auteur de la session, READ COMMITTED', async () => {
    const issue = await verserTexte(VERSION, contexte('non_signee'));
    expect(issue).toEqual({ issue: 'versee', version: { id: 'texte0000002', optionId: OPTION, rubrique: 'dose', numero: 1 } });
    expect(tx.bibliothequeOptionTexte.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { optionId: OPTION, rubrique: 'dose', numero: 1, texte: TEXTE, texteSha256: SHA, structureSha256: STRUCTURE, auteur: 'responsable@exemple.fr' },
      }),
    );
    expect(prismaMock.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'ReadCommitted' });
    // Le verrou du trigger, pris AVANT la lecture de la dernière version.
    expect(tx.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.bibliothequeOptionTexte.findFirst.mock.invocationCallOrder[0]);
    expect(tx.$executeRaw.mock.calls[0].slice(1)).toEqual([`bo|${OPTION}|dose`]);
  });

  it('une option que la structure ne déclare pas : refusée sans transaction', async () => {
    expect(await verserTexte({ ...VERSION, optionId: 'OPT_BANC_Z' }, contexte())).toEqual({ issue: 'refusee', raison: 'option_hors_structure' });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('la dernière version vue n’est plus la dernière : état divergent, rien d’écrit', async () => {
    tx.bibliothequeOptionTexte.findFirst.mockResolvedValue(derniere());
    expect(await verserTexte(VERSION, contexte())).toEqual({ issue: 'refusee', raison: 'etat_divergent' });
    expect(await verserTexte({ ...VERSION, derniereVersionVue: 'autre0000001' }, contexte())).toEqual({ issue: 'refusee', raison: 'etat_divergent' });
    expect(tx.bibliothequeOptionTexte.create).not.toHaveBeenCalled();
  });

  it('même texte sur la même structure : inchangé ; même texte pour une version « à relire » : versé, numéro suivant', async () => {
    tx.bibliothequeOptionTexte.findFirst.mockResolvedValue(derniere());
    expect(await verserTexte({ ...VERSION, derniereVersionVue: 'texte0000001' }, contexte())).toEqual({ issue: 'refusee', raison: 'texte_inchange' });
    tx.bibliothequeOptionTexte.findFirst.mockResolvedValue(derniere({ structureSha256: 'c'.repeat(64) }));
    const issue = await verserTexte({ ...VERSION, derniereVersionVue: 'texte0000001' }, contexte());
    expect(issue).toMatchObject({ issue: 'versee', version: { numero: 2 } });
  });
});

describe('poser un acte (D-480 §3)', () => {
  it('valider : relecture strictement `true`, structure signée — refusés avant toute transaction', async () => {
    expect(await poserActeTexte({ ...ACTE, relectureIntegrale: 'true' }, contexte())).toEqual({ issue: 'refusee', raison: 'relecture_requise' });
    expect(await poserActeTexte(ACTE, contexte('non_signee'))).toEqual({ issue: 'refusee', raison: 'structure_non_signee' });
    expect(await poserActeTexte(ACTE, contexte('a_relire'))).toEqual({ issue: 'refusee', raison: 'structure_a_relire' });
    expect(await poserActeTexte({ ...ACTE, acte: 'retiree' }, contexte())).toEqual({ issue: 'refusee', raison: 'motif_requis' });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('valide la dernière version vue, empreinte recopiée du texte, relecture déclarée', async () => {
    tx.bibliothequeOptionTexte.findFirst.mockResolvedValue(derniere());
    const issue = await poserActeTexte(ACTE, contexte());
    expect(issue).toMatchObject({ issue: 'posee', etat: { etat: 'validee' } });
    expect(tx.bibliothequeOptionTexteActe.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { idTexte: 'texte0000001', acte: 'validee', empreinte: SHA, validateur: 'responsable@exemple.fr', relectureIntegrale: true, motif: null },
      }),
    );
    // Le verrou du couple, pris AVANT la lecture de la dernière version.
    expect(tx.$executeRaw.mock.calls[0].slice(1)).toEqual([`bo|${OPTION}|dose`]);
    expect(tx.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.bibliothequeOptionTexte.findFirst.mock.invocationCallOrder[0]);
  });

  it('une version qui n’est plus la dernière, une empreinte ou un dernier acte qui ont bougé : rien d’écrit', async () => {
    tx.bibliothequeOptionTexte.findFirst.mockResolvedValue(derniere({ id: 'texte0000002', numero: 2 }));
    expect(await poserActeTexte(ACTE, contexte())).toEqual({ issue: 'refusee', raison: 'version_depassee' });
    tx.bibliothequeOptionTexte.findFirst.mockResolvedValue(derniere());
    expect(await poserActeTexte({ ...ACTE, empreinteVue: 'e'.repeat(64) }, contexte())).toEqual({ issue: 'refusee', raison: 'empreinte_divergente' });
    tx.bibliothequeOptionTexte.findFirst.mockResolvedValue(derniere({ actes: [acteLu(4, 'retiree')] }));
    expect(await poserActeTexte(ACTE, contexte())).toEqual({ issue: 'refusee', raison: 'etat_divergent' });
    tx.bibliothequeOptionTexte.findUnique.mockResolvedValue(null);
    expect(await poserActeTexte(ACTE, contexte())).toEqual({ issue: 'refusee', raison: 'introuvable' });
    expect(tx.bibliothequeOptionTexteActe.create).not.toHaveBeenCalled();
  });

  it('valider un texte « à relire », hors structure ou déjà validé : refusé ; le retirer reste ouvert', async () => {
    tx.bibliothequeOptionTexte.findFirst.mockResolvedValue(derniere({ structureSha256: 'c'.repeat(64) }));
    expect(await poserActeTexte(ACTE, contexte())).toEqual({ issue: 'refusee', raison: 'texte_a_relire' });
    expect(await poserActeTexte(ACTE, contexte('signee', []))).toEqual({ issue: 'refusee', raison: 'option_hors_structure' });
    tx.bibliothequeOptionTexte.findFirst.mockResolvedValue(derniere({ actes: [acteLu(4, 'validee')] }));
    expect(await poserActeTexte({ ...ACTE, dernierActeVu: '4' }, contexte())).toEqual({ issue: 'refusee', raison: 'deja_dans_cet_etat' });
    expect(tx.bibliothequeOptionTexteActe.create).not.toHaveBeenCalled();

    // Le coupe-circuit : une structure non signée, une option hors structure,
    // un texte « à relire » ne l'empêchent pas.
    tx.bibliothequeOptionTexte.findFirst.mockResolvedValue(derniere({ structureSha256: 'c'.repeat(64), actes: [acteLu(4, 'validee')] }));
    const retrait = await poserActeTexte({ ...ACTE, acte: 'retiree', relectureIntegrale: undefined, motif: 'motif', dernierActeVu: '4' }, contexte('non_signee', []));
    expect(retrait).toMatchObject({ issue: 'posee', etat: { etat: 'hors_structure' } });
    expect(tx.bibliothequeOptionTexteActe.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ acte: 'retiree', relectureIntegrale: false, motif: 'motif' }) }),
    );
  });

  it('retirer un texte déjà retiré : refusé ; un état illisible : refusé', async () => {
    tx.bibliothequeOptionTexte.findFirst.mockResolvedValue(derniere({ actes: [acteLu(4, 'retiree')] }));
    const retrait = { ...ACTE, acte: 'retiree' as const, motif: 'motif', dernierActeVu: '4' };
    expect(await poserActeTexte(retrait, contexte())).toEqual({ issue: 'refusee', raison: 'deja_dans_cet_etat' });
    tx.bibliothequeOptionTexte.findFirst.mockResolvedValue(derniere({ actes: [acteLu(4, 'signee')] }));
    expect(await poserActeTexte(retrait, contexte())).toEqual({ issue: 'refusee', raison: 'etat_illisible' });
  });
});
