import { beforeEach, describe, expect, it, vi } from 'vitest';

const { tx, transaction } = vi.hoisted(() => {
  const tx = {
    $executeRaw: vi.fn(),
    ficheUsageVersion: { findUnique: vi.fn(), findMany: vi.fn() },
    ficheUsageActe: { create: vi.fn() },
    ficheUsageLibelle: { findUnique: vi.fn(), findMany: vi.fn() },
    ficheUsageLibelleActe: { create: vi.fn() },
  };
  return { tx, transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)) };
});

vi.mock('@/lib/prisma', () => ({ prisma: { $transaction: transaction } }));

import {
  poserActeLibelle,
  poserActeRubrique,
  type ContexteDecision,
  type DemandeActeLibelle,
  type DemandeActeRubrique,
} from './decision';
import { empreinteTexte } from './empreintes';

// Structure et textes SYNTHÉTIQUES ([[D-251]] §4).
const S = 'c'.repeat(64);
const SIGNEE: ContexteDecision = {
  signee: true,
  controle: {
    structure: {
      fiches: [
        { id: 'FU_SYNTH', question: 'QC_SYNTH', besoins: [2], nature: 'mesure_directe', usageDecisionnel: 'confirmer_hypothese', securiteAdmissibilite: false, statutUsage: 'etaye_valide', population: 'POP_SYNTH', hypotheses: ['HYP_SYNTH'], codesAnalyte: [], claims: [], rubriques: ['question', 'population'] },
      ],
      questions: ['QC_SYNTH'],
      hypotheses: ['HYP_SYNTH'],
      populations: ['POP_SYNTH'],
    },
    empreinte: S,
  },
};
const NON_SIGNEE: ContexteDecision = { ...SIGNEE, signee: false };
const CONTENU = { question: 'Question synthétique.', population: 'Population synthétique.' };
const E_Q = empreinteTexte(CONTENU.question);
const E_P = empreinteTexte(CONTENU.population);
const LIBELLE = 'Libellé synthétique';
const E_L = empreinteTexte(LIBELLE);
const LE = new Date('2026-10-16T02:00:00.000Z');

function acte(ordre: number, over: Record<string, unknown> = {}) {
  return { ordre: BigInt(ordre), acte: 'validee', empreinte: E_Q, validateur: 'x@exemple.fr', relectureIntegrale: true, motif: null, le: LE, ...over };
}

function demandeRubrique(over: Partial<DemandeActeRubrique> = {}): DemandeActeRubrique {
  return {
    idVersion: 'version0000000002',
    rubrique: 'question',
    acte: 'validee',
    empreinteVue: E_Q,
    dernierActeVu: null,
    relectureIntegrale: true,
    validateur: 'praticien@exemple.fr',
    ...over,
  };
}

let courante: Record<string, unknown>;

