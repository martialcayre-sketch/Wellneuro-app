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
  // `actif` manquait : `phaseDossier` lit `!etat.actif` et concluait
  // « désactivé » sur un dossier censé être en suivi. Aucun test n'allait
  // jusque-là, donc le fixture pouvait rester faux sans que rien ne rougisse.
  findUniquePatient.mockResolvedValue({
    prenom: 'Sophie', nom: 'Nicola', actif: true, suiviClotureLe: null, effaceLe: null,
  });
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

  it('404 pour la synthèse d’un patient d’un autre praticien, indistinguable de l’inexistante — jamais journalisé', async () => {
    findFirst.mockResolvedValue(null);
    const res = await GET(req('http://x/api/praticien/booklet?idSynthese=SYN_1'));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Synthèse introuvable.' });
    // Un refus ne se journalise jamais : la ligne nommerait un dossier non lu.
    expect(createJournal).not.toHaveBeenCalled();
  });

  it('422 si la synthèse n’est pas validée — la lecture est journalisée (le dossier a été résolu)', async () => {
    findFirst.mockResolvedValue(syntheseFixture('Brouillon_IA'));
    const res = await GET(req('http://x/api/praticien/booklet?idSynthese=SYN_1'));
    expect(res.status).toBe(422);
    expect(createJournal).toHaveBeenCalledTimes(1);
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

  it('lecture journalisée au gabarit littéral (G-TRUST-04), idPatient issu de la synthèse', async () => {
    findFirst.mockResolvedValue(syntheseFixture('Validee_Praticien'));
    await GET(req('http://x/api/praticien/booklet?idSynthese=SYN_1'));
    expect(createJournal).toHaveBeenCalledTimes(1);
    expect(createJournal).toHaveBeenCalledWith({
      data: {
        idPatient: 'PAT_1',
        praticienEmail: 'p@wellneuro.fr',
        route: '/api/praticien/booklet',
        methode: 'GET',
      },
    });
  });
});

describe('POST /api/praticien/booklet (garde inchangée)', () => {
  it('422 sans confirmation de relecture, sans lecture de synthèse ni journalisation', async () => {
    const res = await POST(
      new Request('http://x/api/praticien/booklet', {
        method: 'POST',
        body: JSON.stringify({ idSynthese: 'SYN_1' }),
      }),
    );
    expect(res.status).toBe(422);
    expect(findFirst).not.toHaveBeenCalled();
    // Le POST ne journalise pas (GD-1) : l'envoi laisse déjà sa trace datée.
    expect(createJournal).not.toHaveBeenCalled();
  });
});

// SMTP_URL est absente en test : la route s'arrête en 503 APRÈS la garde de
// registre. C'est ce qui permet de prouver qu'un narratif propre la franchit,
// sans avoir à simuler nodemailer.
describe('POST /api/praticien/booklet — garde de registre anxiogène', () => {
  function envoyer(corps: Record<string, unknown>) {
    return POST(
      new Request('http://x/api/praticien/booklet', {
        method: 'POST',
        body: JSON.stringify({ idSynthese: 'SYN_1', relectureConfirmee: true, ...corps }),
      }),
    );
  }

  function avecNarratif(narratif: string) {
    const s = syntheseFixture('Validee_Praticien');
    s.syntheseJson.narratif_patient = narratif;
    findFirst.mockResolvedValue(s);
  }

  it('demande confirmation, nomme le mot, et n’envoie rien', async () => {
    avecNarratif('Une consultation urgente est à prévoir.');
    const res = await envoyer({});
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.needsConfirmation).toBe(true);
    expect(body.reason).toBe('REGISTRE_ANXIOGENE');
    // Le MOT du praticien, pas la racine : « urgen » n'est pas du français.
    expect(body.terme).toBe('urgente');
    expect(body.warning).toContain('urgente');
    // Aucun envoi : la route se serait sinon arrêtée en 503 (SMTP_URL absente).
    expect(body.emailMasque).toBeDefined();
  });

  it('journalise le blocage — un motif clinique doit se relire', async () => {
    avecNarratif('Une consultation urgente est à prévoir.');
    await envoyer({});
    expect(createBookletEnvoi).toHaveBeenCalledTimes(1);
    const trace = createBookletEnvoi.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(trace.data.statut).toBe('Confirmation_Requise');
    expect(trace.data.operation).toBe('Registre');
    expect(String(trace.data.erreurCourte)).toContain('urgente');
  });

  it('confirmerRegistre laisse passer — la garde fait regarder, elle ne décide pas', async () => {
    avecNarratif('Une consultation urgente est à prévoir.');
    const res = await envoyer({ confirmerRegistre: true });
    // 503 SMTP : la garde est franchie, l'envoi est bien tenté.
    expect(res.status).toBe(503);
  });

  it('forceSend ne vaut PAS confirmation de registre — deux décisions distinctes', async () => {
    avecNarratif('Une consultation urgente est à prévoir.');
    const res = await envoyer({ forceSend: true });
    const body = await res.json();
    expect(body.needsConfirmation).toBe(true);
    expect(body.reason).toBe('REGISTRE_ANXIOGENE');
  });

  it('un narratif descriptif passe sans confirmation', async () => {
    avecNarratif('Vos réponses évoquent un sommeil fragmenté ; nous en reparlerons.');
    const res = await envoyer({});
    expect(res.status).toBe(503);
    expect(createBookletEnvoi).toHaveBeenCalledTimes(1);
    const trace = createBookletEnvoi.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(trace.data.operation).not.toBe('Registre');
  });

  it('un dossier clos répond « dossier clos », pas « reformulez »', async () => {
    avecNarratif('Une consultation urgente est à prévoir.');
    findUniquePatient.mockResolvedValue({
      prenom: 'Sophie', nom: 'Nicola', actif: true,
      suiviClotureLe: new Date('2026-07-01T00:00:00.000Z'), effaceLe: null,
    });
    const res = await envoyer({});
    expect(res.status).toBe(409);
  });
});
