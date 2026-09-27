import { beforeEach, describe, expect, it, vi } from 'vitest';
import { canonicalSha256 } from '@/lib/clinical-engine/canonical';
import { FICHE_MY_PAR_ASSIETTE } from './appariement';
import { clesSecuriteDeLAssiette } from './securite';
import type { ContenuFicheAssiette } from './types';

const { findMany, findUnique, queryRaw } = vi.hoisted(() => ({
  findMany: vi.fn(),
  findUnique: vi.fn(),
  queryRaw: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: { ficheAssietteVersion: { findMany, findUnique }, $queryRaw: queryRaw },
}));

import { controlerVersion } from './controle';
import { lireRayonFichesConseils, lireVersionFiche } from './lecture';

// Texte SYNTHÉTIQUE uniquement ([[D-251]] §4).
const SECURITE = clesSecuriteDeLAssiette('ASSIETTE_PROTEINEE');
const CLAIM_FICHE = 'WN-CL-0300-002::v1.0';
const CONTENU: ContenuFicheAssiette = {
  titre: 'Titre synthétique',
  precautions: [],
  sections: [
    {
      titre: 'Section synthétique',
      blocs: [{ texte: 'Reformulation synthétique.', provenance: { type: 'claims', claims: [CLAIM_FICHE] } }],
    },
  ],
};
const SHA = canonicalSha256(CONTENU);
const LE = new Date('2026-09-27T10:00:00.000Z');

function acte(ordre: bigint, over: Record<string, unknown> = {}) {
  return { ordre, acte: 'validee', contenuSha256: SHA, validateur: 'x@exemple.fr', relectureIntegrale: true, motif: null, le: LE, ...over };
}

function version(over: Record<string, unknown> = {}) {
  return { id: 'v', sourceId: 'WN-SRC-0300', numero: 1, creeLe: LE, contenuSha256: SHA, actes: [], ...over };
}

describe('lireRayonFichesConseils — les douze assiettes et l’état de leur fiche', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rend les douze assiettes, dans l’ordre de l’appariement, sans texte de fiche', async () => {
    findMany.mockResolvedValue([]);
    const rayon = await lireRayonFichesConseils();
    expect(rayon.map(l => l.plateCode)).toEqual(Object.keys(FICHE_MY_PAR_ASSIETTE));
    expect(rayon.every(l => l.derniere === null && l.nbVersions === 0)).toBe(true);
    const select = findMany.mock.calls[0][0].select;
    expect(select.contenu).toBeUndefined();
    expect(select.texteSource).toBeUndefined();
    // Le dernier acte au sens d’ordre, jamais de `le`.
    expect(select.actes.orderBy).toEqual({ ordre: 'desc' });
  });

  it('la dernière version, et la version servie quand ce n’est pas la même', async () => {
    findMany.mockResolvedValue([
      version({ id: 'v3', numero: 3 }),
      version({ id: 'v2', numero: 2, actes: [acte(BigInt('9'))] }),
      version({ id: 'v1', numero: 1, actes: [acte(BigInt('4'))] }),
    ]);
    const ligne = (await lireRayonFichesConseils()).find(l => l.sourceId === 'WN-SRC-0300');
    expect(ligne?.nbVersions).toBe(3);
    expect(ligne?.derniere).toMatchObject({ id: 'v3', numero: 3, etat: { etat: 'a_valider' } });
    expect(ligne?.derniereValidee).toMatchObject({ id: 'v2', etat: { etat: 'validee', ordre: '9' } });
  });

  it('un état illisible remonte tel quel — jamais « à valider » (DC-24)', async () => {
    findMany.mockResolvedValue([version({ id: 'v1', actes: [acte(BigInt('2'), { acte: 'publiee' })] })]);
    const ligne = (await lireRayonFichesConseils()).find(l => l.sourceId === 'WN-SRC-0300');
    expect(ligne?.derniere?.etat).toEqual({ etat: 'illisible', raison: 'acte_inconnu' });
  });
});

