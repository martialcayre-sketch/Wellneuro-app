import { beforeEach, describe, expect, it, vi } from 'vitest';

// H95 part A, [[D-462]] — ce que la génération fait du bloc des besoins, et du
// signalement du texte patient. Le patron est celui de
// `orientation.restitution.test.ts` : le message réellement envoyé au modèle, et
// la trace réellement persistée.

const { getServerSession, prisma, anthropicCreate, validateSyntheseSchema, evaluerOrientationPourPatient, loggerWarn, blocEnPanne } =
  vi.hoisted(() => ({
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
    evaluerOrientationPourPatient: vi.fn(),
    loggerWarn: vi.fn(),
    blocEnPanne: { actif: false },
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
  SYSTEM_PROMPT_SYNTHESE: 'Consigne de test.',
  VERSION_CORPUS_SYNTHESE: 'v',
  VERSION_PROMPT_SYNTHESE: 'v',
  VERSION_SCHEMA_SYNTHESE: 'v',
  validateSyntheseSchema,
  analyserSortieSynthese: (o: unknown) => ({ ok: true, synthese: validateSyntheseSchema(o) }),
  sanitizeAuditError: (m: string) => m,
  CORPUS_CLINIQUE_ACTIF: '',
}));
vi.mock('@/lib/clinical/corpusSyntheseV1', () => ({
  CORPUS_CLINIQUE_METADATA: {},
  CORPUS_CLINIQUE_SHA256: 'sha',
  sha256: (texte: string) => `sha256(${texte.length})`,
}));
vi.mock('@/lib/clinical/orientationService', () => ({ evaluerOrientationPourPatient }));
vi.mock('@/lib/scoring/miniSynthese', () => ({ buildMiniSynthese: () => ({}) }));
vi.mock('@/lib/consultation/contexteClinique', () => ({
  buildContexteClinique: () => '',
  extraireVigilanceDeterministe: () => [] as string[],
}));
vi.mock('@/lib/observability/logger', () => ({
  logger: { error: vi.fn(), warn: loggerWarn, security: vi.fn() },
}));
vi.mock('@/lib/observability/requestContext', () => ({
  createRequestContext: () => ({}),
  finalizeLogContext: (_c: unknown, x: unknown) => x,
  withCorrelationHeader: (res: unknown) => res,
}));
vi.mock('@/lib/synthese/blocBesoins', async importOriginal => {
  const original = await importOriginal<typeof import('@/lib/synthese/blocBesoins')>();
  return {
    construireBlocBesoins: (...args: Parameters<typeof original.construireBlocBesoins>) => {
      if (blocEnPanne.actif) throw new Error('panne de calcul');
      return original.construireBlocBesoins(...args);
    },
  };
});

import { EVENT_CODES } from '@/lib/observability/eventCodes';
import { POST } from './route';

function req(): Request {
  return new Request('http://x/api/praticien/synthese', {
    method: 'POST',
    body: JSON.stringify({ idPatient: 'PAT_SEED_01' }),
  });
}

function messageEnvoye(): string {
  return anthropicCreate.mock.calls[0][0].messages[0].content as string;
}

function donneesEntree(): { blocBesoins: string | null } {
  return prisma.syntheseIA.create.mock.calls[0][0].data.donneesEntree;
}

function evenements(code: string): { message: string }[] {
  return loggerWarn.mock.calls.map(([entree]) => entree).filter(entree => entree.event === code);
}

