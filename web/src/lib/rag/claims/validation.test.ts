import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { RAG_MAX_BATCH_SIZE } from '@/lib/rag/config';
import { normalizeWellneuroText, sha256WellneuroText } from '@/lib/rag/validation';
import {
  RAG_MAX_CLAIMS_BATCH_SIZE,
  embeddingTextForClaim,
  parseRagClaimsIngestPayload,
} from '@/lib/rag/claims/validation';

function validClaim() {
  const texte = normalizeWellneuroText('Les oméga-3 EPA/DHA soutiennent la fonction cognitive.  \r\n');
  return {
    claimId: 'WN-CL-0056-001',
    sourceId: 'WN-SRC-0056',
    versionClaim: 'v1.0',
    texteNormalise: texte,
    contentSha256: sha256WellneuroText(texte),
    typologieLecture: 'interprété',
    metadata: { arbitrages: 'D352' },
    sources: [{ chunkId: 'WN-CH-0056-001', versionChunk: 'v1.0' }],
    patientIdentifiable: false,
    compartment: 'ACTIF',
  } as const;
}

describe('validation ingestion des claims RAG', () => {
  it('accepte un claim conforme et force le statut EN_ATTENTE_VALIDATION', () => {
    const payload = parseRagClaimsIngestPayload({ claims: [validClaim()] });
    expect(payload.claims).toHaveLength(1);
    expect(payload.claims[0].claimId).toBe('WN-CL-0056-001');
    expect(payload.claims[0].statut).toBe('EN_ATTENTE_VALIDATION');
    expect(payload.claims[0].prescriptif).toBe(false);
  });

  it('refuse toute tentative de poser VALIDE par l’ingestion', () => {
    const claim = { ...validClaim(), statut: 'VALIDE' };
    expect(() => parseRagClaimsIngestPayload({ claims: [claim] })).toThrow(/ne pose que/);
  });

  it('refuse un claim sans chunk source', () => {
    const claim = { ...validClaim(), sources: [] };
    expect(() => parseRagClaimsIngestPayload({ claims: [claim] })).toThrow(/au moins un/);
  });

  it('refuse les données patient identifiables', () => {
    const claim = { ...validClaim(), patientIdentifiable: true };
    expect(() => parseRagClaimsIngestPayload({ claims: [claim] })).toThrow(/patient identifiable/);
  });

  it('refuse un hash divergent', () => {
    const claim = { ...validClaim(), contentSha256: '0'.repeat(64) };
    expect(() => parseRagClaimsIngestPayload({ claims: [claim] })).toThrow(/HASH_MISMATCH/);
  });

  it('refuse une typologie de lecture hors liste', () => {
    const claim = { ...validClaim(), typologieLecture: 'supposé' };
    expect(() => parseRagClaimsIngestPayload({ claims: [claim] })).toThrow(/typologieLecture/);
  });

  it('refuse un identifiant de claim mal formé', () => {
    const claim = { ...validClaim(), claimId: 'WN-CL-56-1' };
    expect(() => parseRagClaimsIngestPayload({ claims: [claim] })).toThrow(/claimId invalide/);
  });

  it('refuse un chunk source mal formé', () => {
    const claim = { ...validClaim(), sources: [{ chunkId: 'WN-CH-56-1', versionChunk: 'v1.0' }] };
    expect(() => parseRagClaimsIngestPayload({ claims: [claim] })).toThrow(/chunkId invalide/);
  });

  it('refuse un claim citant deux fois le même chunk', () => {
    const claim = {
      ...validClaim(),
      sources: [
        { chunkId: 'WN-CH-0056-001', versionChunk: 'v1.0' },
        { chunkId: 'WN-CH-0056-001', versionChunk: 'v1.0' },
      ],
    };
    expect(() => parseRagClaimsIngestPayload({ claims: [claim] })).toThrow(/deux fois/);
  });

  it('refuse un doublon de claim dans la même requête', () => {
    expect(() =>
      parseRagClaimsIngestPayload({ claims: [validClaim(), validClaim()] }),
    ).toThrow(/dupliqué/);
  });

  it('transporte les champs de qualification optionnels', () => {
    const claim = {
      ...validClaim(),
      classeAutorite: 'consensus',
      niveauPreuve: 'B',
      modeleReviseur: 'claude-opus-4-8',
      prescriptif: true,
    };
    const payload = parseRagClaimsIngestPayload({ claims: [claim] });
    expect(payload.claims[0].classeAutorite).toBe('consensus');
    expect(payload.claims[0].niveauPreuve).toBe('B');
    expect(payload.claims[0].modeleReviseur).toBe('claude-opus-4-8');
    expect(payload.claims[0].prescriptif).toBe(true);
  });

  it('laisse traverser metadata intact, clé usage comprise', () => {
    const claim = {
      ...validClaim(),
      metadata: { arbitrages: 'D352', usage: 'orientation' },
    };
    const payload = parseRagClaimsIngestPayload({ claims: [claim] });
    expect(payload.claims[0].metadata).toEqual({ arbitrages: 'D352', usage: 'orientation' });
  });

  it('remplace un metadata absent par un objet vide', () => {
    const { metadata: _ignore, ...sansMetadata } = validClaim();
    const payload = parseRagClaimsIngestPayload({ claims: [sansMetadata] });
    expect(payload.claims[0].metadata).toEqual({});
  });

  it.each(['besoins', 'rubrique'])('refuse la clé %s : réservée au praticien (D-321)', (cle) => {
    expect(() =>
      parseRagClaimsIngestPayload({ claims: [{ ...validClaim(), metadata: { [cle]: [2] } }] }),
    ).toThrow(new RegExp(`metadata\\.${cle} est réservée au praticien`));
  });

  it('refuse un metadata qui n’est pas un objet', () => {
    expect(() =>
      parseRagClaimsIngestPayload({ claims: [{ ...validClaim(), metadata: ['orientation'] }] }),
    ).toThrow(/metadata/);
    expect(() =>
      parseRagClaimsIngestPayload({ claims: [{ ...validClaim(), metadata: null }] }),
    ).toThrow(/metadata/);
  });

  it('vectorise l’affirmation normalisée', () => {
    const claim = validClaim();
    expect(embeddingTextForClaim(claim.texteNormalise)).toBe(
      'Les oméga-3 EPA/DHA soutiennent la fonction cognitive.\n',
    );
  });
});

