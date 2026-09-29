import { beforeEach, describe, expect, it, vi } from 'vitest';

// Le service patient des fiches remises ([[D-251]] §7-§8, lot 9). La base, la
// résolution du protocole servi et le rejeu des contrôles sont simulés ; les
// contrôles eux-mêmes ont leurs bancs (`controle.test.ts`). Données
// synthétiques seulement.

const { prisma, resolveProtocoleDiffuse, reconstructProtocolDraft, controlerVersion } = vi.hoisted(() => ({
  prisma: {
    ficheAssietteRemise: { findMany: vi.fn(), findFirst: vi.fn() },
    ficheAssietteVersion: { findMany: vi.fn() },
    protocolDraft: { findUnique: vi.fn() },
  },
  resolveProtocoleDiffuse: vi.fn(),
  reconstructProtocolDraft: vi.fn(),
  controlerVersion: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/protocol/portailProtocol', () => ({ resolveProtocoleDiffuse }));
vi.mock('@/lib/protocol/fromPrisma', () => ({ reconstructProtocolDraft }));
vi.mock('./controle', () => ({ controlerVersion }));

import { getRecommendedPlate } from '@/lib/food-compass/plates';
import { aDesFichesRemises, fichesALire, fichesRemisesAuPatient } from './servicePatient';
import type { ContenuFicheAssiette } from './types';

const H = (c: string) => c.repeat(64);
const ASSIETTE = 'ASSIETTE_EPARGNE_DIGESTIVE';
const AUTRE = 'ASSIETTE_PROTEINEE';

const CONTENU: ContenuFicheAssiette = {
  titre: 'Titre synthétique',
  precautions: [{ texte: 'Précaution synthétique.', claims: ['CLE-SENTINELLE'] }],
  sections: [{ titre: 'Section', blocs: [{ texte: 'Paragraphe.', provenance: { type: 'verbatim' } }] }],
};

function acte(nom: 'validee' | 'retiree', ordre: number, empreinte: string) {
  return {
    ordre: BigInt(ordre),
    acte: nom,
    contenuSha256: empreinte,
    validateur: 'VALIDATEUR-SENTINELLE',
    relectureIntegrale: nom === 'validee',
    motif: nom === 'retiree' ? 'MOTIF-SENTINELLE' : null,
    le: new Date('2026-09-28T08:00:00.000Z'),
  };
}

function remise(opts: {
  id: string;
  ordre: number;
  idVersion: string;
  numero?: number;
  plateCode?: string;
  sourceId?: string;
  empreinte?: string;
  empreinteRemise?: string;
  dernier: ReturnType<typeof acte> | null;
}) {
  const empreinte = opts.empreinte ?? H('a');
  return {
    id: opts.id,
    ordre: BigInt(opts.ordre),
    contenuSha256: opts.empreinteRemise ?? empreinte,
    remiseLe: new Date(`2026-09-28T0${opts.ordre}:00:00.000Z`),
    version: {
      id: opts.idVersion,
      sourceId: opts.sourceId ?? 'WN-SRC-0297',
      plateCode: opts.plateCode ?? ASSIETTE,
      numero: opts.numero ?? 1,
      contenuSha256: empreinte,
      actes: opts.dernier === null ? [] : [opts.dernier],
    },
  };
}

function versionEnBase(id: string, plateCode = ASSIETTE) {
  return { id, sourceId: 'WN-SRC-0297', plateCode, contenu: CONTENU, contenuSha256: H('a'), texteSource: 'SOURCE-SENTINELLE' };
}

function protocoleServiAvec(...plateCodes: string[]) {
  resolveProtocoleDiffuse.mockResolvedValue({ protocolDraftId: 'pd_1', protocolDraftInputHash: H('p') });
  prisma.protocolDraft.findUnique.mockResolvedValue({ payload: { synthetique: true } });
  reconstructProtocolDraft.mockReturnValue({
    actions: plateCodes.map((plateCode, i) => ({
      actionId: `action-${i + 1}`,
      type: 'food',
      interventionStatus: 'active',
      recommendedPlateRef: { plateCode },
    })),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  controlerVersion.mockImplementation(async (v: { contenu: ContenuFicheAssiette }) => ({
    contenu: v.contenu, anomalies: [], claimsValides: new Map(),
  }));
  prisma.ficheAssietteVersion.findMany.mockImplementation(async ({ where }: { where: { id: { in: string[] } } }) =>
    where.id.in.map(id => versionEnBase(id)));
  protocoleServiAvec(ASSIETTE);
});

describe('fichesRemisesAuPatient — la remise en cours de chaque fiche', () => {
  it('aucune remise : aucune fiche, et ni texte ni protocole ne sont lus', async () => {
    prisma.ficheAssietteRemise.findMany.mockResolvedValue([]);
    expect(await fichesRemisesAuPatient('PAT_TEST')).toEqual([]);
    expect(prisma.ficheAssietteVersion.findMany).not.toHaveBeenCalled();
    expect(resolveProtocoleDiffuse).not.toHaveBeenCalled();
  });

  it('lit les remises du SEUL patient demandé, de la plus récente à la plus ancienne', async () => {
    prisma.ficheAssietteRemise.findMany.mockResolvedValue([]);
    await fichesRemisesAuPatient('PAT_TEST');
    expect(prisma.ficheAssietteRemise.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { idPatient: 'PAT_TEST' },
      orderBy: { ordre: 'desc' },
    }));
  });

  it('une remise validée qui passe les contrôles est servie, avec son texte et son libellé de catalogue', async () => {
    prisma.ficheAssietteRemise.findMany.mockResolvedValue([
      remise({ id: 'rem_1', ordre: 1, idVersion: 'v1', dernier: acte('validee', 1, H('a')) }),
    ]);
    const [fiche] = await fichesRemisesAuPatient('PAT_TEST');
    expect(fiche).toEqual({
      idRemise: 'rem_1',
      libelle: getRecommendedPlate(ASSIETTE)?.label,
      numero: 1,
      remiseLe: '2026-09-28T01:00:00.000Z',
      etat: 'servie',
      protocole: 'actuel',
      contenu: { titre: 'Titre synthétique', precautions: ['Précaution synthétique.'], sections: [{ titre: 'Section', paragraphes: ['Paragraphe.'] }] },
    });
    expect(fiche.libelle).toEqual(expect.any(String));
  });

  it('v1 puis v2 remises : seule la v2 est servie, et seul son texte est chargé', async () => {
    prisma.ficheAssietteRemise.findMany.mockResolvedValue([
      remise({ id: 'rem_2', ordre: 2, idVersion: 'v2', numero: 2, dernier: acte('validee', 5, H('a')) }),
      remise({ id: 'rem_1', ordre: 1, idVersion: 'v1', numero: 1, dernier: acte('validee', 1, H('a')) }),
    ]);
    const fiches = await fichesRemisesAuPatient('PAT_TEST');
    expect(fiches.map(f => [f.idRemise, f.numero])).toEqual([['rem_2', 2]]);
    expect(prisma.ficheAssietteVersion.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: ['v2'] } } }));
  });

  it('la version en cours est retirée : l’entrée reste, sans texte, et le texte n’est même pas chargé', async () => {
    prisma.ficheAssietteRemise.findMany.mockResolvedValue([
      remise({ id: 'rem_2', ordre: 2, idVersion: 'v2', numero: 2, dernier: acte('retiree', 6, H('a')) }),
      remise({ id: 'rem_1', ordre: 1, idVersion: 'v1', numero: 1, dernier: acte('validee', 1, H('a')) }),
    ]);
    const fiches = await fichesRemisesAuPatient('PAT_TEST');
    expect(fiches).toHaveLength(1);
    expect(fiches[0]).toMatchObject({ idRemise: 'rem_2', numero: 2, etat: 'retiree', contenu: null });
    expect(prisma.ficheAssietteVersion.findMany).not.toHaveBeenCalled();
    expect(controlerVersion).not.toHaveBeenCalled();
  });

  it('une version qui ne passe plus les contrôles n’est pas servie, et c’est dit (§6)', async () => {
    controlerVersion.mockResolvedValue({
      contenu: CONTENU, anomalies: [{ code: 'claim_non_valide', detail: 'x' }], claimsValides: new Map(),
    });
    prisma.ficheAssietteRemise.findMany.mockResolvedValue([
      remise({ id: 'rem_1', ordre: 1, idVersion: 'v1', dernier: acte('validee', 1, H('a')) }),
    ]);
    const [fiche] = await fichesRemisesAuPatient('PAT_TEST');
    expect(fiche).toMatchObject({ etat: 'indisponible', contenu: null });
  });

  it('un contenu illisible n’est pas servi', async () => {
    controlerVersion.mockResolvedValue({
      contenu: null, anomalies: [{ code: 'contenu_illisible', detail: 'x' }], claimsValides: new Map(),
    });
    prisma.ficheAssietteRemise.findMany.mockResolvedValue([
      remise({ id: 'rem_1', ordre: 1, idVersion: 'v1', dernier: acte('validee', 1, H('a')) }),
    ]);
    const [fiche] = await fichesRemisesAuPatient('PAT_TEST');
    expect(fiche).toMatchObject({ etat: 'indisponible', contenu: null });
  });

  it('une remise dont l’empreinte n’est pas celle de sa version n’est ni contrôlée ni servie', async () => {
    prisma.ficheAssietteRemise.findMany.mockResolvedValue([
      remise({ id: 'rem_1', ordre: 1, idVersion: 'v1', empreinteRemise: H('b'), dernier: acte('validee', 1, H('a')) }),
    ]);
    const [fiche] = await fichesRemisesAuPatient('PAT_TEST');
    expect(fiche).toMatchObject({ etat: 'indisponible', contenu: null });
    expect(controlerVersion).not.toHaveBeenCalled();
  });

  it('une panne du rejeu retient CETTE fiche seulement : les autres restent, retirées comprises (§7)', async () => {
    const avertissement = vi.spyOn(console, 'warn').mockImplementation(() => {});
    controlerVersion.mockImplementation(async (v: { id: string; contenu: ContenuFicheAssiette }) => {
      if (v.id === 'vb') throw new Error('CORPUS-SENTINELLE');
      return { contenu: v.contenu, anomalies: [], claimsValides: new Map() };
    });
    prisma.ficheAssietteRemise.findMany.mockResolvedValue([
      remise({ id: 'rem_c', ordre: 3, idVersion: 'vc', sourceId: 'WN-SRC-0301', dernier: acte('retiree', 9, H('a')) }),
      remise({ id: 'rem_b', ordre: 2, idVersion: 'vb', sourceId: 'WN-SRC-0300', dernier: acte('validee', 4, H('a')) }),
      remise({ id: 'rem_a', ordre: 1, idVersion: 'va', sourceId: 'WN-SRC-0297', dernier: acte('validee', 1, H('a')) }),
    ]);
    const fiches = await fichesRemisesAuPatient('PAT_TEST');
    expect(fiches.map(f => [f.idRemise, f.etat])).toEqual([['rem_c', 'retiree'], ['rem_b', 'indisponible'], ['rem_a', 'servie']]);
    const journalise = avertissement.mock.calls.flat().map(a => (a instanceof Error ? `${a.name}: ${a.message}` : String(a))).join(' ');
    expect(journalise).not.toContain('CORPUS-SENTINELLE');
    avertissement.mockRestore();
  });

  it('un retrait sans motif est un état qu’on ne sait pas lire : indisponible, pas retirée', async () => {
    prisma.ficheAssietteRemise.findMany.mockResolvedValue([
      remise({ id: 'rem_1', ordre: 1, idVersion: 'v1', dernier: { ...acte('retiree', 2, H('a')), motif: null } }),
    ]);
    const [fiche] = await fichesRemisesAuPatient('PAT_TEST');
    expect(fiche).toMatchObject({ etat: 'indisponible', contenu: null });
  });

  it('une version sans acte lisible n’est pas servie (`DC-24`)', async () => {
    prisma.ficheAssietteRemise.findMany.mockResolvedValue([
      remise({ id: 'rem_1', ordre: 1, idVersion: 'v1', dernier: null }),
    ]);
    const [fiche] = await fichesRemisesAuPatient('PAT_TEST');
    expect(fiche).toMatchObject({ etat: 'indisponible', contenu: null });
  });

  it('rien de ce qui est propre au cabinet ne sort : motif, validateur, claims, texte source', async () => {
    prisma.ficheAssietteRemise.findMany.mockResolvedValue([
      remise({ id: 'rem_a', ordre: 3, idVersion: 'va', sourceId: 'WN-SRC-0297', dernier: acte('retiree', 9, H('a')) }),
      remise({ id: 'rem_b', ordre: 2, idVersion: 'vb', sourceId: 'WN-SRC-0300', plateCode: AUTRE, dernier: acte('validee', 4, H('a')) }),
    ]);
    const serialise = JSON.stringify(await fichesRemisesAuPatient('PAT_TEST'));
    for (const sentinelle of ['MOTIF-SENTINELLE', 'VALIDATEUR-SENTINELLE', 'CLE-SENTINELLE', 'SOURCE-SENTINELLE']) {
      expect(serialise).not.toContain(sentinelle);
    }
  });
});

