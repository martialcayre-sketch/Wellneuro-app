import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mocks des dépendances de la route (auth, prisma, anthropic, observabilité).
// `@/lib/anthropic` instancie un client à l'import : stub obligatoire.
const findFirst = vi.fn();
const findUniquePatient = vi.fn();
const createJournal = vi.fn();
const deleteManyJournal = vi.fn();
const createBookletEnvoi = vi.fn();

vi.mock('next-auth', () => ({ getServerSession: vi.fn(async () => ({ user: { email: 'p@wellneuro.fr' } })) }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    syntheseIA: { findFirst: (...a: unknown[]) => findFirst(...a) },
    patient: { findUnique: (...a: unknown[]) => findUniquePatient(...a) },
    journalAccesDossier: {
      create: (...a: unknown[]) => createJournal(...a),
      deleteMany: (...a: unknown[]) => deleteManyJournal(...a),
    },
    bookletEnvoi: { create: (...a: unknown[]) => createBookletEnvoi(...a) },
  },
}));
vi.mock('@/lib/anthropic', () => ({
  maskEmail: (e: string) => `masqué(${e})`,
  sanitizeAuditError: (m: string) => m,
}));
vi.mock('@/lib/observability/logger', () => ({ logger: { error: vi.fn(), security: vi.fn() } }));
vi.mock('@/lib/observability/requestContext', () => ({
  createRequestContext: () => ({}),
  finalizeLogContext: (_c: unknown, x: unknown) => x,
  withCorrelationHeader: (res: unknown) => res,
}));

import { getServerSession } from 'next-auth';
import { GET, POST } from './route';

function req(url: string) {
  return new Request(url);
}

function syntheseFixture(statut: string) {
  return {
    idSynthese: 'SYN_1',
    idPatient: 'PAT_1',
    emailPatient: 'sophie.nicola@fictif.wellneuro.fr',
    statut,
    dateValidation: new Date('2026-07-18T00:00:00.000Z'),
    dateGeneration: new Date('2026-07-17T00:00:00.000Z'),
    notesPraticien: null,
    bookletEnvois: [],
    syntheseJson: {
      resume_praticien: 'Résumé interne',
      axes_prioritaires: [{ axe: 'Sommeil', niveau_priorite: 'eleve', arguments: ['réveils'], points_a_confirmer: [] }],
      points_de_vigilance: ['fatigue'],
      questions_entretien: ['Depuis quand ?'],
      narratif_patient: 'Sommeil fragmenté.',
      limites: 'À valider.',
    },
  };
}

beforeEach(() => {
  findFirst.mockReset();
  findUniquePatient.mockReset();
  createJournal.mockReset();
  deleteManyJournal.mockReset();
  createBookletEnvoi.mockReset();
  findUniquePatient.mockResolvedValue({ prenom: 'Sophie', nom: 'Nicola', suiviClotureLe: null, effaceLe: null });
  createJournal.mockResolvedValue({});
  deleteManyJournal.mockResolvedValue({ count: 0 });
  createBookletEnvoi.mockResolvedValue({});
});
afterEach(() => vi.clearAllMocks());

describe('GET /api/praticien/booklet', () => {
  it('401 sans session', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null as never);
    const res = await GET(req('http://x/api/praticien/booklet?idSynthese=SYN_1'));
    expect(res.status).toBe(401);
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('400 sans idSynthese', async () => {
    const res = await GET(req('http://x/api/praticien/booklet'));
    expect(res.status).toBe(400);
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('scope la recherche au praticien en session (relation patient)', async () => {
    findFirst.mockResolvedValue(syntheseFixture('Validee_Praticien'));
    await GET(req('http://x/api/praticien/booklet?idSynthese=SYN_1'));
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        idSynthese: 'SYN_1',
        patient: { praticienEmail: { equals: 'p@wellneuro.fr', mode: 'insensitive' } },
      },
      include: { bookletEnvois: { orderBy: { dateEnvoi: 'desc' }, take: 1 } },
    });
  });

  it('404 pour la synthèse d’un patient d’un autre praticien, indistinguable de l’inexistante', async () => {
    findFirst.mockResolvedValue(null);
    const res = await GET(req('http://x/api/praticien/booklet?idSynthese=SYN_1'));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Synthèse introuvable.' });
  });

  it('422 si la synthèse n’est pas validée', async () => {
    findFirst.mockResolvedValue(syntheseFixture('Brouillon_IA'));
    const res = await GET(req('http://x/api/praticien/booklet?idSynthese=SYN_1'));
    expect(res.status).toBe(422);
  });

  it('200 avec le HTML pour une synthèse validée', async () => {
    findFirst.mockResolvedValue(syntheseFixture('Validee_Praticien'));
    const res = await GET(req('http://x/api/praticien/booklet?idSynthese=SYN_1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.patientNom).toBe('Sophie Nicola');
    expect(typeof body.html).toBe('string');
    expect(body.html.length).toBeGreaterThan(0);
  });
});

describe('POST /api/praticien/booklet (garde inchangée)', () => {
  it('422 sans confirmation de relecture, sans lecture de synthèse', async () => {
    const res = await POST(
      new Request('http://x/api/praticien/booklet', {
        method: 'POST',
        body: JSON.stringify({ idSynthese: 'SYN_1' }),
      }),
    );
    expect(res.status).toBe(422);
    expect(findFirst).not.toHaveBeenCalled();
  });
});
