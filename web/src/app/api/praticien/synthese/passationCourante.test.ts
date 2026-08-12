import { beforeEach, describe, expect, it, vi } from 'vitest';

// Marquage de la passation courante par instrument (LOT-01 étape 6, renvoi du
// LOT-00 point 3).
//
// CE QUE LE LOT EXIGE, mot pour mot : « les passations antérieures RESTENT
// transmises — l'évolution entre deux enquêtes d'un même instrument est un
// signal clinique — mais la plus récente VALID est nommée comme telle. L'écart
// à corriger est l'absence de repère, pas le nombre de lignes : aucun
// `distinct`, aucune suppression. »
//
// Ce banc garde donc DEUX choses en même temps, et c'est le point : le nombre
// de lignes transmises ET la présence d'un repère unique. Un banc qui ne
// garderait que la seconde laisserait passer un `distinct` « de propreté ».

const { getServerSession, prisma, anthropicCreate } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findFirst: vi.fn() },
    questionnaireReponse: { findMany: vi.fn() },
    consultation: { findFirst: vi.fn() },
    syntheseIA: { create: vi.fn() },
    auditSynthese: { create: vi.fn() },
  },
  anthropicCreate: vi.fn(),
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
// Module réel sauf le client HTTP : le schéma strict et la sélection de
// passation courante sont ceux de production.
vi.mock('@/lib/anthropic', async (importOriginal) => {
  const reel = await importOriginal<typeof import('@/lib/anthropic')>();
  return { ...reel, anthropic: { messages: { create: anthropicCreate } } };
});
vi.mock('@/lib/consultation/contexteClinique', () => ({
  buildContexteClinique: () => '',
  extraireVigilanceDeterministe: () => [] as string[],
}));
vi.mock('@/lib/observability/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), security: vi.fn() },
}));
vi.mock('@/lib/observability/eventCodes', () => ({ EVENT_CODES: {} }));
vi.mock('@/lib/observability/requestContext', () => ({
  createRequestContext: () => ({}),
  finalizeLogContext: (_c: unknown, x: unknown) => x,
  withCorrelationHeader: (res: unknown) => res,
}));

import { POST } from './route';

const CONFORME = JSON.stringify({
  resume_praticien: 'Synthèse concise pour le praticien.',
  axes_prioritaires: [],
  points_de_vigilance: ['Un point'],
  questions_entretien: ['Une question ?'],
  narratif_patient: 'Un texte accessible.',
  limites: 'À valider par le praticien.',
});

function req(): Request {
  return new Request('http://x/api/praticien/synthese', {
    method: 'POST',
    body: JSON.stringify({ idPatient: 'PAT_SEED_01' }),
  });
}

function passation(idReponse: string, idQuestionnaire: string, jour: string) {
  return {
    idReponse,
    idQuestionnaire,
    titre: `Instrument ${idQuestionnaire}`,
    dateReponse: new Date(`${jour}T10:00:00Z`),
    scoresJson: {},
    scorePrincipal: 10,
    interpretation: null,
    statutValidite: 'VALID',
  };
}

/** Le message utilisateur réellement envoyé au modèle, reparsé. */
function passationsTransmises(): Array<{ idQuestionnaire: string; date: string; passationCourante: boolean }> {
  const message = anthropicCreate.mock.calls[0][0].messages[0].content as string;
  const json = message.slice(message.indexOf('['), message.lastIndexOf(']') + 1);
  return JSON.parse(json);
}

/** Les doublures par défaut, réutilisables au milieu d'un cas qui les réinitialise. */
function poserMocksParDefaut(): void {
  process.env.ANTHROPIC_API_KEY = 'test-key';
  delete process.env.WN_SYNTHESE_STREAM;
  getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
  prisma.patient.findFirst.mockResolvedValue({ idPatient: 'PAT_SEED_01', email: 'pat@example.com' });
  prisma.consultation.findFirst.mockResolvedValue(null);
  anthropicCreate.mockResolvedValue({
    content: [{ type: 'text', text: CONFORME }],
    stop_reason: 'end_turn',
    usage: {},
  });
  prisma.syntheseIA.create.mockResolvedValue({
    idSynthese: 'SYN_1',
    dateGeneration: new Date('2026-08-11T00:00:00Z'),
  });
  prisma.auditSynthese.create.mockResolvedValue({});
}

