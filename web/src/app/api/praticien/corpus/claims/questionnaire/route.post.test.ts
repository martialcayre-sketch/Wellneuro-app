import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readEventStream, type SseEvent } from '@/lib/sse/readEventStream';
import type { QuestionnaireGenere } from '@/lib/rag/claims/questionnaire';

// Génération du questionnaire de restitution (POST) — les DEUX transports. Le
// flag WN_CLAIMS_QUESTIONNAIRE_STREAM (défaut off) sélectionne JSON (historique,
// Vercel) ou SSE (Scalingo, pour tenir le seuil « premier octet » de 30 s).
const { getServerSession, genererQuestionnaireSource } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  genererQuestionnaireSource: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/praticien/appartenance', () => ({
  emailPraticien: (s: { user?: { email?: string } } | null) => s?.user?.email?.toLowerCase() ?? null,
}));
vi.mock('@/lib/rag/claims/questionnaire', () => ({ genererQuestionnaireSource }));

import { POST } from './route';

function req(body: unknown, brut = false): Request {
  return new Request('http://x/api/praticien/corpus/claims/questionnaire', {
    method: 'POST',
    body: brut ? (body as string) : JSON.stringify(body),
  });
}

const CORPS = { sourceId: 'WN-SRC-0001' };

const QUESTIONNAIRE_PLEIN: QuestionnaireGenere = {
  sourceId: 'WN-SRC-0001',
  couvertureComplete: true,
  chunksSansQuestion: [],
  questions: [{ chunkId: 'CH1', question: 'Q ?', claimsCitesAttendus: ['CL1'] }],
};

const QUESTIONNAIRE_VIDE: QuestionnaireGenere = {
  sourceId: 'WN-SRC-0001',
  couvertureComplete: false,
  chunksSansQuestion: ['CH1'],
  questions: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.WN_CLAIMS_QUESTIONNAIRE_STREAM;
  getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
  genererQuestionnaireSource.mockResolvedValue(QUESTIONNAIRE_PLEIN);
});

afterEach(() => {
  delete process.env.WN_CLAIMS_QUESTIONNAIRE_STREAM;
});

describe('POST questionnaire — gardes (indépendantes du transport)', () => {
  it('sans session : 401 JSON, aucune génération', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await POST(req(CORPS));
    expect(res.status).toBe(401);
    expect(genererQuestionnaireSource).not.toHaveBeenCalled();
  });

  it('session sans e-mail : 401, aucune génération', async () => {
    getServerSession.mockResolvedValue({ user: {} });
    const res = await POST(req(CORPS));
    expect(res.status).toBe(401);
    expect(genererQuestionnaireSource).not.toHaveBeenCalled();
  });

  it('corps illisible : 400', async () => {
    const res = await POST(req('pas du json', true));
    expect(res.status).toBe(400);
    expect(genererQuestionnaireSource).not.toHaveBeenCalled();
  });

  it('sourceId invalide : 400', async () => {
    const res = await POST(req({ sourceId: 'ABC' }));
    expect(res.status).toBe(400);
    expect(genererQuestionnaireSource).not.toHaveBeenCalled();
  });
});

describe('POST questionnaire — transport JSON (défaut, Vercel)', () => {
  it('cas nominal : 200 JSON ok:true', async () => {
    const res = await POST(req(CORPS));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
    const d = await res.json();
    expect(d.ok).toBe(true);
    expect(d.questionnaire.questions).toHaveLength(1);
  });

  it('ne passe AUCUNE option au générateur (défaut inchangé, Vercel intact)', async () => {
    await POST(req(CORPS));
    expect(genererQuestionnaireSource).toHaveBeenCalledWith('WN-SRC-0001');
  });

  it('aucune question : 409 JSON ok:false reason aucune_question', async () => {
    genererQuestionnaireSource.mockResolvedValue(QUESTIONNAIRE_VIDE);
    const res = await POST(req(CORPS));
    expect(res.status).toBe(409);
    const d = await res.json();
    expect(d.ok).toBe(false);
    expect(d.reason).toBe('aucune_question');
  });

  it('générateur en échec : 500 JSON ok:false', async () => {
    genererQuestionnaireSource.mockRejectedValue(new Error('boom'));
    const res = await POST(req(CORPS));
    expect(res.status).toBe(500);
    const d = await res.json();
    expect(d.ok).toBe(false);
    expect(d.reason).toBe('exception');
  });
});

describe('POST questionnaire — transport SSE (Scalingo, flag ON)', () => {
  beforeEach(() => {
    process.env.WN_CLAIMS_QUESTIONNAIRE_STREAM = 'true';
  });

  it('répond en text/event-stream et émet event: done avec ok:true', async () => {
    const res = await POST(req(CORPS));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');

    const events: SseEvent[] = [];
    await readEventStream(res, (e) => events.push(e));
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe('done');
    const payload = JSON.parse(events[0].data);
    expect(payload.ok).toBe(true);
    expect(payload.questionnaire.questions).toHaveLength(1);
  });

  it('borne le travail : passe un AbortSignal au générateur (SSE seulement)', async () => {
    await POST(req(CORPS));
    expect(genererQuestionnaireSource).toHaveBeenCalledWith(
      'WN-SRC-0001',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('aucune question : event: done avec ok:false (statut 200)', async () => {
    genererQuestionnaireSource.mockResolvedValue(QUESTIONNAIRE_VIDE);
    const res = await POST(req(CORPS));
    expect(res.status).toBe(200);
    const events: SseEvent[] = [];
    await readEventStream(res, (e) => events.push(e));
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe('done');
    const payload = JSON.parse(events[0].data);
    expect(payload.ok).toBe(false);
    expect(payload.reason).toBe('aucune_question');
  });

  it('générateur en échec : event: error, statut 200', async () => {
    genererQuestionnaireSource.mockRejectedValue(new Error('boom'));
    const res = await POST(req(CORPS));
    expect(res.status).toBe(200);
    const events: SseEvent[] = [];
    await readEventStream(res, (e) => events.push(e));
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe('error');
    const payload = JSON.parse(events[0].data);
    expect(payload.ok).toBe(false);
    expect(payload.reason).toBe('exception');
  });
});
