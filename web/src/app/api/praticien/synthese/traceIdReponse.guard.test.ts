import { beforeEach, describe, expect, it, vi } from 'vitest';

// LA TRACE NOMME SES PASSATIONS ; LE PROMPT NE LES NOMME PAS.
//
// `donneesEntree.reponses` portait `idQuestionnaire` + `date`, qui désignent
// PRESQUE toujours la ligne source. « Presque » suffit tant qu'un instrument
// n'a qu'une passation par jour ; il cesse de suffire dès qu'il en a deux, et
// c'est exactement le cas que `passationCourante` existe pour arbitrer. Six
// mois plus tard, dire « cette synthèse a été écrite sur CES passations » ne
// doit pas dépendre d'une unicité que rien ne garantit.
//
// CE BANC GARDE LES DEUX BOUTS, et chacun seul se retire sans bruit :
//   · l'identifiant est bien dans la trace, sur chaque ligne ;
//   · il n'est PAS dans le message envoyé au modèle.
//
// Le second bout est le vrai garde. `buildUserMessage` reprojette les clés une
// à une, donc l'identifiant n'atteint le prompt que si quelqu'un l'ajoute AUSSI
// à la projection — un geste silencieux, qu'aucune empreinte ne verrait : les
// gardes de version ne hachent que la consigne SYSTÈME, jamais le message
// utilisateur. Un identifiant que le modèle voit est un identifiant qu'il peut
// recopier, et une citation recopiée n'est pas une provenance ([[D-168]] §6).

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
// Module réel sauf le client HTTP : la projection du message utilisateur est
// celle de production, sans quoi ce banc ne garderait rien.
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

// Identifiants volontairement improbables : la recherche de sous-chaîne dans le
// message n'a de valeur que si la chaîne cherchée ne peut pas y arriver par un
// autre chemin (un `REP_1` se serait trouvé dans n'importe quel texte).
const ID_PREMIERE = 'REP_TRACE_ZQX9';
const ID_SECONDE = 'REP_TRACE_WKV4';

/**
 * LE MÊME JOUR, DÉLIBÉRÉMENT — c'est le cas que ce lot existe pour couvrir.
 *
 * `donneesEntree.reponses` portait `idQuestionnaire` + `date`. Sur deux dates
 * différentes, ce couple désigne encore chaque ligne, et un banc construit ainsi
 * prouverait seulement que l'identifiant est présent, jamais qu'il RÉSOUT quoi
 * que ce soit. Deux passations du même instrument le même jour rendent le couple
 * ambigu : seul `idReponse` les distingue alors.
 */
const JOUR_PARTAGE = '2026-09-10';

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

/** Le message utilisateur réellement envoyé au modèle, brut. */
function messageEnvoye(): string {
  return anthropicCreate.mock.calls[0][0].messages[0].content as string;
}

/** Le bloc des passations tel que le modèle le reçoit, reparsé. */
function passationsTransmises(): Array<Record<string, unknown>> {
  const message = messageEnvoye();
  const json = message.slice(message.indexOf('['), message.lastIndexOf(']') + 1);
  return JSON.parse(json);
}

/** Les données d'entrée telles qu'elles sont ENREGISTRÉES avec la synthèse. */
function reponsesTracees(): Array<Record<string, unknown>> {
  const data = prisma.syntheseIA.create.mock.calls[0][0].data as {
    donneesEntree: { reponses: Array<Record<string, unknown>> };
  };
  return data.donneesEntree.reponses;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ANTHROPIC_API_KEY = 'test-key';
  delete process.env.WN_SYNTHESE_STREAM;
  getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
  prisma.patient.findFirst.mockResolvedValue({ idPatient: 'PAT_SEED_01', email: 'pat@example.com' });
  prisma.consultation.findFirst.mockResolvedValue(null);
  // Deux passations du MÊME instrument, le MÊME jour : le couple
  // `idQuestionnaire` + `date` ne désigne plus une ligne, `idReponse` si.
  prisma.questionnaireReponse.findMany.mockResolvedValue([
    passation(ID_PREMIERE, 'Q_STR_04', JOUR_PARTAGE),
    passation(ID_SECONDE, 'Q_STR_04', JOUR_PARTAGE),
  ]);
  anthropicCreate.mockResolvedValue({
    content: [{ type: 'text', text: CONFORME }],
    stop_reason: 'end_turn',
    usage: {},
  });
  prisma.syntheseIA.create.mockResolvedValue({
    idSynthese: 'SYN_1',
    dateGeneration: new Date('2026-09-13T00:00:00Z'),
  });
  prisma.auditSynthese.create.mockResolvedValue({});
});

describe('trace d’audit — la synthèse nomme les passations sur lesquelles elle est écrite', () => {
  it('chaque ligne de `donneesEntree.reponses` porte son `idReponse`', async () => {
    const res = await POST(req());
    expect(res.status).toBe(200);

    const tracees = reponsesTracees();
    expect(tracees).toHaveLength(2);
    expect(tracees.map(r => r.idReponse).sort()).toEqual([ID_PREMIERE, ID_SECONDE].sort());
  });

  it('l’identifiant DÉPARTAGE deux lignes que l’instrument et la date confondent', async () => {
    await POST(req());

    // Le cœur du lot : même instrument, même date, et pourtant deux lignes
    // distinguables. Si l'identifiant était dérivé de l'un ou de l'autre, les
    // deux porteraient la même valeur et la trace ne désignerait rien.
    const tracees = reponsesTracees();
    expect(new Set(tracees.map(r => r.idQuestionnaire)).size).toBe(1);
    expect(new Set(tracees.map(r => r.date)).size).toBe(1);
    expect(new Set(tracees.map(r => r.idReponse)).size).toBe(2);
  });
});

describe('le prompt — l’identifiant de passation N’ATTEINT PAS le modèle', () => {
  it('aucune ligne transmise ne porte de clé `idReponse`', async () => {
    await POST(req());

    for (const ligne of passationsTransmises()) {
      expect(Object.keys(ligne)).not.toContain('idReponse');
    }
  });

  it('la valeur n’apparaît nulle part dans le message envoyé', async () => {
    // Plus large que la clé : un identifiant glissé dans le `titre`, dans une
    // mini-synthèse ou dans un bloc d'orientation serait tout aussi lisible par
    // le modèle qu'une clé nommée.
    await POST(req());

    expect(messageEnvoye()).not.toContain(ID_PREMIERE);
    expect(messageEnvoye()).not.toContain(ID_SECONDE);
  });

  it('anti-vacuité : le message contient bien le bloc des passations', async () => {
    // Sans ce cas, les deux précédents resteraient verts si le message devenait
    // vide, ou si la projection cessait d'émettre les passations — ils
    // prouveraient alors l'absence d'un identifiant dans une absence de bloc.
    await POST(req());

    const transmises = passationsTransmises();
    expect(transmises).toHaveLength(2);
    expect(transmises.map(l => l.idQuestionnaire)).toEqual(['Q_STR_04', 'Q_STR_04']);
    expect(transmises.filter(l => l.passationCourante === true)).toHaveLength(1);
  });
});