beforeEach(() => {
  vi.clearAllMocks();
  poserMocksParDefaut();
});

describe('deux passations VALID du même instrument', () => {
  it('les DEUX partent au prompt, une SEULE est marquée courante', async () => {
    // L'ordre de la requête est `dateReponse desc` : la plus récente d'abord.
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      passation('R2', 'Q_ALI_02', '2026-08-10'),
      passation('R1', 'Q_ALI_02', '2026-07-01'),
    ]);

    const res = await POST(req());
    expect(res.status).toBe(200);

    const transmises = passationsTransmises();
    // LE NOMBRE DE LIGNES : aucun `distinct`, aucune suppression.
    expect(transmises).toHaveLength(2);
    expect(transmises.map(p => p.date).sort()).toEqual(['2026-07-01', '2026-08-10']);
    // LE REPÈRE : un seul, et sur la plus récente.
    const courantes = transmises.filter(p => p.passationCourante);
    expect(courantes).toHaveLength(1);
    expect(courantes[0].date).toBe('2026-08-10');
  });

  it('marque `false` explicitement sur l’antérieure, plutôt que d’omettre la clé', async () => {
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      passation('R2', 'Q_ALI_02', '2026-08-10'),
      passation('R1', 'Q_ALI_02', '2026-07-01'),
    ]);
    await POST(req());

    const anterieure = passationsTransmises().find(p => p.date === '2026-07-01');
    // Une clé qui n'apparaîtrait que sur la courante se lirait, sur les autres,
    // comme une information manquante plutôt que comme un « non ».
    expect(anterieure).toHaveProperty('passationCourante');
    expect(anterieure?.passationCourante).toBe(false);
  });

  it('l’ordre de la requête ne décide pas : la date décide', async () => {
    // Ordre inversé volontairement — un code qui prendrait `[0]` marquerait la
    // mauvaise ligne, et le test précédent ne l'aurait pas vu.
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      passation('R1', 'Q_ALI_02', '2026-07-01'),
      passation('R2', 'Q_ALI_02', '2026-08-10'),
    ]);
    await POST(req());

    const courantes = passationsTransmises().filter(p => p.passationCourante);
    expect(courantes).toHaveLength(1);
    expect(courantes[0].date).toBe('2026-08-10');
  });
});

describe('plusieurs instruments', () => {
  it('marque UNE courante PAR instrument, pas une seule pour tout le dossier', async () => {
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      passation('R4', 'Q_STR_04', '2026-08-09'),
      passation('R3', 'Q_STR_04', '2026-06-01'),
      passation('R2', 'Q_ALI_02', '2026-08-10'),
      passation('R1', 'Q_ALI_02', '2026-07-01'),
    ]);
    await POST(req());

    const transmises = passationsTransmises();
    expect(transmises).toHaveLength(4);
    const courantes = transmises.filter(p => p.passationCourante);
    expect(courantes).toHaveLength(2);
    expect(courantes.map(p => `${p.idQuestionnaire}@${p.date}`).sort()).toEqual([
      'Q_ALI_02@2026-08-10',
      'Q_STR_04@2026-08-09',
    ]);
    // Sans le découpage par instrument, seule la plus récente du dossier
    // (Q_ALI_02) porterait le repère, et Q_STR_04 n'en aurait aucun.
  });

  it('un instrument à passation unique porte le repère', async () => {
    prisma.questionnaireReponse.findMany.mockResolvedValue([passation('R1', 'Q_ALI_02', '2026-08-10')]);
    await POST(req());

    const transmises = passationsTransmises();
    expect(transmises).toHaveLength(1);
    expect(transmises[0].passationCourante).toBe(true);
    // Témoin positif : sans lui, un marqueur toujours `false` passerait les
    // assertions « une seule courante » des cas à deux passations.
  });
});

