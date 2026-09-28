import { beforeEach, describe, expect, it, vi } from 'vitest';

// La lecture des faits, le jeton et l'écriture des remises ([[D-251]] §7,
// lot 8). Le client est simulé ; ce que la BASE refuse (référence, empreinte,
// provenance, idempotence) est éprouvé par le contrat SQL de M2. Données
// synthétiques seulement.

const { controlerVersion } = vi.hoisted(() => ({ controlerVersion: vi.fn() }));
vi.mock('./controle', () => ({ controlerVersion }));

import { apercuFichesDuProtocole, remettreFiches } from './remise';
import type { ActionPourApercu, ApercuFiches } from './apercuRemise';

const H = (c: string) => c.repeat(64);
const REF = { contractVersion: 'c5-recommended-plate-ref-v1', catalogVersion: 'c', contentHash: 'h', refHash: 'r' } as const;

function alimentation(actionId: string, plateCode: string): ActionPourApercu {
  return {
    actionId,
    type: 'food',
    interventionStatus: 'active',
    recommendedPlateRef: { ...REF, plateCode } as ActionPourApercu['recommendedPlateRef'],
  };
}

function acte(acteNom: 'validee' | 'retiree', ordre: number, contenuSha256: string) {
  return {
    ordre: BigInt(ordre),
    acte: acteNom,
    contenuSha256,
    validateur: 'praticien@wellneuro.fr',
    relectureIntegrale: acteNom === 'validee',
    motif: acteNom === 'retiree' ? 'Motif synthétique.' : null,
    le: new Date('2026-09-28T00:00:00Z'),
  };
}

function version(id: string, sourceId: string, plateCode: string, numero: number, empreinte: string, actes: ReturnType<typeof acte>[]) {
  return { id, sourceId, plateCode, numero, contenu: {}, contenuSha256: empreinte, texteSource: 'Source synthétique.', actes };
}

function client(entrees: { versions?: unknown[]; remises?: unknown[]; count?: number } = {}) {
  return {
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(async () => 1),
    ficheAssietteVersion: {
      findMany: vi.fn(async () => entrees.versions ?? []),
      findUnique: vi.fn(async () => ({ contenu: {}, texteSource: 'Source synthétique.' })),
    },
    ficheAssietteRemise: {
      findMany: vi.fn(async () => entrees.remises ?? []),
      createMany: vi.fn(async ({ data }: { data: unknown[] }) => ({ count: entrees.count ?? data.length })),
    },
  };
}

// ASSIETTE_PROTEINEE → WN-SRC-0300, ASSIETTE_VEGETALE → WN-SRC-0296 (`appariement.ts`).
const ACTIONS = [alimentation('a1', 'ASSIETTE_PROTEINEE'), alimentation('a2', 'ASSIETTE_VEGETALE')];

beforeEach(() => {
  vi.clearAllMocks();
  controlerVersion.mockResolvedValue({ contenu: {}, anomalies: [], claimsValides: new Map() });
});

