import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { canonicalSha256 } from '@/lib/clinical-engine/canonical';
import type { BrouillonFiche } from './contrat';
import { clesSecuriteDeLAssiette } from './securite';

const { queryRaw, executeRaw, findFirst, create, transaction } = vi.hoisted(() => {
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
  };
});

vi.mock('@/lib/prisma', () => ({ prisma: { $queryRaw: queryRaw, $transaction: transaction } }));

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

/**
 * Le corpus simulé : chaque couple demandé revient, avec un texte synthétique
 * — sauf les clés `invalides`, que la requête filtrerait par ses prédicats. Le
 * texte d'un claim autorise ses nombres : « 2 portions » vient d'ici.
 */
function corpus(invalides: readonly string[] = []) {
  return async (_gabarit: unknown, ids: string[], versions: string[]) =>
    ids
      .map((claim_id, i) => ({ claim_id, version_claim: versions[i], texte_normalise: 'Claim synthétique : 2 portions.' }))
      .filter(l => !invalides.includes(`${l.claim_id}::${l.version_claim}`));
}

/** Le texte SQL du dernier `$queryRaw`, fragments recollés. */
function sql(): string {
  const [fragments] = queryRaw.mock.calls.at(-1) as [string[]];
  return fragments.join(' ? ');
}

/** Le bloc de prédicats d'une requête : de `WHERE c.active` à la fin de l'EXISTS. */
function predicats(source: string): string {
  const m = /WHERE c\.active = true[\s\S]*?WHERE s\.claim_pk = c\.id\s*\)/.exec(source);
  if (!m) throw new Error('Bloc de prédicats introuvable.');
  return m[0].replace(/\s+/g, ' ');
}

describe('deposerBrouillonFiche — contrôler, puis déposer un BROUILLON (D-251, lot 4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryRaw.mockImplementation(corpus());
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

  it('un même contenu adossé à une AUTRE extraction de la source est une nouvelle version', async () => {
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
    queryRaw.mockImplementation(corpus([CLAIM_FICHE]));
    const issue = await deposerBrouillonFiche(brouillon());
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

  // UNE SEULE LECTURE (constat de revue, #1234) : la validité et le texte
  // viennent de la même ligne, sans fenêtre entre deux requêtes.
  it('lit validité et texte en une seule requête, sous les prédicats de la récupération', async () => {
    await deposerBrouillonFiche(brouillon());
    expect(queryRaw).toHaveBeenCalledTimes(1);
    for (const fragment of [
      'c.active = true',
      "c.statut = 'VALIDE'",
      'c.patient_identifiable = false',
      "c.compartment = 'ACTIF'",
      'rag_corpus_claim_sources',
      'unnest',
    ]) {
      expect(sql()).toContain(fragment);
    }
  });

  // Les prédicats sont RECOPIÉS de `claimsValidesAuCorpus`, qui s'interdit de
  // rendre un texte : ce banc rougit le jour où l'un bouge sans l'autre.
  it('ses prédicats sont ceux de claimsValidesAuCorpus, mot pour mot', () => {
    const lire = (relatif: string) => readFileSync(path.join(process.cwd(), 'src', relatif), 'utf8');
    expect(predicats(lire('lib/fiches-assiette/ingestion.ts'))).toBe(
      predicats(lire('lib/rag/claims/validite.ts')),
    );
  });
});