const ORIENTATION_ACTIVE = {
  actif: true as const,
  version: 'orientation-nnpp2-v1',
  sha256: 'abc',
  recommandations: [
    {
      cible: { type: 'questionnaire' as const, questionnaireId: 'Q_SOM_02' },
      priorite: 1,
      niveau: 'approfondissement' as const,
      objectifs: [],
      needIds: [5],
      dejaAssigne: false,
      dejaRepondu: false,
      motifs: [{ regleId: 'R-SOM-01', conditions: ['condition'], claims: [] }],
    },
  ],
  ecartees: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  blocEnPanne.actif = false;
  process.env.ANTHROPIC_API_KEY = 'test-key';
  delete process.env.WN_SYNTHESE_STREAM;
  getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
  prisma.patient.findFirst.mockResolvedValue({ idPatient: 'PAT_SEED_01', email: 'pat@example.com', actif: true, suiviClotureLe: null });
  prisma.questionnaireReponse.findMany.mockResolvedValue([
    {
      idQuestionnaire: 'Q_ALI_02',
      titre: 'Diète méditerranéenne',
      dateReponse: new Date('2026-07-10'),
      scoresJson: {},
      scorePrincipal: 12,
      interpretation: null,
      statutValidite: null,
    },
  ]);
  prisma.consultation.findFirst.mockResolvedValue(null);
  validateSyntheseSchema.mockReturnValue({ points_de_vigilance: [], narratif_patient: 'Votre sommeil ressort comme un axe à explorer.' });
  anthropicCreate.mockResolvedValue({
    content: [{ type: 'text', text: '{"resume_praticien":"ok"}' }],
    stop_reason: 'end_turn',
    usage: {},
  });
  prisma.syntheseIA.create.mockResolvedValue({ idSynthese: 'SYN_1', dateGeneration: new Date('2026-08-03T00:00:00Z') });
  prisma.auditSynthese.create.mockResolvedValue({});
  evaluerOrientationPourPatient.mockResolvedValue(ORIENTATION_ACTIVE);
});

describe('le bloc des besoins part au modèle', () => {
  it('entre le bloc d’orientation et les résultats', async () => {
    await POST(req());
    const message = messageEnvoye();
    const orientation = message.indexOf("## Recommandation d'exploration déterministe");
    const besoins = message.indexOf('## Besoins mesurés et non mesurés');
    const resultats = message.indexOf('## Résultats des questionnaires');
    expect(orientation).toBeGreaterThan(-1);
    expect(besoins).toBeGreaterThan(orientation);
    expect(resultats).toBeGreaterThan(besoins);
  });

  it('même quand la table d’orientation ne propose rien : ce bloc ne dépend pas d’elle', async () => {
    evaluerOrientationPourPatient.mockResolvedValue({ actif: false, version: 'v', message: 'non activée' });
    await POST(req());
    expect(messageEnvoye()).toContain('## Besoins mesurés et non mesurés');
  });

  it('la trace garde le texte exact parti au modèle', async () => {
    await POST(req());
    const { blocBesoins } = donneesEntree();
    expect(blocBesoins).toContain('Besoin 12,');
    expect(messageEnvoye()).toContain(blocBesoins as string);
  });

  it('une panne du calcul : la synthèse part sans le bloc, trace à null, événement propre', async () => {
    blocEnPanne.actif = true;
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(messageEnvoye()).not.toContain('## Besoins mesurés et non mesurés');
    expect(donneesEntree().blocBesoins).toBeNull();
    expect(evenements(EVENT_CODES.SYNTHESE_BESOINS_INDISPONIBLES)).toHaveLength(1);
  });
});

