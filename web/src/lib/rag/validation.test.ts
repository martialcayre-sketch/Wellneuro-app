import { describe, expect, it } from 'vitest';
import {
  embeddingTextForChunk,
  normalizeWellneuroText,
  parseRagIngestPayload,
  sha256WellneuroText,
} from '@/lib/rag/validation';

function validChunk() {
  const content = normalizeWellneuroText('---\nchunk_id: WN-CH-0056-001\n---\nContenu de test.  \r\n');
  return {
    batchId: 'LOT_013_2026-07-20',
    sourceId: 'WN-SRC-0056',
    chunkId: 'WN-CH-0056-001',
    versionSource: 'v1.0',
    versionChunk: 'v1.0',
    notebook: '09 — Nutrition et aliments vedettes',
    section: 'Oméga-3',
    content,
    contentSha256: sha256WellneuroText(content),
    sourceDriveId: 'drive-test-id',
    metadata: { arbitrages: 'D352-D356' },
    compartment: 'ACTIF',
    indexationAutorisee: true,
    patientIdentifiable: false,
  } as const;
}

describe('validation ingestion RAG', () => {
  it('normalise comme le pipeline documentaire', () => {
    expect(normalizeWellneuroText('\uFEFFa  \r\n\r\n')).toBe('a\n');
  });

  it('accepte un chunk actif non identifiable avec hash concordant', () => {
    const payload = parseRagIngestPayload({ chunks: [validChunk()] });
    expect(payload.chunks).toHaveLength(1);
    expect(payload.chunks[0].chunkId).toBe('WN-CH-0056-001');
  });

  it('refuse les données patient identifiables', () => {
    const chunk = { ...validChunk(), patientIdentifiable: true };
    expect(() => parseRagIngestPayload({ chunks: [chunk] })).toThrow(/patient identifiable/);
  });

  it('refuse un hash divergent', () => {
    const chunk = { ...validChunk(), contentSha256: '0'.repeat(64) };
    expect(() => parseRagIngestPayload({ chunks: [chunk] })).toThrow(/HASH_MISMATCH/);
  });

  it('dépouille le front matter pour l’embedding, hash intact sur le texte complet', () => {
    const chunk = validChunk();
    expect(embeddingTextForChunk(chunk.content)).toBe('Contenu de test.\n');
    expect(sha256WellneuroText(chunk.content)).toBe(chunk.contentSha256);
  });

  it('refuse un chunk réduit à son front matter', () => {
    const content = normalizeWellneuroText('---\nchunk_id: WN-CH-0056-001\n---\n');
    const chunk = { ...validChunk(), content, contentSha256: sha256WellneuroText(content) };
    expect(() => parseRagIngestPayload({ chunks: [chunk] })).toThrow(/vide/);
  });

  it('transporte les champs de traçabilité optionnels', () => {
    const chunk = {
      ...validChunk(),
      llmAmendmentModel: 'gpt-5',
      validationEvidence: 'https://drive.google.com/pv-lot-013',
    };
    const payload = parseRagIngestPayload({ chunks: [chunk] });
    expect(payload.chunks[0].llmAmendmentModel).toBe('gpt-5');
    expect(payload.chunks[0].validationEvidence).toBe('https://drive.google.com/pv-lot-013');
  });

  it('refuse les chunks d’audit par leur identifiant et leur compartiment', () => {
    const chunk = {
      ...validChunk(),
      chunkId: 'WN-CH-0056-AUDIT-001',
      compartment: 'AUDIT',
    };
    expect(() => parseRagIngestPayload({ chunks: [chunk] })).toThrow();
  });
});
