import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    assessmentEpisode: { findMany: vi.fn() },
    questionnaireReponse: { findMany: vi.fn() },
    relectureNote: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { GET, POST } from './route';

const INSTANT_RELU = '2026-01-01T00:00:00.000Z';
const URL_BASE = 'http://localhost/api/praticien/relecture-notes';

function getRequest(query = 'idPatient=PAT_TEST'): Request {
  return new Request(`${URL_BASE}?${query}`);
}

function postRequest(body: unknown, query = ''): Request {
  return new Request(`${URL_BASE}${query}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const corps = (partiel: Record<string, unknown> = {}) => ({
  idPatient: 'PAT_TEST',
  instantRelu: INSTANT_RELU,
  texte: 'Le sommeil s’était déjà dégradé à cette date.',
  ...partiel,
});

describe('/api/praticien/relecture-notes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'praticien@wellneuro.fr' });
    prisma.assessmentEpisode.findMany.mockResolvedValue([
      { milestone: 'T0', confirmedAt: new Date(INSTANT_RELU) },
    ]);
    prisma.questionnaireReponse.findMany.mockResolvedValue([]);
    prisma.relectureNote.findMany.mockResolvedValue([]);
    prisma.relectureNote.findFirst.mockResolvedValue(null);
    prisma.relectureNote.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'NOTE_1',
      instantRelu: data.instantRelu,
      texte: data.texte,
      supersedesNoteId: data.supersedesNoteId ?? null,
      // La base pose le présent : le mock reflète ce contrat, pas l'appelant.
      creeLe: new Date('2026-07-20T09:00:00.000Z'),
    }));
  });

  it('exige une session', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await GET(getRequest())).status).toBe(401);
    expect((await POST(postRequest(corps()))).status).toBe(401);
    expect(prisma.relectureNote.create).not.toHaveBeenCalled();
  });

  it('refuse un patient d’un autre praticien sans révéler autre chose', async () => {
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'autre@wellneuro.fr' });
    expect((await GET(getRequest())).status).toBe(403);
    expect((await POST(postRequest(corps()))).status).toBe(403);
    expect(prisma.relectureNote.create).not.toHaveBeenCalled();
  });

  it('répond 404 sur un patient inconnu', async () => {
    prisma.patient.findUnique.mockResolvedValue(null);
    expect((await POST(postRequest(corps()))).status).toBe(404);
    expect(prisma.relectureNote.create).not.toHaveBeenCalled();
  });

  it('valide l’identifiant patient', async () => {
    expect((await GET(getRequest('idPatient='))).status).toBe(400);
    expect((await GET(getRequest('idPatient=PAT%20TEST'))).status).toBe(400);
  });

  // Le cœur du gate.
  it('écrit au présent une note à propos du passé, sans jamais transmettre la date d’écriture', async () => {
    const res = await POST(postRequest(corps()));
    const payload = await res.json();

    expect(res.status).toBe(201);
    expect(payload.note.instantRelu).toBe(INSTANT_RELU);

    const data = prisma.relectureNote.create.mock.calls[0][0].data;
    expect(data.instantRelu.toISOString()).toBe(INSTANT_RELU);
    expect(data.praticienEmail).toBe('praticien@wellneuro.fr');
    // Rien qui ressemble à une date d'écriture ne part de l'application :
    // `cree_le` est posé par la base. C'est ce qui rend la note inantidatable.
    expect(data).not.toHaveProperty('creeLe');
    expect(data).not.toHaveProperty('cree_le');
    // La date d'écriture rendue est le présent, pas l'instant relu.
    expect(payload.note.creeLe).not.toBe(INSTANT_RELU);
  });

  it('refuse un `asOf` en paramètre : l’instant relu passe par le corps, pas par le mode de lecture', async () => {
    const res = await POST(postRequest(corps(), `?asOf=${encodeURIComponent(INSTANT_RELU)}`));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/corps de la note/i);
    expect(prisma.relectureNote.create).not.toHaveBeenCalled();
  });

  it('refuse une date hors repères, comme la lecture', async () => {
    const res = await POST(postRequest(corps({ instantRelu: '2026-03-01T00:00:00.000Z' })));
    expect(res.status).toBe(400);
    expect((await res.json()).reason).toBe('instant_hors_reperes');
    expect(prisma.relectureNote.create).not.toHaveBeenCalled();
  });

  it('refuse une note vide, un instant illisible ou absent', async () => {
    expect((await POST(postRequest(corps({ texte: '  ' })))).status).toBe(400);
    expect((await POST(postRequest(corps({ instantRelu: 'hier' })))).status).toBe(400);
    expect((await POST(postRequest(corps({ instantRelu: undefined })))).status).toBe(400);
    expect(prisma.relectureNote.create).not.toHaveBeenCalled();
  });

  it('corrige par une nouvelle ligne chaînée — jamais par un update ni un delete', async () => {
    prisma.relectureNote.findUnique.mockResolvedValue({
      idPatient: 'PAT_TEST',
      instantRelu: new Date(INSTANT_RELU),
    });

    const res = await POST(postRequest(corps({ corrigeNoteId: 'NOTE_0', texte: 'Correction.' })));
    expect(res.status).toBe(201);
    expect(prisma.relectureNote.create.mock.calls[0][0].data.supersedesNoteId).toBe('NOTE_0');
    expect(prisma.relectureNote.update).not.toHaveBeenCalled();
    expect(prisma.relectureNote.delete).not.toHaveBeenCalled();
  });

  it('refuse de corriger une note d’un autre patient, ou déjà corrigée', async () => {
    prisma.relectureNote.findUnique.mockResolvedValue({
      idPatient: 'PAT_AUTRE',
      instantRelu: new Date(INSTANT_RELU),
    });
    expect((await POST(postRequest(corps({ corrigeNoteId: 'NOTE_0' })))).status).toBe(404);

    prisma.relectureNote.findUnique.mockResolvedValue({
      idPatient: 'PAT_TEST',
      instantRelu: new Date(INSTANT_RELU),
    });
    prisma.relectureNote.findFirst.mockResolvedValue({ id: 'NOTE_2' });
    const conflit = await POST(postRequest(corps({ corrigeNoteId: 'NOTE_0' })));
    expect(conflit.status).toBe(409);
    expect((await conflit.json()).reason).toBe('note_superseded');
    expect(prisma.relectureNote.create).not.toHaveBeenCalled();
  });

  it('ne rend que les notes actives, corrections comprises', async () => {
    prisma.relectureNote.findMany.mockResolvedValue([
      {
        id: 'n2',
        instantRelu: new Date(INSTANT_RELU),
        texte: 'Version corrigée.',
        creeLe: new Date('2026-07-20T10:00:00.000Z'),
        supersedesNoteId: 'n1',
      },
      {
        id: 'n1',
        instantRelu: new Date(INSTANT_RELU),
        texte: 'Version initiale.',
        creeLe: new Date('2026-07-19T10:00:00.000Z'),
        supersedesNoteId: null,
      },
    ]);

    const payload = await (await GET(getRequest())).json();
    expect(payload.notes).toHaveLength(1);
    expect(payload.notes[0]).toMatchObject({ id: 'n2', corrigeDepuisNoteId: 'n1' });
  });

  it('filtre les notes sur l’instant relu demandé', async () => {
    const commun = { texte: 'note', creeLe: new Date('2026-07-20T10:00:00.000Z'), supersedesNoteId: null };
    prisma.relectureNote.findMany.mockResolvedValue([
      { id: 'n1', instantRelu: new Date(INSTANT_RELU), ...commun },
      { id: 'n2', instantRelu: new Date('2026-01-22T00:00:00.000Z'), ...commun },
    ]);

    const payload = await (
      await GET(getRequest(`idPatient=PAT_TEST&instantRelu=${encodeURIComponent(INSTANT_RELU)}`))
    ).json();
    expect(payload.notes.map((note: { id: string }) => note.id)).toEqual(['n1']);
  });
});