describe('le bloc voit les mêmes passations que le cockpit', () => {
  // `reponses` et non `reponsesAdministrables` : le motif « écartée » n'existe que
  // si le calcul reçoit la passation écartée, pour la retirer lui-même.
  it('une passation écartée, drapeau de validité allumé : le besoin le dit', async () => {
    const avant = process.env.WN_ENABLE_VALIDITE_PASSATIONS;
    process.env.WN_ENABLE_VALIDITE_PASSATIONS = '1';
    try {
      prisma.questionnaireReponse.findMany.mockResolvedValue([
        {
          idQuestionnaire: 'Q_ALI_02',
          titre: 'Diète méditerranéenne',
          dateReponse: new Date('2026-07-10'),
          scoresJson: {},
          scorePrincipal: 12,
          interpretation: null,
          statutValidite: 'VALID',
        },
        {
          idQuestionnaire: 'Q_NEU_11',
          titre: 'HAD',
          dateReponse: new Date('2026-07-11'),
          scoresJson: { rawAnswers: { D2: '0' } },
          scorePrincipal: 1,
          interpretation: null,
          statutValidite: 'INVALID',
        },
      ]);
      await POST(req());
      const ligne = messageEnvoye().split('\n').find(l => l.startsWith('Besoin 8,'));
      expect(ligne).toContain(': non mesuré, passation écartée du raisonnement.');
    } finally {
      if (avant === undefined) delete process.env.WN_ENABLE_VALIDITE_PASSATIONS;
      else process.env.WN_ENABLE_VALIDITE_PASSATIONS = avant;
    }
  });

  // Deux bancs l'un contre l'autre : le premier renvoie LE BLOC RÉEL comme texte du
  // modèle, si bien qu'un instrument cité par le bloc et absent des passations
  // transmises le ferait rougir ; le second prouve que la garde regarde vraiment.
  function reponseDuModele(texte: (message: string) => string): void {
    anthropicCreate.mockImplementation(async (params: { messages: { content: string }[] }) => {
      validateSyntheseSchema.mockReturnValue({
        points_de_vigilance: [],
        resume_praticien: texte(params.messages[0].content),
        narratif_patient: 'Votre gestion du stress a été renseignée.',
      });
      return { content: [{ type: 'text', text: '{"resume_praticien":"ok"}' }], stop_reason: 'end_turn', usage: {} };
    });
  }

  function ecartsDeRestitution(): unknown[] {
    return prisma.syntheseIA.create.mock.calls[0][0].data.donneesEntree.metadonneesPrompt.orientationEcartsRestitution;
  }

  function passationsCitees(): void {
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      {
        idQuestionnaire: 'Q_STR_01',
        titre: 'Stress',
        dateReponse: new Date('2026-07-10'),
        scoresJson: { rawAnswers: { A1: 1 } },
        scorePrincipal: 1,
        interpretation: null,
        statutValidite: 'VALID',
      },
      {
        idQuestionnaire: 'Q_NEU_11',
        titre: 'HAD',
        dateReponse: new Date('2026-07-11'),
        scoresJson: { rawAnswers: { D2: '0' } },
        scorePrincipal: 1,
        interpretation: null,
        statutValidite: 'VALID',
      },
    ]);
  }

  it('le modèle qui recopie le bloc entier n’est pas accusé d’infidélité', async () => {
    passationsCitees();
    let bloc = '';
    reponseDuModele(message => {
      bloc = message.slice(message.indexOf('## Besoins mesurés et non mesurés'), message.indexOf('## Résultats des questionnaires'));
      return bloc;
    });
    await POST(req());
    // Le bloc cite bien des instruments : sans eux, ce banc ne prouverait rien.
    expect(bloc).toContain('Q_STR_01');
    expect(bloc).toContain('recueil incomplet sur les items lus (Q_NEU_11');
    expect(ecartsDeRestitution()).toEqual([]);
  });

  it('le modèle qui cite un instrument hors du bloc et hors des passations est relevé', async () => {
    passationsCitees();
    reponseDuModele(() => 'Il faudrait proposer Q_STR_03.');
    await POST(req());
    expect(ecartsDeRestitution()).not.toEqual([]);
  });
});

describe('le signalement du texte patient', () => {
  const NARRATIF_CHIFFRE = 'Mention confidentielle du dossier : votre résultat atteint 62 %.';

  it('une forme de score : un événement, des codes, jamais le texte', async () => {
    validateSyntheseSchema.mockReturnValue({ points_de_vigilance: [], narratif_patient: NARRATIF_CHIFFRE });
    await POST(req());
    const [evenement] = evenements(EVENT_CODES.SYNTHESE_NARRATIF_FORME_DE_SCORE);
    expect(evenement.message).toContain('Forme de score relevée dans le narratif patient, sans blocage ni correction');
    expect(evenement.message).toContain('pourcentage');
    // L'identifiant de la synthèse est aléatoire : il peut contenir « 62 ». On le
    // retire avant de chercher la valeur, sinon ce banc rougit au hasard.
    const sansIdentifiant = evenement.message.replace(/SYN_[A-Za-z0-9_-]+/g, '');
    expect(sansIdentifiant).not.toContain('62');
    expect(sansIdentifiant).not.toContain('confidentielle');
  });

  it('ne bloque ni ne corrige : le texte est persisté tel quel', async () => {
    validateSyntheseSchema.mockReturnValue({ points_de_vigilance: [], narratif_patient: NARRATIF_CHIFFRE });
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(prisma.syntheseIA.create.mock.calls[0][0].data.syntheseJson.narratif_patient).toBe(NARRATIF_CHIFFRE);
  });

  it('une quantité déclarée ne déclenche rien', async () => {
    validateSyntheseSchema.mockReturnValue({ points_de_vigilance: [], narratif_patient: 'Vous déclarez dormir 6 heures.' });
    await POST(req());
    expect(evenements(EVENT_CODES.SYNTHESE_NARRATIF_FORME_DE_SCORE)).toEqual([]);
  });
});