describe('fichesRemisesAuPatient — la place de l’assiette dans le protocole servi', () => {
  beforeEach(() => {
    prisma.ficheAssietteRemise.findMany.mockResolvedValue([
      remise({ id: 'rem_1', ordre: 1, idVersion: 'v1', dernier: acte('validee', 1, H('a')) }),
    ]);
  });

  it('le protocole servi ne porte plus l’assiette : plus_actuel, et la fiche reste lisible', async () => {
    protocoleServiAvec(AUTRE);
    const [fiche] = await fichesRemisesAuPatient('PAT_TEST');
    expect(fiche).toMatchObject({ protocole: 'plus_actuel', etat: 'servie' });
  });

  it.each([
    ['conditionnelle_biologie', 'actuel'],
    ['differee', 'actuel'],
    ['contre_indiquee', 'plus_actuel'],
    ['non_indiquee_actuellement', 'plus_actuel'],
  ])('l’action qui porte l’assiette passe « %s » : %s', async (statut, attendu) => {
    reconstructProtocolDraft.mockReturnValue({
      actions: [{ actionId: 'action-1', type: 'food', interventionStatus: statut, recommendedPlateRef: { plateCode: ASSIETTE } }],
    });
    const [fiche] = await fichesRemisesAuPatient('PAT_TEST');
    expect(fiche.protocole).toBe(attendu);
  });

  it('brouillon approuvé introuvable : inconnu', async () => {
    prisma.protocolDraft.findUnique.mockResolvedValue(null);
    const [fiche] = await fichesRemisesAuPatient('PAT_TEST');
    expect(fiche.protocole).toBe('inconnu');
    expect(reconstructProtocolDraft).not.toHaveBeenCalled();
  });

  it('se lit sur le brouillon APPROUVÉ, relu avec son empreinte', async () => {
    await fichesRemisesAuPatient('PAT_TEST');
    expect(resolveProtocoleDiffuse).toHaveBeenCalledWith('PAT_TEST');
    expect(prisma.protocolDraft.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'pd_1' } }));
    expect(reconstructProtocolDraft).toHaveBeenCalledWith({ synthetique: true }, H('p'));
  });

  it('aucun protocole servi : inconnu, jamais « plus actuel »', async () => {
    resolveProtocoleDiffuse.mockResolvedValue(null);
    const [fiche] = await fichesRemisesAuPatient('PAT_TEST');
    expect(fiche).toMatchObject({ protocole: 'inconnu', etat: 'servie' });
  });

  it('un protocole illisible tait la mention sans retenir la fiche', async () => {
    const avertissement = vi.spyOn(console, 'warn').mockImplementation(() => {});
    reconstructProtocolDraft.mockImplementation(() => { throw new Error('PAYLOAD-SENTINELLE'); });
    const [fiche] = await fichesRemisesAuPatient('PAT_TEST');
    expect(fiche).toMatchObject({ protocole: 'inconnu', etat: 'servie' });
    // `JSON.stringify` d'une `Error` rend `{}` : on lit son message en clair.
    const journalise = avertissement.mock.calls.flat().map(a => (a instanceof Error ? `${a.name}: ${a.message}` : String(a))).join(' ');
    expect(journalise).not.toContain('PAYLOAD-SENTINELLE');
    avertissement.mockRestore();
  });

  it('une panne de la résolution tait la mention sans retenir la fiche', async () => {
    const avertissement = vi.spyOn(console, 'warn').mockImplementation(() => {});
    resolveProtocoleDiffuse.mockRejectedValue(new Error('base'));
    const [fiche] = await fichesRemisesAuPatient('PAT_TEST');
    expect(fiche).toMatchObject({ protocole: 'inconnu', etat: 'servie' });
    avertissement.mockRestore();
  });
});

