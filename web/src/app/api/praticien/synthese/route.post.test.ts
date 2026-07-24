import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readEventStream, type SseEvent } from '@/lib/sse/readEventStream';

// Génération de synthèse (POST) — les DEUX transports. Le flag WN_SYNTHESE_STREAM
// (défaut off) sélectionne JSON (historique, Vercel) ou SSE (Scalingo).
const { getServerSession, prisma, anthropicCreate, validateSyntheseSchema } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findFirst: vi.fn() },
    questionnaireReponse: { findMany: vi.fn() },
    consultation: { findFirst: vi.fn() },
    syntheseIA: { create: vi.fn() },
    auditSynthese: { create: vi.fn() },
  },
  anthropicCreate: vi.fn(),
  validateSyntheseSchema: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/generated/prisma', () => ({ Prisma: { DbNull: Symbol('DbNull') } }));
vi.mock('@/lib/praticien/appartenance', () => ({
  emailPraticien: (s: { user?: { email?: string } } | null) => s?.user?.email?.toLowerCase() ?? null,
  filtrePatientsDuPraticien: (email: string) => ({ praticienEmail: { equals: email, mode: 'insensitive' } }),
}));
vi.mock('@/lib/praticien/journalAcces', () => ({ journaliserAccesDossier: vi.fn() }));
vi.mock('@/lib/anthropic', () => ({
  anthropic: { messages: { create: anthropicCreate } },
  CLAUDE_MODEL: 'claude-test',
  SYSTEM_PROMPT_SYNTHESE: '',
  VERSION_CORPUS_SYNTHESE: 'v',
  VERSION_PROMPT_SYNTHESE: 'v',
  VERSION_SCHEMA_SYNTHESE: 'v',
  validateSyntheseSchema,
  sanitizeAuditError: (m: string) => m,
  CORPUS_CLINIQUE_ACTIF: '',
}));
vi.mock('@/lib/clinical/corpusSyntheseV1', () => ({ CORPUS_CLINIQUE_METADATA: {}, CORPUS_CLINIQUE_SHA256: 'sha' }));
vi.mock('@/lib/scoring/miniSynthese', () => ({ buildMiniSynthese: () => ({}) }));
vi.mock('@/lib/consultation/contexteClinique', () => ({
  buildContexteClinique: () => '',
  extraireVigilanceDeterministe: () => [] as string[],
}));
vi.mock('@/lib/observability/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), security: vi.fn() } }));
vi.mock('@/lib/observability/eventCodes', () => ({ EVENT_CODES: {} }));
vi.mock('@/lib/observability/requestContext', () => ({
  createRequestContext: () => ({}),
  finalizeLogContext: (_c: unknown, x: unknown) => x,
  withCorrelationHeader: (res: unknown) => res,
}));

import { POST } from './route';

function req(body: unknown): Request {
  return new Request('http://x/api/praticien/synthese', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

const CORPS = { idPatient: 'PAT_SEED_01' };

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ANTHROPIC_API_KEY = 'test-key';
  delete process.env.WN_SYNTHESE_STREAM;
  getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
  prisma.patient.findFirst.mockResolvedValue({ idPatient: 'PAT_SEED_01', email: 'pat@example.com' });
  prisma.questionnaireReponse.findMany.mockResolvedValue([
    { titre: 'BDI', dateReponse: new Date('2026-07-10'), scoresJson: {}, scorePrincipal: 12, interpretation: null },
  ]);
  prisma.consultation.findFirst.mockResolvedValue(null);
  validateSyntheseSchema.mockReturnValue({ points_de_vigilance: [] });
  anthropicCreate.mockResolvedValue({
    content: [{ type: 'text', text: '{"resume_praticien":"ok"}' }],
    stop_reason: 'end_turn',
    usage: {},
  });
  prisma.syntheseIA.create.mockResolvedValue({ idSynthese: 'SYN_1', dateGeneration: new Date('2026-07-20T00:00:00Z') });
  prisma.auditSynthese.create.mockResolvedValue({});
});

afterEach(() => {
  delete process.env.WN_SYNTHESE_STREAM;
});

describe('POST /api/praticien/synthese — gardes (indépendantes du transport)', () => {
  it('sans session : 401 JSON', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await POST(req(CORPS));
    expect(res.status).toBe(401);
    expect(anthropicCreate).not.toHaveBeenCalled();
  });

  it('patient d’un autre praticien : 404 JSON, aucun appel modèle', async () => {
    prisma.patient.findFirst.mockResolvedValue(null);
    const res = await POST(req(CORPS));
    expect(res.status).toBe(404);
    expect(anthropicCreate).not.toHaveBeenCalled();
  });

  it('aucun questionnaire : 422', async () => {
    prisma.questionnaireReponse.findMany.mockResolvedValue([]);
    const res = await POST(req(CORPS));
    expect(res.status).toBe(422);
  });
});

describe('POST /api/praticien/synthese — transport JSON (défaut, Vercel)', () => {
  it('cas nominal : 200 JSON avec la synthèse persistée', async () => {
    const res = await POST(req(CORPS));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
    const d = await res.json();
    expect(d.success).toBe(true);
    expect(d.idSynthese).toBe('SYN_1');
    expect(prisma.syntheseIA.create).toHaveBeenCalledOnce();
  });
});

describe('POST /api/praticien/synthese — transport SSE (Scalingo, flag ON)', () => {
  beforeEach(() => {
    process.env.WN_SYNTHESE_STREAM = 'true';
  });

  it('répond en text/event-stream et émet un event: done avec la synthèse', async () => {
    const res = await POST(req(CORPS));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');

    const events: SseEvent[] = [];
    await readEventStream(res, e => events.push(e));
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe('done');
    const payload = JSON.parse(events[0].data);
    expect(payload.success).toBe(true);
    expect(payload.idSynthese).toBe('SYN_1');
    expect(prisma.syntheseIA.create).toHaveBeenCalledOnce();
  });

  it('échec du modèle : event: error, aucune synthèse persistée', async () => {
    anthropicCreate.mockRejectedValue(new Error('API indisponible'));
    const res = await POST(req(CORPS));
    expect(res.status).toBe(200);
    const events: SseEvent[] = [];
    await readEventStream(res, e => events.push(e));
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe('error');
    expect(prisma.syntheseIA.create).not.toHaveBeenCalled();
  });
});
