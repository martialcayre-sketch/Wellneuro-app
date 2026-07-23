import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mocks des dépendances de la route (auth, prisma, observabilité).
const findFirst = vi.fn();
const findUniquePatient = vi.fn();
const createJournal = vi.fn();
const deleteManyJournal = vi.fn();

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
  },
}));
vi.mock('@/lib/observability/logger', () => ({ logger: { error: vi.fn(), security: vi.fn() } }));
vi.mock('@/lib/observability/requestContext', () => ({
  createRequestContext: () => ({}),
  finalizeLogContext: (_c: unknown, x: unknown) => x,
  withCorrelationHeader: (res: unknown) => res,
}));

import { getServerSession } from 'next-auth';
import { GET } from './route';

function req(url: string) {
  return new Request(url);
}

function syntheseFixture(statut: string) {
  return {
    idSynthese: 'SYN_1',
    idPatient: 'PAT_1',
    statut,
    versionPrompt: 'synthese-v3',
    dateValidation: new Date('2026-07-18T00:00:00.000Z'),
    dateGeneration: new Date('2026-07-17T00:00:00.000Z'),
    notesPraticien: null,
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
  findUniquePatient.mockResolvedValue({ prenom: 'Sophie', nom: 'Nicola' });
  createJournal.mockResolvedValue({});
  deleteManyJournal.mockResolvedValue({ count: 0 });
});
afterEach(() => vi.clearAllMocks());

describe('GET /api/praticien/documents', () => {
  it('401 sans session', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null as never);
    const res = await GET(req('http://x/api/praticien/documents?idSynthese=SYN_1'));
    expect(res.status).toBe(401);
  });

  it('400 sans idSynthese', async () => {
    const res = await GET(req('http://x/api/praticien/documents'));
    expect(res.status).toBe(400);
  });

  it('404 si synthèse introuvable — jamais journalisé', async () => {
    findFirst.mockResolvedValue(null);
    const res = await GET(req('http://x/api/praticien/documents?idSynthese=SYN_1'));
    expect(res.status).toBe(404);
    // Un refus ne se journalise jamais : la ligne nommerait un dossier non lu.
    expect(createJournal).not.toHaveBeenCalled();
  });

  it('422 si synthèse non validée — la lecture est journalisée (le dossier a été résolu)', async () => {
    findFirst.mockResolvedValue(syntheseFixture('Brouillon_IA'));
    const res = await GET(req('http://x/api/praticien/documents?idSynthese=SYN_1'));
    expect(res.status).toBe(422);
    expect(createJournal).toHaveBeenCalledTimes(1);
  });

  it('lecture journalisée au gabarit littéral (G-TRUST-04), idPatient issu de la synthèse', async () => {
    findFirst.mockResolvedValue(syntheseFixture('Validee_Praticien'));
    await GET(req('http://x/api/praticien/documents?idSynthese=SYN_1'));
    expect(createJournal).toHaveBeenCalledTimes(1);
    expect(createJournal).toHaveBeenCalledWith({
      data: {
        idPatient: 'PAT_1',
        praticienEmail: 'p@wellneuro.fr',
        route: '/api/praticien/documents',
        methode: 'GET',
      },
    });
  });

  it('compose des blocs pour une synthèse validée', async () => {
    findFirst.mockResolvedValue(syntheseFixture('Validee_Praticien'));
    const res = await GET(req('http://x/api/praticien/documents?idSynthese=SYN_1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.patientNom).toBe('Sophie Nicola');
    expect(Array.isArray(body.blocs)).toBe(true);
    expect(body.blocs.length).toBeGreaterThan(0);
    // Provenance ancrée sur versionPrompt (pas d'inputHash).
    expect(body.blocs[0].provenance.version).toBe('synthese-v3');
    expect(body.blocs[0].provenance.statutSource).toBe('Validee_Praticien');
  });
});