describe('poserActeRubrique — un acte par rubrique, sur un état vu (D-314 §3, arbitrage 5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    courante = { ficheId: 'FU_SYNTH', numero: 2, contenu: CONTENU, structureSha256: S, actes: [] };
    tx.ficheUsageVersion.findUnique.mockImplementation(async (args: { select: Record<string, unknown> }) =>
      'actes' in args.select ? courante : { ficheId: 'FU_SYNTH' },
    );
    tx.ficheUsageVersion.findMany.mockResolvedValue([]);
    tx.ficheUsageActe.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      ordre: BigInt(7),
      le: LE,
      ...data,
    }));
  });

  it('valide une rubrique : verrou de la fiche, empreinte recalculée, relecture posée', async () => {
    const issue = await poserActeRubrique(demandeRubrique(), SIGNEE);
    expect(issue).toMatchObject({ issue: 'posee', etat: { etat: 'validee', ordre: '7' } });
    expect(String(tx.$executeRaw.mock.calls[0][1])).toBe('fiches_usage_actes:FU_SYNTH');
    expect(tx.ficheUsageActe.create.mock.calls[0][0].data).toEqual({
      idVersion: 'version0000000002',
      rubrique: 'question',
      acte: 'validee',
      empreinte: E_Q,
      validateur: 'praticien@exemple.fr',
      relectureIntegrale: true,
      motif: null,
    });
  });

  it('refuse sans lecture : relecture non déclarée, motif absent, rubrique hors liste', async () => {
    expect(await poserActeRubrique(demandeRubrique({ relectureIntegrale: 'oui' }), SIGNEE)).toEqual({ issue: 'refusee', raison: 'relecture_requise' });
    expect(await poserActeRubrique(demandeRubrique({ acte: 'retiree', motif: ' \t' }), SIGNEE)).toEqual({ issue: 'refusee', raison: 'motif_requis' });
    expect(await poserActeRubrique(demandeRubrique({ rubrique: 'explication_patient' }), SIGNEE)).toEqual({
      issue: 'refusee',
      raison: 'rubrique_inconnue',
    });
    expect(transaction).not.toHaveBeenCalled();
  });

  it('ne valide rien tant que la structure n’est pas signée (porte 23) — mais retire', async () => {
    expect(await poserActeRubrique(demandeRubrique(), NON_SIGNEE)).toEqual({ issue: 'refusee', raison: 'structure_non_signee' });
    expect(transaction).not.toHaveBeenCalled();
    const retrait = await poserActeRubrique(demandeRubrique({ acte: 'retiree', motif: 'Motif synthétique.' }), NON_SIGNEE);
    expect(retrait).toMatchObject({ issue: 'posee', etat: { etat: 'retiree' } });
  });

  it('refuse un texte changé depuis l’affichage, un état changé, un état déjà atteint', async () => {
    expect(await poserActeRubrique(demandeRubrique({ empreinteVue: E_P }), SIGNEE)).toEqual({ issue: 'refusee', raison: 'empreinte_divergente' });
    courante.actes = [acte(5, { acte: 'retiree', motif: 'Motif.' })];
    expect(await poserActeRubrique(demandeRubrique({ dernierActeVu: '4' }), SIGNEE)).toEqual({ issue: 'refusee', raison: 'etat_divergent' });
    courante.actes = [acte(5)];
    expect(await poserActeRubrique(demandeRubrique({ dernierActeVu: '5' }), SIGNEE)).toEqual({ issue: 'refusee', raison: 'deja_dans_cet_etat' });
    expect(tx.ficheUsageActe.create).not.toHaveBeenCalled();
  });

  it('refuse sur un état illisible, une rubrique absente, un contenu rangé hors contrat', async () => {
    courante.actes = [acte(5, { acte: 'publiee' })];
    expect(await poserActeRubrique(demandeRubrique({ dernierActeVu: '5' }), SIGNEE)).toEqual({ issue: 'refusee', raison: 'etat_illisible' });
    courante.actes = [];
    expect(await poserActeRubrique(demandeRubrique({ rubrique: 'limites' }), SIGNEE)).toEqual({ issue: 'refusee', raison: 'rubrique_absente' });
    courante.contenu = { ...CONTENU, conclusion: 'Hors liste.' };
    expect(await poserActeRubrique(demandeRubrique(), SIGNEE)).toEqual({ issue: 'refusee', raison: 'contenu_illisible' });
  });

  it('retire une rubrique d’un contenu devenu hors contrat : le coupe-circuit ne rejoue pas le contrat (revue)', async () => {
    courante.contenu = { ...CONTENU, conclusion: 'Hors liste.' };
    expect(
      await poserActeRubrique(demandeRubrique({ acte: 'retiree', relectureIntegrale: undefined, motif: 'Motif synthétique.' }), SIGNEE),
    ).toMatchObject({ issue: 'posee', etat: { etat: 'retiree' } });
    courante.contenu = ['pas un objet'];
    expect(
      await poserActeRubrique(demandeRubrique({ acte: 'retiree', relectureIntegrale: undefined, motif: 'Motif synthétique.' }), SIGNEE),
    ).toEqual({ issue: 'refusee', raison: 'contenu_illisible' });
  });

  it('refuse de valider un texte qui rédige une structure périmée, ou des rubriques non conformes', async () => {
    courante.structureSha256 = 'd'.repeat(64);
    expect(await poserActeRubrique(demandeRubrique(), SIGNEE)).toEqual({
      issue: 'refusee',
      raison: 'structure',
      anomalies: [{ code: 'structure_perimee' }],
    });
    courante.structureSha256 = S;
    courante.contenu = { question: CONTENU.question };
    expect(await poserActeRubrique(demandeRubrique(), SIGNEE)).toMatchObject({ raison: 'structure' });
  });

  it('refuse de valider une rubrique d’une version qu’une plus récente, validée, a remplacée', async () => {
    tx.ficheUsageVersion.findMany.mockResolvedValue([
      {
        contenu: CONTENU,
        structureSha256: S,
        actes: [acte(8, { rubrique: 'question' }), acte(9, { rubrique: 'population', empreinte: E_P })],
      },
    ]);
    expect(await poserActeRubrique(demandeRubrique(), SIGNEE)).toEqual({ issue: 'refusee', raison: 'version_depassee' });
  });

  it('une version plus récente encore à valider ne bloque pas', async () => {
    tx.ficheUsageVersion.findMany.mockResolvedValue([{ contenu: CONTENU, structureSha256: S, actes: [acte(8, { rubrique: 'question' })] }]);
    expect((await poserActeRubrique(demandeRubrique(), SIGNEE)).issue).toBe('posee');
  });

  it('version introuvable', async () => {
    tx.ficheUsageVersion.findUnique.mockResolvedValue(null);
    expect(await poserActeRubrique(demandeRubrique(), SIGNEE)).toEqual({ issue: 'refusee', raison: 'introuvable' });
  });
});