describe('lireVersionFiche — la relecture côte à côte', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findMany.mockResolvedValue([]);
    queryRaw.mockImplementation(async (_g: unknown, ids: string[], versions: string[]) =>
      ids.map((claim_id, i) => ({ claim_id, version_claim: versions[i], texte_normalise: `Texte de ${claim_id}.` })),
    );
  });

  it('null quand la version n’existe pas', async () => {
    findUnique.mockResolvedValue(null);
    expect(await lireVersionFiche('inconnue00')).toBeNull();
  });

  it('rend texte source, contenu, jeton du dernier acte, et les contrôles REJOUÉS', async () => {
    findUnique.mockResolvedValue({
      ...version({ actes: [acte(BigInt('12'), { acte: 'retiree', motif: 'Motif synthétique.', relectureIntegrale: false })] }),
      plateCode: 'ASSIETTE_PROTEINEE',
      contenu: CONTENU,
      texteSource: 'Source synthétique.',
      sourceSha256: 'c'.repeat(64),
      modeleRedaction: 'redacteur-fictif',
      modeleFidelite: 'relecteur-fictif',
      versionConsigne: 'fiche-assiette-v1+0000000000000000',
    });
    const d = await lireVersionFiche('v');
    expect(d?.texteSource).toBe('Source synthétique.');
    expect(d?.contenu).toEqual(CONTENU);
    expect(d?.dernierActe).toBe('12');
    expect(d?.etat).toMatchObject({ etat: 'retiree', motif: 'Motif synthétique.' });
    expect(d?.actes[0]).toMatchObject({ ordre: '12', acte: 'retiree' });
    // La protéinée porte des réserves que ce contenu ne cite pas : la relecture le voit.
    expect(d?.anomalies.map(a => a.code)).toContain('precaution_manquante');
    expect(() => JSON.stringify(d)).not.toThrow();
  });

  it('les réserves attendues NON citées ont leur texte — une précaution manquante se relit contre elles', async () => {
    findUnique.mockResolvedValue({
      ...version(),
      plateCode: 'ASSIETTE_PROTEINEE',
      contenu: CONTENU,
      texteSource: 'Source synthétique.',
      sourceSha256: 'c'.repeat(64),
      modeleRedaction: 'r',
      modeleFidelite: 'f',
      versionConsigne: 'v',
    });
    const d = await lireVersionFiche('v');
    const reserve = d?.claimsCites.find(c => c.cle === SECURITE[0]);
    expect(SECURITE.length).toBeGreaterThan(0);
    expect(reserve).toMatchObject({ reserveAttendue: true });
    expect(reserve?.texte).toMatch(/^Texte de WN-CL-/);
    expect(d?.claimsCites.find(c => c.cle === CLAIM_FICHE)).toMatchObject({ reserveAttendue: false });
  });

  it('un claim cité qui n’est plus VALIDE s’affiche sans texte, et le contrôle le nomme', async () => {
    queryRaw.mockResolvedValue([]);
    findUnique.mockResolvedValue({
      ...version(),
      plateCode: 'ASSIETTE_DETOXICATION',
      sourceId: 'WN-SRC-0299',
      contenu: { ...CONTENU, sections: [{ titre: 'S', blocs: [{ texte: 'R.', provenance: { type: 'claims', claims: ['WN-CL-0299-001::v1.0'] } }] }] },
      contenuSha256: canonicalSha256({ ...CONTENU, sections: [{ titre: 'S', blocs: [{ texte: 'R.', provenance: { type: 'claims', claims: ['WN-CL-0299-001::v1.0'] } }] }] }),
      texteSource: 'Source.',
      sourceSha256: 'c'.repeat(64),
      modeleRedaction: 'r',
      modeleFidelite: 'f',
      versionConsigne: 'v',
    });
    const d = await lireVersionFiche('v');
    expect(d?.claimsCites).toEqual([{ cle: 'WN-CL-0299-001::v1.0', texte: null, reserveAttendue: false }]);
    expect(d?.anomalies.map(a => a.code)).toContain('claim_non_valide');
  });
});

describe('controlerVersion — ce que la base porte autour du contenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryRaw.mockImplementation(async (_g: unknown, ids: string[], versions: string[]) =>
      ids.map((claim_id, i) => ({ claim_id, version_claim: versions[i], texte_normalise: 'Claim.' })),
    );
  });

  it('une empreinte qui ne se redonne pas, un appariement faux : nommés', async () => {
    const r = await controlerVersion({
      sourceId: 'WN-SRC-0300',
      plateCode: 'ASSIETTE_DETOXICATION',
      contenu: CONTENU,
      contenuSha256: 'd'.repeat(64),
      texteSource: 'Source.',
    });
    expect(r.anomalies.map(a => a.code)).toEqual(expect.arrayContaining(['empreinte_divergente', 'appariement_divergent']));
  });
});
