import { beforeEach, describe, expect, it, vi } from 'vitest';
import { canonicalSha256 } from '@/lib/clinical-engine/canonical';
import type { BrouillonFiche } from './contrat';
import { clesSecuriteDeLAssiette } from './securite';

const { queryRaw, executeRaw, findFirst, create, transaction, claimsValides } = vi.hoisted(() => {
  const executeRaw = vi.fn();
  const findFirst = vi.fn();
  const create = vi.fn();
  return {
    queryRaw: vi.fn(),
    executeRaw,
    findFirst,
    create,
    transaction: vi.fn(async (fn: (tx: unknown) => unknown) =>
      fn({ $executeRaw: executeRaw, ficheAssietteVersion: { findFirst, create } }),
    ),
    claimsValides: vi.fn(),
  };
});

vi.mock('@/lib/prisma', () => ({ prisma: { $queryRaw: queryRaw, $transaction: transaction } }));
vi.mock('@/lib/rag/claims/validite', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/rag/claims/validite')>();
  return { ...actual, claimsValidesAuCorpus: claimsValides };
});

import { deposerBrouillonFiche } from './ingestion';

// Texte SYNTHÉTIQUE uniquement ([[D-251]] §4). Les réserves de sécurité, elles,
// sont celles de la table signée : c'est leur présence que la garde contrôle.
const SECURITE = clesSecuriteDeLAssiette('ASSIETTE_PROTEINEE');
const CLAIM_FICHE = 'WN-CL-0300-002::v1.0';

function brouillon(): BrouillonFiche {
  return {
    sourceId: 'WN-SRC-0300',
    plateCode: 'ASSIETTE_PROTEINEE',
    texteSource: 'Un texte source synthétique, écrit pour le banc.',
    sourceSha256: 'b'.repeat(64),
    modeleRedaction: 'modele-redacteur-fictif',
    modeleFidelite: 'modele-relecteur-fictif',
    versionConsigne: 'fiche-assiette-v1',
    contenu: {
      titre: 'Titre synthétique',
      precautions: SECURITE.length > 0 ? [{ texte: 'Parlez-en à votre praticien.', claims: SECURITE }] : [],
      sections: [
        {
          titre: 'Section synthétique',
          blocs: [
            { texte: 'un texte source synthétique', provenance: { type: 'verbatim' } },
            { texte: 'Deux 2 portions, reformulées.', provenance: { type: 'claims', claims: [CLAIM_FICHE] } },
          ],
        },
      ],
    },
  };
}

function toutesLesCles(b: BrouillonFiche): string[] {
  return [...b.contenu.precautions.flatMap(p => p.claims), CLAIM_FICHE];
}