function demandeLibelle(over: Partial<DemandeActeLibelle> = {}): DemandeActeLibelle {
  return {
    idLibelle: 'libelle0000000001',
    acte: 'validee',
    empreinteVue: E_L,
    dernierActeVu: null,
    relectureIntegrale: true,
    validateur: 'praticien@exemple.fr',
    ...over,
  };
}

let libelleCourant: Record<string, unknown>;

describe('poserActeLibelle — un acte par libellé (arbitrages 3, 12, 15)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    libelleCourant = { termeId: 'HYP_SYNTH', nature: 'hypothese', numero: 1, libelleSha256: E_L, structureSha256: S, actes: [] };
    tx.ficheUsageLibelle.findUnique.mockImplementation(async (args: { select: Record<string, unknown> }) =>
      'actes' in args.select ? libelleCourant : { termeId: 'HYP_SYNTH' },
    );
    tx.ficheUsageLibelle.findMany.mockResolvedValue([]);
    tx.ficheUsageLibelleActe.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      ordre: BigInt(3),
      le: LE,
      ...data,
    }));
  });

  it('valide un libellé sous le verrou de son terme', async () => {
    expect(await poserActeLibelle(demandeLibelle(), SIGNEE)).toMatchObject({ issue: 'posee', etat: { etat: 'validee' } });
    expect(String(tx.$executeRaw.mock.calls[0][1])).toBe('fiches_usage_libelles_actes:HYP_SYNTH');
    expect(tx.ficheUsageLibelleActe.create.mock.calls[0][0].data).toMatchObject({ idLibelle: 'libelle0000000001', empreinte: E_L });
  });

  it('refuse un libellé changé depuis l’affichage, une structure non signée, un libellé sur structure périmée', async () => {
    expect(await poserActeLibelle(demandeLibelle({ empreinteVue: E_Q }), SIGNEE)).toEqual({ issue: 'refusee', raison: 'empreinte_divergente' });
    expect(await poserActeLibelle(demandeLibelle(), NON_SIGNEE)).toEqual({ issue: 'refusee', raison: 'structure_non_signee' });
    libelleCourant.structureSha256 = 'd'.repeat(64);
    expect(await poserActeLibelle(demandeLibelle(), SIGNEE)).toEqual({
      issue: 'refusee',
      raison: 'structure',
      anomalies: [{ code: 'structure_perimee' }],
    });
  });

  it('refuse de valider un libellé qu’un plus récent, validé, a remplacé', async () => {
    tx.ficheUsageLibelle.findMany.mockResolvedValue([{ libelleSha256: E_P, structureSha256: S, actes: [acte(4, { empreinte: E_P })] }]);
    expect(await poserActeLibelle(demandeLibelle(), SIGNEE)).toEqual({ issue: 'refusee', raison: 'version_depassee' });
  });

  it('retire avec un motif, même sans signature', async () => {
    expect(await poserActeLibelle(demandeLibelle({ acte: 'retiree', motif: ' Motif synthétique. ' }), NON_SIGNEE)).toMatchObject({
      issue: 'posee',
      etat: { etat: 'retiree', motif: 'Motif synthétique.' },
    });
  });
});