// LE TROU QUE LA REVUE A TROUVÉ, ET QUE CE BLOC FERME.
//
// Toutes les fixtures ci-dessus sont `VALID`. Le repère se posait donc toujours
// sur une passation saine, et rien ne disait ce qu'il faisait d'une passation
// écartée. Or `filtrerPassationsExploitables` ne retire RIEN tant que
// `WN_ENABLE_VALIDITE_PASSATIONS` est éteint — l'état de production : une
// passation marquée INVALID par le praticien, plus récente qu'une saine,
// partait au modèle avec `passationCourante: true` pendant que la saine portait
// `false`. La consigne lui fait alors rapporter l'état actuel d'après la mesure
// invalidée. Le repère ne RETIRE rien, il PROMEUT — et c'est promouvoir qui est
// faux, drapeau ou pas.
describe('passation écartée du raisonnement, drapeau de validité ÉTEINT', () => {
  it('une INVALID plus récente ne prend pas le repère : la VALID antérieure le porte', async () => {
    delete process.env.WN_ENABLE_VALIDITE_PASSATIONS;
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      { ...passation('R2', 'Q_STR_04', '2026-08-10'), statutValidite: 'INVALID' },
      passation('R1', 'Q_STR_04', '2026-07-01'),
    ]);
    await POST(req());

    const transmises = passationsTransmises();
    // Les DEUX partent toujours : le LOT-00 s'est engagé à ne rien retirer tant
    // que le drapeau est éteint.
    expect(transmises).toHaveLength(2);
    const courantes = transmises.filter(p => p.passationCourante);
    expect(courantes).toHaveLength(1);
    expect(courantes[0].date).toBe('2026-07-01');
  });

  it('SUPERSEDED et HISTORICAL_ONLY sont écartés du repère de la même façon', async () => {
    for (const statut of ['SUPERSEDED', 'HISTORICAL_ONLY']) {
      vi.clearAllMocks();
      poserMocksParDefaut();
      prisma.questionnaireReponse.findMany.mockResolvedValue([
        { ...passation('R2', 'Q_STR_04', '2026-08-10'), statutValidite: statut },
        passation('R1', 'Q_STR_04', '2026-07-01'),
      ]);
      await POST(req());
      const courantes = passationsTransmises().filter(p => p.passationCourante);
      expect(courantes).toHaveLength(1);
      expect(courantes[0].date).toBe('2026-07-01');
    }
  });

  it('toutes écartées ⇒ AUCUN repère, et surtout pas un repli sur la plus récente', async () => {
    // C'est le cas que la consigne v21 décrit : l'instrument n'a pas de mesure
    // qui fasse foi. Se rabattre sur la plus récente désignerait précisément
    // celle que le praticien a écartée.
    delete process.env.WN_ENABLE_VALIDITE_PASSATIONS;
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      { ...passation('R2', 'Q_STR_04', '2026-08-10'), statutValidite: 'INVALID' },
      { ...passation('R1', 'Q_STR_04', '2026-07-01'), statutValidite: 'INVALID' },
    ]);
    await POST(req());

    const transmises = passationsTransmises();
    expect(transmises).toHaveLength(2);
    expect(transmises.filter(p => p.passationCourante)).toHaveLength(0);
  });
});

describe('départage à horodatage égal', () => {
  it('ne marque qu’une seule courante, de façon reproductible', async () => {
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      passation('R1', 'Q_ALI_02', '2026-08-10'),
      passation('R2', 'Q_ALI_02', '2026-08-10'),
    ]);
    await POST(req());

    const courantes = passationsTransmises().filter(p => p.passationCourante);
    // L'ordre SQL n'est pas stable à horodatage égal. `derniereReponseParQuestionnaire`
    // départage sur `idReponse` — le repère ne peut donc pas osciller d'un run
    // à l'autre, et il ne peut pas non plus se poser deux fois.
    expect(courantes).toHaveLength(1);
  });
});