describe('apercuFichesDuProtocole', () => {
  it('au clic, verrouille chaque fiche UNE fois, dans l’ordre des fiches — jamais à la simple lecture', async () => {
    const c = client();
    const actions = [...ACTIONS, alimentation('a3', 'ASSIETTE_PROTEINEE')];
    await apercuFichesDuProtocole(c as never, { idPatient: 'P', protocolDraftInputHash: 'H', actions, blocage: null }, { verrouiller: true });
    const cles = c.$executeRaw.mock.calls.map(appel => (appel as unknown[])[1]);
    expect(cles).toEqual(['fiches_assiette_actes:WN-SRC-0296', 'fiches_assiette_actes:WN-SRC-0300']);

    const lecture = client();
    await apercuFichesDuProtocole(lecture as never, { idPatient: 'P', protocolDraftInputHash: 'H', actions, blocage: null }, { verrouiller: false });
    expect(lecture.$executeRaw).not.toHaveBeenCalled();
  });

  it('la référence est la plus haute version VALIDÉE, et seuls ses contrôles sont rejoués', async () => {
    const c = client({
      versions: [
        version('v1', 'WN-SRC-0300', 'ASSIETTE_PROTEINEE', 1, H('a'), [acte('validee', 1, H('a'))]),
        version('v2', 'WN-SRC-0300', 'ASSIETTE_PROTEINEE', 2, H('b'), [acte('retiree', 3, H('b'))]),
        version('v3', 'WN-SRC-0300', 'ASSIETTE_PROTEINEE', 3, H('c'), []),
      ],
    });
    const apercu = await apercuFichesDuProtocole(
      c as never,
      { idPatient: 'P', protocolDraftInputHash: 'H', actions: [ACTIONS[0]], blocage: null },
      { verrouiller: false },
    );
    expect(apercu.lignes[0]).toMatchObject({ statut: 'part', idVersion: 'v1', numero: 1, contenuSha256: H('a') });
    expect(controlerVersion).toHaveBeenCalledTimes(1);
    expect(controlerVersion.mock.calls[0][0]).toMatchObject({ id: 'v1', texteSource: 'Source synthétique.' });
    // Les versions se lisent SANS leur texte ; seul celui de la référence est
    // chargé (constat de revue du lot 8).
    const selection = (c.ficheAssietteVersion.findMany.mock.calls[0] as unknown as [{ select: Record<string, unknown> }])[0].select;
    expect(selection.contenu).toBeUndefined();
    expect(selection.texteSource).toBeUndefined();
    expect(c.ficheAssietteVersion.findUnique).toHaveBeenCalledTimes(1);
    expect(c.ficheAssietteVersion.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'v1' } }));
  });

  it('une référence qui échoue aux contrôles ne part pas', async () => {
    controlerVersion.mockResolvedValue({ contenu: {}, anomalies: [{ code: 'claim_non_valide', detail: 'x' }], claimsValides: new Map() });
    const c = client({ versions: [version('v1', 'WN-SRC-0300', 'ASSIETTE_PROTEINEE', 1, H('a'), [acte('validee', 1, H('a'))])] });
    const apercu = await apercuFichesDuProtocole(
      c as never,
      { idPatient: 'P', protocolDraftInputHash: 'H', actions: [ACTIONS[0]], blocage: null },
      { verrouiller: false },
    );
    expect(apercu.lignes[0]).toMatchObject({ statut: 'ne_part_pas', motif: 'controles_echoues' });
  });

  it('la remise EN COURS est la dernière par `ordre` — la première que la base rend', async () => {
    const c = client({
      versions: [version('v1', 'WN-SRC-0300', 'ASSIETTE_PROTEINEE', 1, H('a'), [acte('validee', 1, H('a'))])],
      remises: [
        { idVersion: 'v1', version: { sourceId: 'WN-SRC-0300', numero: 1 } },
        { idVersion: 'v0', version: { sourceId: 'WN-SRC-0300', numero: 0 } },
      ],
    });
    const apercu = await apercuFichesDuProtocole(
      c as never,
      { idPatient: 'P', protocolDraftInputHash: 'H', actions: [ACTIONS[0]], blocage: null },
      { verrouiller: false },
    );
    expect(apercu.lignes[0]).toMatchObject({ statut: 'deja_remise' });
    expect(c.ficheAssietteRemise.findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: { ordre: 'desc' } }));
  });

  it('sous un blocage, rien n’est lu ni verrouillé, et rien ne part', async () => {
    const c = client();
    const apercu = await apercuFichesDuProtocole(
      c as never,
      { idPatient: 'P', protocolDraftInputHash: 'H', actions: ACTIONS, blocage: { motif: 'contrat_refuse', detail: 'x' } },
      { verrouiller: true },
    );
    expect(c.$executeRaw).not.toHaveBeenCalled();
    expect(c.ficheAssietteVersion.findMany).not.toHaveBeenCalled();
    expect(apercu.lignes.every(l => l.statut === 'ne_part_pas')).toBe(true);
  });

  it('le jeton est stable pour les mêmes faits, et change avec eux', async () => {
    const faits = { versions: [version('v1', 'WN-SRC-0300', 'ASSIETTE_PROTEINEE', 1, H('a'), [acte('validee', 1, H('a'))])] };
    const entrees = { idPatient: 'P', protocolDraftInputHash: 'H', actions: [ACTIONS[0]], blocage: null };
    const a = await apercuFichesDuProtocole(client(faits) as never, entrees, { verrouiller: false });
    const b = await apercuFichesDuProtocole(client(faits) as never, entrees, { verrouiller: true });
    expect(a.jeton).toMatch(/^[0-9a-f]{64}$/);
    expect(b.jeton).toBe(a.jeton);
    const retiree = await apercuFichesDuProtocole(
      client({ versions: [version('v1', 'WN-SRC-0300', 'ASSIETTE_PROTEINEE', 1, H('a'), [acte('retiree', 2, H('a'))])] }) as never,
      entrees,
      { verrouiller: false },
    );
    expect(retiree.jeton).not.toBe(a.jeton);
  });
});

describe('remettreFiches', () => {
  function apercu(lignes: Partial<ApercuFiches['lignes'][number]>[]): ApercuFiches {
    return {
      jeton: 'j',
      blocage: null,
      lignes: lignes.map(l => ({
        plateCode: 'X',
        libelle: 'X',
        sourceId: 'WN-SRC-0000',
        actionId: 'a',
        statut: 'part',
        idVersion: 'v',
        numero: 1,
        contenuSha256: H('a'),
        motif: null,
        detail: '',
        ...l,
      })),
    };
  }

  it('n’écrit que les fiches qui partent, dans l’ordre des fiches, rattachées à l’approbation', async () => {
    const c = client();
    const n = await remettreFiches(
      c as never,
      apercu([
        { sourceId: 'WN-SRC-0300', idVersion: 'vp', actionId: 'a1' },
        { sourceId: 'WN-SRC-0299', statut: 'deja_remise', idVersion: 'vd' },
        { sourceId: 'WN-SRC-0296', idVersion: 'vv', actionId: 'a2' },
        { sourceId: 'WN-SRC-0297', statut: 'ne_part_pas', motif: 'controles_echoues', idVersion: 've' },
      ]),
      { idPatient: 'P', idApprobation: 'APP' },
    );
    expect(n).toBe(2);
    expect(c.ficheAssietteRemise.createMany).toHaveBeenCalledWith({
      data: [
        { idPatient: 'P', idApprobation: 'APP', actionId: 'a2', idVersion: 'vv', contenuSha256: H('a') },
        { idPatient: 'P', idApprobation: 'APP', actionId: 'a1', idVersion: 'vp', contenuSha256: H('a') },
      ],
    });
  });

  it('rien à remettre : aucune écriture', async () => {
    const c = client();
    expect(await remettreFiches(c as never, apercu([{ statut: 'deja_remise' }]), { idPatient: 'P', idApprobation: 'APP' })).toBe(0);
    expect(c.ficheAssietteRemise.createMany).not.toHaveBeenCalled();
  });

  it('un compte écrit qui diffère de l’aperçu lève — la transaction est annulée plutôt que de rendre un nombre faux', async () => {
    const c = client({ count: 0 });
    await expect(remettreFiches(c as never, apercu([{}]), { idPatient: 'P', idApprobation: 'APP' })).rejects.toThrow(/0 ligne/);
  });
});
