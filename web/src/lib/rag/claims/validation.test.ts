import { describe, expect, it } from 'vitest';
import { normalizeWellneuroText, sha256WellneuroText } from '@/lib/rag/validation';
import {
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

  it('vectorise l’affirmation normalisée', () => {
    const claim = validClaim();
    expect(embeddingTextForClaim(claim.texteNormalise)).toBe(
      'Les oméga-3 EPA/DHA soutiennent la fonction cognitive.\n',
    );
  });
});
