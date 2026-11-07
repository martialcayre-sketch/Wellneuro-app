import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConflitSourcesDeclare } from '@/lib/clinical/conflitsSourcesV1';

// Les refus que D-439 et les arbitrages du 2026-11-06 placent à la route, sur
// base simulée. Le banc sur base réelle (`positionsExpert.pg.test.ts`) rejoue
// les chemins, les empreintes et la concurrence. Textes synthétiques.

const { tx, prismaMock } = vi.hoisted(() => {
  const tx = {
    $executeRaw: vi.fn(),
    positionExpertVersion: { findFirst: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    positionExpertActe: { create: vi.fn() },
    arbitrageConflitSource: { findFirst: vi.fn(), create: vi.fn() },
  };
  const prismaMock = {
    $transaction: vi.fn(async (cb: (t: typeof tx) => unknown, _opts?: unknown) => cb(tx)),
    positionExpertVersion: { findUnique: vi.fn() },
  };
  return { tx, prismaMock };
});
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));

import { empreinteContenuPosition } from './empreinte';
import { contexteDuDepot, poserActePosition, poserArbitrage, revoquerArbitrage, verserVersion, type ContexteEcriture } from './ecriture';
import { empreinteEntreeConflit } from './registreConflits';

const CONTENU = { enonce: 'é', perimetre: 'p', population: 'po', limites: 'l' };
const EMPREINTE = empreinteContenuPosition(CONTENU);
const A = 'WN-CL-0001-001@v1.0';
const B = 'WN-CL-0001-002@v1.0';
const ENTREE = {
  id: 'CS-BANC-01',
  statut: 'publiee',
  objet: 'Objet synthétique ?',
  claims: [
    { claimId: 'WN-CL-0001-001', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0001-002', versionClaim: 'v1.0' },
  ],
  positions: ['A', 'B'],
  importance: 'moyenne',
  hypotheses: [],
  actionSuggeree: 'x',
  limitations: [],
  fichesUsage: ['FU_BANC_A'],
} as unknown as ConflitSourcesDeclare;

let frais: Set<string>;
const ctx = (): ContexteEcriture => ({
  registre: [ENTREE],
  empreintesSignees: { [ENTREE.id]: empreinteEntreeConflit(ENTREE) },
  structure: { signee: true, fiches: new Set(['FU_BANC_A', 'FU_BANC_B']), empreinte: 'f'.repeat(64) },
  lireFraicheur: async refs => new Set(refs.filter(r => frais.has(r))),
});
const verrous = () => tx.$executeRaw.mock.calls.map(c => c[1] as string);

beforeEach(() => {
  vi.clearAllMocks();
  frais = new Set([A, B]);
  tx.positionExpertVersion.findMany.mockResolvedValue([]);
});

describe('verser une version', () => {
  const demande = {
    positionId: 'WN-PE-0001',
    version: 'v1.0',
    dossier: 'fer' as const,
    ficheId: 'FU_BANC_A',
    contenu: CONTENU,
    claimsAppui: [A],
    idVersionCouranteVue: null,
    auteur: 'responsable@exemple.fr',
  };

  it('une première version : verrou de fiche PUIS de position, READ COMMITTED, une écriture', async () => {
    tx.positionExpertVersion.findFirst.mockResolvedValue(null);
    tx.positionExpertVersion.create.mockResolvedValue({ id: 'v1', positionId: 'WN-PE-0001', version: 'v1.0' });
    const issue = await verserVersion(demande, ctx());
    expect(issue.issue).toBe('ecrite');
    expect(verrous()).toEqual(['fu|FU_BANC_A', 'pe|WN-PE-0001']);
    expect(prismaMock.$transaction.mock.calls[0][1]).toEqual({ isolationLevel: 'ReadCommitted' });
    expect(tx.positionExpertVersion.create).toHaveBeenCalledTimes(1);
    expect(tx.positionExpertVersion.create.mock.calls[0][0].data.idVersionRevisee).toBeNull();
  });

  it('fiche hors de la structure signée, appui non frais (absent compris) : refusés avant la base', async () => {
    expect(await verserVersion({ ...demande, ficheId: 'FU_INCONNUE' }, ctx())).toEqual({ issue: 'refusee', raison: 'fiche_hors_structure' });
    frais = new Set();
    expect(await verserVersion(demande, ctx())).toEqual({ issue: 'refusee', raison: 'appui_non_frais', claims: [A] });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('la version courante vue a bougé : rien n’est écrit', async () => {
    tx.positionExpertVersion.findFirst.mockResolvedValue({ id: 'courante1', version: 'v1.0', dossier: 'fer', ficheId: null });
    expect(await verserVersion(demande, ctx())).toEqual({ issue: 'refusee', raison: 'etat_divergent' });
    expect(tx.positionExpertVersion.create).not.toHaveBeenCalled();
  });

  it('une révision suit strictement et reste dans son dossier', async () => {
    tx.positionExpertVersion.findFirst.mockResolvedValue({ id: 'courante1', version: 'v1.9', dossier: 'fer', ficheId: null });
    const rev = { ...demande, idVersionCouranteVue: 'courante1' };
    expect(await verserVersion({ ...rev, version: 'v1.9' }, ctx())).toEqual({ issue: 'refusee', raison: 'version_ne_suit_pas' });
    expect(await verserVersion({ ...rev, version: 'v1.10', dossier: 'zinc' }, ctx())).toEqual({ issue: 'refusee', raison: 'dossier_different' });
    tx.positionExpertVersion.create.mockResolvedValue({ id: 'v2', positionId: 'WN-PE-0001', version: 'v1.10' });
    expect((await verserVersion({ ...rev, version: 'v1.10' }, ctx())).issue).toBe('ecrite');
    expect(tx.positionExpertVersion.create.mock.calls[0][0].data.idVersionRevisee).toBe('courante1');
  });

  it('question 3 : une fiche fondée par une autre position non retirée (brouillon ou signée) est refusée', async () => {
    tx.positionExpertVersion.findFirst.mockResolvedValue(null);
    tx.positionExpertVersion.findMany.mockResolvedValue([{ positionId: 'WN-PE-0002', actes: [] }]);
    expect(await verserVersion(demande, ctx())).toEqual({ issue: 'refusee', raison: 'fiche_deja_fondee' });
    tx.positionExpertVersion.findMany.mockResolvedValue([{ positionId: 'WN-PE-0002', actes: [{ ordre: BigInt(1), acte: 'signee' }] }]);
    expect(await verserVersion(demande, ctx())).toEqual({ issue: 'refusee', raison: 'fiche_deja_fondee' });
    // Retirée : la fiche est libre.
    tx.positionExpertVersion.findMany.mockResolvedValue([
      { positionId: 'WN-PE-0002', actes: [{ ordre: BigInt(1), acte: 'signee' }, { ordre: BigInt(2), acte: 'retiree' }] },
    ]);
    tx.positionExpertVersion.create.mockResolvedValue({ id: 'v1', positionId: 'WN-PE-0001', version: 'v1.0' });
    expect((await verserVersion(demande, ctx())).issue).toBe('ecrite');
    // Elle cherche les AUTRES positions, versions courantes seulement.
    expect(tx.positionExpertVersion.findMany.mock.calls[0][0].where).toEqual({
      ficheId: 'FU_BANC_A',
      positionId: { not: 'WN-PE-0001' },
      revisePar: { is: null },
    });
  });

  it('sans fiche : ni verrou de fiche, ni question 3', async () => {
    tx.positionExpertVersion.findFirst.mockResolvedValue(null);
    tx.positionExpertVersion.create.mockResolvedValue({ id: 'v1', positionId: 'WN-PE-0001', version: 'v1.0' });
    await verserVersion({ ...demande, ficheId: null }, ctx());
    expect(verrous()).toEqual(['pe|WN-PE-0001']);
    expect(tx.positionExpertVersion.findMany).not.toHaveBeenCalled();
  });

  it('une révision qui change de fiche verrouille et contrôle la fiche NEUVE', async () => {
    tx.positionExpertVersion.findFirst.mockResolvedValue({ id: 'courante1', version: 'v1.0', dossier: 'fer', ficheId: 'FU_BANC_A' });
    tx.positionExpertVersion.findMany.mockResolvedValue([{ positionId: 'WN-PE-0002', actes: [] }]);
    const issue = await verserVersion({ ...demande, version: 'v1.1', ficheId: 'FU_BANC_B', idVersionCouranteVue: 'courante1' }, ctx());
    expect(issue).toEqual({ issue: 'refusee', raison: 'fiche_deja_fondee' });
    expect(verrous()).toEqual(['fu|FU_BANC_B', 'pe|WN-PE-0001']);
    expect(tx.positionExpertVersion.findMany.mock.calls[0][0].where.ficheId).toBe('FU_BANC_B');
  });
});

describe('signer ou retirer — les actes alternent (question 1)', () => {
  const demande = {
    idVersion: 'version000001',
    acte: 'signee' as const,
    empreinteVue: EMPREINTE,
    dernierActeVu: null,
    relectureIntegrale: true,
    motif: null,
    auteur: 'responsable@exemple.fr',
  };
  const version = (actes: { ordre: bigint; acte: string }[], revisePar: { id: string } | null = null) =>
    tx.positionExpertVersion.findUnique.mockResolvedValue({ contenu: CONTENU, revisePar, actes });

  beforeEach(() => {
    prismaMock.positionExpertVersion.findUnique.mockResolvedValue({ positionId: 'WN-PE-0001', ficheId: 'FU_BANC_A', claimsAppui: [A] });
    tx.positionExpertActe.create.mockResolvedValue({ id: 'a1', ordre: BigInt(7), acte: 'signee' });
  });

  it('signer un brouillon : verrou de fiche puis de position, une écriture, empreinte recalculée', async () => {
    version([]);
    const issue = await poserActePosition(demande, ctx());
    expect(issue).toEqual({ issue: 'ecrite', acte: { id: 'a1', ordre: '7', acte: 'signee' } });
    expect(verrous()).toEqual(['fu|FU_BANC_A', 'pe|WN-PE-0001']);
    expect(tx.positionExpertActe.create.mock.calls[0][0].data).toMatchObject({ empreinte: EMPREINTE, relectureIntegrale: true, motif: null });
  });

  it('signer exige la relecture STRICTEMENT vraie ; retirer exige un motif', async () => {
    expect(await poserActePosition({ ...demande, relectureIntegrale: 'true' }, ctx())).toEqual({ issue: 'refusee', raison: 'relecture_requise' });
    expect(await poserActePosition({ ...demande, acte: 'retiree' }, ctx())).toEqual({ issue: 'refusee', raison: 'motif_requis' });
  });

  it('un « signee » répété est refusé', async () => {
    version([{ ordre: BigInt(3), acte: 'signee' }]);
    expect(await poserActePosition({ ...demande, dernierActeVu: '3' }, ctx())).toEqual({ issue: 'refusee', raison: 'deja_signee' });
  });

  it('un « retiree » sur une version jamais signée est refusé', async () => {
    version([]);
    expect(await poserActePosition({ ...demande, acte: 'retiree', motif: 'm' }, ctx())).toEqual({ issue: 'refusee', raison: 'jamais_signee' });
    expect(tx.positionExpertActe.create).not.toHaveBeenCalled();
  });

  it('retirer une version signée passe, sans relire la fraîcheur (coupe-circuit)', async () => {
    frais = new Set();
    version([{ ordre: BigInt(3), acte: 'signee' }]);
    const issue = await poserActePosition({ ...demande, acte: 'retiree', motif: 'm', dernierActeVu: '3' }, ctx());
    expect(issue.issue).toBe('ecrite');
    expect(tx.positionExpertActe.create.mock.calls[0][0].data).toMatchObject({ acte: 'retiree', relectureIntegrale: false, motif: 'm' });
  });

  it('version introuvable, révisée, texte ou état vus qui ont bougé', async () => {
    prismaMock.positionExpertVersion.findUnique.mockResolvedValueOnce(null);
    expect(await poserActePosition(demande, ctx())).toEqual({ issue: 'refusee', raison: 'introuvable' });
    version([], { id: 'suivante' });
    expect(await poserActePosition(demande, ctx())).toEqual({ issue: 'refusee', raison: 'version_depassee' });
    version([]);
    expect(await poserActePosition({ ...demande, empreinteVue: '0'.repeat(64) }, ctx())).toEqual({ issue: 'refusee', raison: 'empreinte_divergente' });
    expect(await poserActePosition({ ...demande, dernierActeVu: '1' }, ctx())).toEqual({ issue: 'refusee', raison: 'etat_divergent' });
  });

  it('signer : appui non frais refusé ; question 3 rejouée sous le verrou de la fiche', async () => {
    frais = new Set();
    expect(await poserActePosition(demande, ctx())).toEqual({ issue: 'refusee', raison: 'appui_non_frais', claims: [A] });
    frais = new Set([A]);
    version([{ ordre: BigInt(3), acte: 'signee' }, { ordre: BigInt(4), acte: 'retiree' }]);
    tx.positionExpertVersion.findMany.mockResolvedValue([{ positionId: 'WN-PE-0002', actes: [] }]);
    expect(await poserActePosition({ ...demande, dernierActeVu: '4' }, ctx())).toEqual({ issue: 'refusee', raison: 'fiche_deja_fondee' });
  });
});

describe('poser un arbitrage', () => {
  const demande = {
    conflitId: 'CS-BANC-01',
    ficheId: 'FU_BANC_A',
    teteVue: null,
    retenu: { claim: A } as { claim: string } | { idPositionVersion: string },
    motif: 'motif',
    auteur: 'responsable@exemple.fr',
  };
  beforeEach(() => {
    tx.arbitrageConflitSource.findFirst.mockResolvedValue(null);
    tx.arbitrageConflitSource.create.mockResolvedValue({ id: 'ar1', ordre: BigInt(5), acte: 'pose' });
  });

  // Réécrit à la re-signature ([[D-452]]) : le registre porte ses listes, et
  // c'est désormais la signature de l'entrée qui ouvre ou ferme la pose.
  it('REGISTRE DU DÉPÔT : non signé, toute pose est refusée ; signé, une fiche hors de la liste l’est encore', async () => {
    const depot = { ...contexteDuDepot(), lireFraicheur: ctx().lireFraicheur };
    const issue = await poserArbitrage({ ...demande, conflitId: 'CS-BIO-01', ficheId: 'FU_FER_P1' }, depot);
    const attendue = depot.empreintesSignees === null
      ? 'registre_non_signe'
      : depot.structure.signee ? 'fiche_hors_liste' : 'structure_non_signee';
    expect(issue).toEqual({ issue: 'refusee', raison: attendue });
  });

  it('une entrée non signée telle quelle n’ouvre aucune pose : registre non signé, ou entrée retouchée', async () => {
    const nonSigne = { ...ctx(), empreintesSignees: null };
    expect(await poserArbitrage(demande, nonSigne)).toEqual({ issue: 'refusee', raison: 'registre_non_signe' });
    const retouchee = { ...ctx(), empreintesSignees: { [ENTREE.id]: 'a'.repeat(64) } };
    expect(await poserArbitrage(demande, retouchee)).toEqual({ issue: 'refusee', raison: 'registre_non_signe' });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('conflit inconnu mais bien formé ; structure non signée ; fiche hors structure ; fiche hors liste', async () => {
    expect(await poserArbitrage({ ...demande, conflitId: 'CS-INCONNU-01' }, ctx())).toEqual({ issue: 'refusee', raison: 'conflit_inconnu' });
    const nonSignee = ctx();
    nonSignee.structure = { ...nonSignee.structure, signee: false };
    expect(await poserArbitrage(demande, nonSignee)).toEqual({ issue: 'refusee', raison: 'structure_non_signee' });
    expect(await poserArbitrage({ ...demande, ficheId: 'FU_INCONNUE' }, ctx())).toEqual({ issue: 'refusee', raison: 'fiche_hors_structure' });
    expect(await poserArbitrage({ ...demande, ficheId: 'FU_BANC_B' }, ctx())).toEqual({ issue: 'refusee', raison: 'fiche_hors_liste' });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('claim retenu hors du conflit ; claim retenu absent du corpus', async () => {
    expect(await poserArbitrage({ ...demande, retenu: { claim: 'WN-CL-0009-009@v1.0' } }, ctx())).toEqual({
      issue: 'refusee',
      raison: 'claim_hors_conflit',
    });
    frais = new Set([B]);
    expect(await poserArbitrage(demande, ctx())).toEqual({ issue: 'refusee', raison: 'claim_non_frais', claims: [A] });
  });

  it('pose d’un claim : verrou du couple, attestations A3, une écriture', async () => {
    const issue = await poserArbitrage(demande, ctx());
    expect(issue).toEqual({ issue: 'ecrite', arbitrage: { id: 'ar1', ordre: '5', acte: 'pose' } });
    expect(verrous()).toEqual(['cs|CS-BANC-01|FU_BANC_A']);
    expect(tx.arbitrageConflitSource.create.mock.calls[0][0].data).toMatchObject({
      acte: 'pose',
      idArbitrageRemplace: null,
      claimRetenu: A,
      idPositionVersion: null,
      conflitSha256: empreinteEntreeConflit(ENTREE),
      structureSha256: 'f'.repeat(64),
    });
  });

  it('la tête vue a bougé : rien n’est écrit ; une pose sur une tête la remplace', async () => {
    tx.arbitrageConflitSource.findFirst.mockResolvedValue({ id: 'tete1' });
    expect(await poserArbitrage(demande, ctx())).toEqual({ issue: 'refusee', raison: 'etat_divergent' });
    await poserArbitrage({ ...demande, teteVue: 'tete1' }, ctx());
    expect(tx.arbitrageConflitSource.create.mock.calls[0][0].data.idArbitrageRemplace).toBe('tete1');
  });

  describe('retenir une position (question 2)', () => {
    const avecPosition = { ...demande, retenu: { idPositionVersion: 'pv000001' } };
    const lue = (ficheId: string | null, claimsAppui = [A]) =>
      prismaMock.positionExpertVersion.findUnique.mockResolvedValue({ positionId: 'WN-PE-0001', ficheId, claimsAppui });

    it('elle doit fonder la MÊME fiche ; sans fiche, elle ne se retient pas', async () => {
      lue('FU_BANC_B');
      expect(await poserArbitrage(avecPosition, ctx())).toEqual({ issue: 'refusee', raison: 'position_autre_fiche' });
      lue(null);
      expect(await poserArbitrage(avecPosition, ctx())).toEqual({ issue: 'refusee', raison: 'position_autre_fiche' });
      prismaMock.positionExpertVersion.findUnique.mockResolvedValue(null);
      expect(await poserArbitrage(avecPosition, ctx())).toEqual({ issue: 'refusee', raison: 'position_introuvable' });
    });

    it('à relire (appui absent du corpus) : refusée', async () => {
      lue('FU_BANC_A', ['WN-CL-0009-009@v1.0']);
      expect(await poserArbitrage(avecPosition, ctx())).toEqual({
        issue: 'refusee',
        raison: 'position_a_relire',
        claims: ['WN-CL-0009-009@v1.0'],
      });
    });

    it('relue sous le verrou du couple PUIS de la position : non signée, retirée ou remplacée ⇒ refusée', async () => {
      lue('FU_BANC_A');
      tx.positionExpertVersion.findUnique.mockResolvedValue({ revisePar: null, actes: [] });
      expect(await poserArbitrage(avecPosition, ctx())).toEqual({ issue: 'refusee', raison: 'position_hors_vigueur' });
      expect(verrous()).toEqual(['cs|CS-BANC-01|FU_BANC_A', 'pe|WN-PE-0001']);
      tx.positionExpertVersion.findUnique.mockResolvedValue({ revisePar: { id: 'x' }, actes: [{ ordre: BigInt(1), acte: 'signee' }] });
      expect(await poserArbitrage(avecPosition, ctx())).toEqual({ issue: 'refusee', raison: 'position_hors_vigueur' });
      tx.positionExpertVersion.findUnique.mockResolvedValue({ revisePar: null, actes: [{ ordre: BigInt(1), acte: 'signee' }] });
      expect((await poserArbitrage(avecPosition, ctx())).issue).toBe('ecrite');
      expect(tx.arbitrageConflitSource.create.mock.calls[0][0].data).toMatchObject({ claimRetenu: null, idPositionVersion: 'pv000001' });
    });
  });
});

describe('révoquer un arbitrage', () => {
  const demande = { conflitId: 'CS-DEPUBLIE-01', ficheId: 'FU_BANC_A', teteVue: 'tete1', motif: 'm', auteur: 'r@exemple.fr' };

  it('sans tête, ou une autre tête : refusée', async () => {
    tx.arbitrageConflitSource.findFirst.mockResolvedValue(null);
    expect(await revoquerArbitrage(demande)).toEqual({ issue: 'refusee', raison: 'etat_divergent' });
    tx.arbitrageConflitSource.findFirst.mockResolvedValue({ id: 'tete2' });
    expect(await revoquerArbitrage(demande)).toEqual({ issue: 'refusee', raison: 'etat_divergent' });
  });

  it('révoque la tête, même d’un conflit qui n’est plus au registre (coupe-circuit)', async () => {
    tx.arbitrageConflitSource.findFirst.mockResolvedValue({ id: 'tete1' });
    tx.arbitrageConflitSource.create.mockResolvedValue({ id: 'r1', ordre: BigInt(9), acte: 'revocation' });
    expect((await revoquerArbitrage(demande)).issue).toBe('ecrite');
    expect(tx.arbitrageConflitSource.create.mock.calls[0][0].data).toMatchObject({ acte: 'revocation', idArbitrageRemplace: 'tete1' });
    expect(tx.arbitrageConflitSource.create.mock.calls[0][0].data).not.toHaveProperty('conflitSha256');
  });
});