describe('deposerBrouillonFiche — contrôler, puis déposer un BROUILLON (D-251, lot 4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    claimsValides.mockImplementation(async (refs: { claimId: string; versionClaim: string }[]) =>
      new Set(refs.map(r => `${r.claimId}::${r.versionClaim}`)),
    );
    // Le texte d'un claim cité autorise ses nombres : « 2 portions » vient d'ici.
    queryRaw.mockResolvedValue([{ texte_normalise: 'Claim synthétique : 2 portions.' }]);
    findFirst.mockResolvedValue(null);
    create.mockResolvedValue({ id: 'version-1', numero: 1 });
  });

  it('le banc porte bien des réserves de sécurité (sinon la garde des précautions serait vide)', () => {
    expect(SECURITE.length).toBeGreaterThan(0);
  });

  it('dépose la version 1, empreinte calculée côté serveur, verrou pris AVANT la lecture du numéro', async () => {
    const b = brouillon();
    const issue = await deposerBrouillonFiche(b);

    expect(issue).toEqual({
      issue: 'deposee',
      idVersion: 'version-1',
      numero: 1,
      contenuSha256: canonicalSha256(b.contenu),
    });
    expect(create).toHaveBeenCalledTimes(1);
    const data = create.mock.calls[0][0].data;
    expect(data.numero).toBe(1);
    expect(data.contenuSha256).toBe(canonicalSha256(b.contenu));
    // Aucun champ d'acte ni d'état n'est écrit : une version n'en porte pas.
    expect(Object.keys(data).sort()).toEqual(
      [
        'contenu',
        'contenuSha256',
        'modeleFidelite',
        'modeleRedaction',
        'numero',
        'plateCode',
        'sourceId',
        'sourceSha256',
        'texteSource',
        'versionConsigne',
      ].sort(),
    );

    const [gabarit, cle] = executeRaw.mock.calls[0];
    expect((gabarit as string[]).join('?')).toContain('pg_advisory_xact_lock(hashtext(');
    // La MÊME clé que le trigger d'insertion de la migration M1.
    expect(cle).toBe('fiches_assiette_versions:WN-SRC-0300');
    expect(executeRaw.mock.invocationCallOrder[0]).toBeLessThan(findFirst.mock.invocationCallOrder[0]);
  });

  it('numérote à la suite de la dernière version', async () => {
    findFirst.mockResolvedValue({ id: 'v3', numero: 3, contenuSha256: 'c'.repeat(64) });
    create.mockResolvedValue({ id: 'version-4', numero: 4 });
    const issue = await deposerBrouillonFiche(brouillon());
    expect(create.mock.calls[0][0].data.numero).toBe(4);
    expect(issue).toMatchObject({ issue: 'deposee', numero: 4 });
  });

  it('rejouer le même dépôt ne crée pas de doublon', async () => {
    const b = brouillon();
    findFirst.mockResolvedValue({
      id: 'v2',
      numero: 2,
      contenuSha256: canonicalSha256(b.contenu),
      texteSource: b.texteSource,
      sourceSha256: b.sourceSha256,
      modeleRedaction: b.modeleRedaction,
      modeleFidelite: b.modeleFidelite,
      versionConsigne: b.versionConsigne,
    });
    const issue = await deposerBrouillonFiche(b);
    expect(issue).toEqual({ issue: 'inchangee', idVersion: 'v2', numero: 2, contenuSha256: canonicalSha256(b.contenu) });
    expect(create).not.toHaveBeenCalled();
  });

  it('un même contenu sur une AUTRE source est une nouvelle version', async () => {
    const b = brouillon();
    findFirst.mockResolvedValue({
      id: 'v1',
      numero: 1,
      contenuSha256: canonicalSha256(b.contenu),
      texteSource: 'Une autre extraction.',
      sourceSha256: b.sourceSha256,
      modeleRedaction: b.modeleRedaction,
      modeleFidelite: b.modeleFidelite,
      versionConsigne: b.versionConsigne,
    });
    create.mockResolvedValue({ id: 'version-2', numero: 2 });
    expect(await deposerBrouillonFiche(b)).toMatchObject({ issue: 'deposee', numero: 2 });
  });

  it('REFUSE un claim cité qui n’est pas VALIDE au corpus, sans rien écrire', async () => {
    const b = brouillon();
    claimsValides.mockResolvedValue(new Set(toutesLesCles(b).filter(c => c !== CLAIM_FICHE)));
    const issue = await deposerBrouillonFiche(b);
    expect(issue.issue).toBe('refusee');
    expect(issue.issue === 'refusee' && issue.anomalies.map(a => a.code)).toContain('claim_non_valide');
    expect(transaction).not.toHaveBeenCalled();
  });

  it('REFUSE une réserve de sécurité omise (D-251 §6)', async () => {
    const b = brouillon();
    const sansReserve: BrouillonFiche = { ...b, contenu: { ...b.contenu, precautions: [] } };
    const issue = await deposerBrouillonFiche(sansReserve);
    expect(issue.issue === 'refusee' && issue.anomalies.map(a => a.code)).toContain('precaution_manquante');
    expect(transaction).not.toHaveBeenCalled();
  });

  it('REFUSE un nombre absent de la source ET des claims cités', async () => {
    const b = brouillon();
    const inventee: BrouillonFiche = {
      ...b,
      contenu: {
        ...b.contenu,
        sections: [
          {
            titre: 'Section synthétique',
            blocs: [{ texte: 'Pendant 12 semaines.', provenance: { type: 'claims', claims: [CLAIM_FICHE] } }],
          },
        ],
      },
    };
    const issue = await deposerBrouillonFiche(inventee);
    expect(issue.issue === 'refusee' && issue.anomalies.map(a => a.code)).toContain('nombre_hors_source');
    expect(transaction).not.toHaveBeenCalled();
  });

  it('ne lit le texte que des claims VALIDE', async () => {
    const b = brouillon();
    claimsValides.mockResolvedValue(new Set(toutesLesCles(b).filter(c => c !== CLAIM_FICHE)));
    await deposerBrouillonFiche(b);
    const [, ids] = queryRaw.mock.calls[0];
    expect(ids).not.toContain('WN-CL-0300-002');
  });
});