// Piège « lot d'ingestion de plus de 10 claims » : la route écrit tout le lot
// dans une transaction Prisma de 5 s ; 50 claims l'ont fait expirer contre la
// base de production (500, rien d'écrit), 10 passaient. Le plafond se juge
// donc au contrat, et les outils du dépôt le lisent au lieu de le recopier.
describe('plafond d’un lot de claims', () => {
  const lotDe = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      ...validClaim(),
      claimId: `WN-CL-0056-${String(i + 1).padStart(3, '0')}`,
    }));

  it('vaut 10, sous le plafond des chunks', () => {
    expect(RAG_MAX_CLAIMS_BATCH_SIZE).toBe(10);
    expect(RAG_MAX_CLAIMS_BATCH_SIZE).toBeLessThan(RAG_MAX_BATCH_SIZE);
  });

  it('accepte un lot au plafond', () => {
    expect(parseRagClaimsIngestPayload({ claims: lotDe(10) }).claims).toHaveLength(10);
  });

  it('refuse un lot au-delà, en disant la taille reçue et la consigne', () => {
    expect(() => parseRagClaimsIngestPayload({ claims: lotDe(11) })).toThrow(
      /ne peut pas dépasser 10 claims \(reçu 11\) : envoyer par paquets de 10 au plus/,
    );
  });

  it('les outils du dépôt qui découpent un lot lisent le plafond du contrat', () => {
    const racine = path.resolve(__dirname, '../../../../..');
    for (const outil of ['ingest.mjs', 'ingest-devlocal.mjs', 'draft.mjs']) {
      const texte = readFileSync(path.join(racine, 'tools/corpus/claims', outil), 'utf8');
      expect(texte, outil).toMatch(
        /\{[^}]*\bRAG_MAX_CLAIMS_BATCH_SIZE\b[^}]*\}\s*=\s*await import\('@\/lib\/rag\/claims\/validation'\)/,
      );
      // Aucune taille de lot écrite en chiffres : ni constante, ni pas de boucle, ni tranche.
      expect(texte, outil).not.toMatch(/RAG_MAX_BATCH\s*=\s*\d/);
      expect(texte, outil).not.toMatch(/\blot:\s*\d/);
      expect(texte, outil).not.toMatch(/\+=\s*\d{2,}\s*\)/);
      expect(texte, outil).not.toMatch(/slice\(\s*\w+\s*,\s*\w+\s*\+\s*\d+\s*\)/);
    }
  });
});