describe('fichesALire — la route des lectures (revue du lot 10, P2-2)', () => {
  it('les SEULES fiches servies, dans la forme du fil — sans texte, et sans résoudre le protocole', async () => {
    prisma.ficheAssietteRemise.findMany.mockResolvedValue([
      remise({ id: 'rem_servie', ordre: 3, idVersion: 'v1', sourceId: 'WN-SRC-0297', dernier: acte('validee', 1, H('a')) }),
      remise({ id: 'rem_retiree', ordre: 2, idVersion: 'v2', sourceId: 'WN-SRC-0300', plateCode: AUTRE, dernier: acte('retiree', 2, H('a')) }),
    ]);
    const fiches = await fichesALire('PAT_TEST');
    expect(fiches).toEqual([
      { idRemise: 'rem_servie', libelle: getRecommendedPlate(ASSIETTE)?.label, remiseLe: '2026-09-28T03:00:00.000Z' },
    ]);
    expect(resolveProtocoleDiffuse).not.toHaveBeenCalled();
    expect(prisma.protocolDraft.findUnique).not.toHaveBeenCalled();
  });

  it('une fiche qui ne passe plus les contrôles n’est pas à lire', async () => {
    const avertissement = vi.spyOn(console, 'warn').mockImplementation(() => {});
    prisma.ficheAssietteRemise.findMany.mockResolvedValue([
      remise({ id: 'rem_1', ordre: 1, idVersion: 'v1', dernier: acte('validee', 1, H('a')) }),
    ]);
    controlerVersion.mockRejectedValue(new Error('claims'));
    expect(await fichesALire('PAT_TEST')).toEqual([]);
    avertissement.mockRestore();
  });

  it('aucune remise : rien, et rien n’est chargé', async () => {
    prisma.ficheAssietteRemise.findMany.mockResolvedValue([]);
    expect(await fichesALire('PAT_TEST')).toEqual([]);
    expect(prisma.ficheAssietteVersion.findMany).not.toHaveBeenCalled();
  });
});

describe('aDesFichesRemises — ce qui fait paraître l’accès (lot 10)', () => {
  it.each([
    [{ id: 'rem_1' }, true],
    [null, false],
  ])('remise lue %j : %s, pour le SEUL patient demandé, sans aucun texte', async (ligne, attendu) => {
    prisma.ficheAssietteRemise.findFirst.mockResolvedValue(ligne);
    expect(await aDesFichesRemises('PAT_TEST')).toBe(attendu);
    expect(prisma.ficheAssietteRemise.findFirst).toHaveBeenCalledWith({ where: { idPatient: 'PAT_TEST' }, select: { id: true } });
    expect(prisma.ficheAssietteVersion.findMany).not.toHaveBeenCalled();
  });
});
