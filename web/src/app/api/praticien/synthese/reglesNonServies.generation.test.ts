import { beforeEach, describe, expect, it, vi } from 'vitest';

// Ligne t77, [[D-511]] — ce que la génération fait des règles que le service
// n'applique pas. Patron de `reglesNonEvaluees.generation.test.ts` : le message
// réellement envoyé au modèle, et la trace réellement persistée. Les verrous de
// l'orientation et des contradictions sont pilotés, la lecture du corpus et le
// producteur de constats sont espionnés.

const {
  getServerSession, prisma, anthropicCreate, validateSyntheseSchema, evaluerOrientationPourPatient,
  etat, reglesOrientationAdmissibles, constatsContradictionsPourDossier,
} = vi.hoisted(() => ({
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
  etat: { orientation: true, contradictions: true },
  reglesOrientationAdmissibles: vi.fn(),
  constatsContradictionsPourDossier: vi.fn(),
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
vi.mock('@/lib/clinical/orientationService', () => ({
  evaluerOrientationPourPatient,
  orientationActive: () => etat.orientation,
}));
vi.mock('@/lib/clinical/orientationAdmissible', () => ({ reglesOrientationAdmissibles }));
vi.mock('@/lib/clinical/contradictionsService', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/clinical/contradictionsService')>()),
  contradictionsActives: () => etat.contradictions,
  constatsContradictionsPourDossier,
}));
vi.mock('@/lib/scoring/miniSynthese', () => ({ buildMiniSynthese: () => ({}) }));
vi.mock('@/lib/consultation/contexteClinique', () => ({
  buildContexteClinique: () => '',
  extraireVigilanceDeterministe: () => [] as string[],
}));
vi.mock('@/lib/observability/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), security: vi.fn() },
}));
vi.mock('@/lib/observability/requestContext', () => ({
  createRequestContext: () => ({}),
  finalizeLogContext: (_c: unknown, x: unknown) => x,
  withCorrelationHeader: (res: unknown) => res,
}));

import { POST } from './route';

const TITRE = '## Règles non appliquées par le service';
const SOURCES = "Sources de l'orientation non vérifiées : la validité de ses sources n'a pas pu être vérifiée.";
const VIGILANCE = "Convergences non évaluées : la validité de leurs sources n'a pas pu être vérifiée.";

function req(): Request {
  return new Request('http://x/api/praticien/synthese', {
    method: 'POST',
    body: JSON.stringify({ idPatient: 'PAT_SEED_01' }),
  });
}

function messageEnvoye(): string {
  return anthropicCreate.mock.calls[0][0].messages[0].content as string;
}

type Trace = {
  blocReglesNonServies: string;
  reglesNonAppliquees: unknown[];
  arretsSuspendus: unknown[];
  arretsNonEvalues: string[];
  sourcesOrientationNonVerifiees: boolean;
  convergencesNonEvaluees: boolean;
  vigilanceDeterministe: string[];
};

function donneesEntree(): Trace {
  return prisma.syntheseIA.create.mock.calls[0][0].data.donneesEntree;
}

const COUPLE = { claimId: '0167-023', versionClaim: 'v2' };

function orientation(partiel: Record<string, unknown>) {
  return {
    actif: true as const,
    version: 'orientation-nnpp2-v1',
    sha256: 'abc',
    recommandations: [],
    ecartees: [],
    reglesNonEvaluees: [],
    arretsNonEvalues: [],
    arret: null,
    arretsSuspendus: [],
    reglesNonAppliquees: [],
    ...partiel,
  };
}

const INACTIF_SOURCES = {
  actif: false as const,
  version: 'orientation-nnpp2-v1',
  message: "L'orientation n'est pas affichée : la validité de ses sources n'a pas pu être vérifiée.",
};

const LECTURE = { regles: [], nonAppliquees: [] };

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ANTHROPIC_API_KEY = 'test-key';
  delete process.env.WN_SYNTHESE_STREAM;
  etat.orientation = true;
  etat.contradictions = true;
  getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
  prisma.patient.findFirst.mockResolvedValue({ idPatient: 'PAT_SEED_01', email: 'pat@example.com', actif: true, suiviClotureLe: null });
  prisma.questionnaireReponse.findMany.mockResolvedValue([
    {
      idQuestionnaire: 'Q_STR_02',
      titre: 'Échelle de stress perçu (PSS-10)',
      dateReponse: new Date('2026-03-12T09:30:00.000Z'),
      scoresJson: {},
      scorePrincipal: 30,
      interpretation: null,
      statutValidite: null,
    },
  ]);
  prisma.consultation.findFirst.mockResolvedValue(null);
  validateSyntheseSchema.mockReturnValue({ points_de_vigilance: [], narratif_patient: 'Texte.' });
  anthropicCreate.mockResolvedValue({
    content: [{ type: 'text', text: '{"resume_praticien":"ok"}' }],
    stop_reason: 'end_turn',
    usage: {},
  });
  prisma.syntheseIA.create.mockResolvedValue({ idSynthese: 'SYN_1', dateGeneration: new Date('2026-11-13T00:00:00Z') });
  prisma.auditSynthese.create.mockResolvedValue({});
  reglesOrientationAdmissibles.mockResolvedValue(LECTURE);
  constatsContradictionsPourDossier.mockReturnValue([]);
  evaluerOrientationPourPatient.mockResolvedValue(orientation({}));
});

describe('le bloc des règles non appliquées part au modèle (D-511 §2)', () => {
  it('même quand aucune recommandation ne sort, après les règles non évaluées et avant les besoins', async () => {
    evaluerOrientationPourPatient.mockResolvedValue(orientation({
      reglesNonAppliquees: [{ regleId: 'R2-STR-01', claims: [COUPLE] }],
      reglesNonEvaluees: [{
        regleId: 'R2-SOM-01',
        passations: [{ idQuestionnaire: 'Q_STR_02', dateReponse: '2026-03-12T09:30:00.000Z', fenetreJours: 30 }],
      }],
    }));
    await POST(req());
    const message = messageEnvoye();
    expect(message).not.toContain("## Recommandation d'exploration déterministe");
    expect(message).toContain(`${TITRE}\nVersion: orientation-nnpp2-v1\n\nRègles d'orientation non appliquées`);
    const nonEvaluees = message.indexOf("## Règles d'orientation non évaluées");
    const nonServies = message.indexOf(TITRE);
    const besoins = message.indexOf('## Besoins mesurés et non mesurés');
    expect(nonEvaluees).toBeGreaterThan(-1);
    expect(nonServies).toBeGreaterThan(nonEvaluees);
    if (besoins > -1) expect(besoins).toBeGreaterThan(nonServies);
  });

  it('les identifiants restent dans la trace, jamais dans le message', async () => {
    evaluerOrientationPourPatient.mockResolvedValue(orientation({
      reglesNonAppliquees: [{ regleId: 'R2-STR-01', claims: [COUPLE] }],
      arretsSuspendus: [{ stopRuleId: 'STOP-STR', motif: 'claims_non_admissibles', claims: [COUPLE] }],
      arretsNonEvalues: [{
        stopRuleId: 'STOP-ANX',
        passations: [{ idQuestionnaire: 'Q_STR_02', dateReponse: '2026-03-12T09:30:00.000Z', fenetreJours: 30 }],
      }],
    }));
    await POST(req());
    const message = messageEnvoye();
    expect(message).not.toMatch(/R2-STR-01|STOP-STR|STOP-ANX|0167-023/);
    const trace = donneesEntree();
    expect(message).toContain(trace.blocReglesNonServies);
    expect(trace.reglesNonAppliquees).toEqual([{ regleId: 'R2-STR-01', claims: [COUPLE] }]);
    expect(trace.arretsSuspendus).toEqual([{ stopRuleId: 'STOP-STR', motif: 'claims_non_admissibles', claims: [COUPLE] }]);
    expect(trace.arretsNonEvalues).toEqual(['STOP-ANX']);
    expect(trace.sourcesOrientationNonVerifiees).toBe(false);
    expect(trace.convergencesNonEvaluees).toBe(false);
  });

  it('absent quand rien n’est non servi, et la trace le dit', async () => {
    await POST(req());
    expect(messageEnvoye()).not.toContain(TITRE);
    expect(donneesEntree().blocReglesNonServies).toBe('');
    expect(donneesEntree().vigilanceDeterministe).not.toContain(VIGILANCE);
  });
});

describe('corpus illisible (D-511 §2 et §4)', () => {
  it('verrous ouverts : la ligne des sources part au modèle, la vigilance est ajoutée par le code', async () => {
    reglesOrientationAdmissibles.mockResolvedValue(null);
    evaluerOrientationPourPatient.mockResolvedValue(INACTIF_SOURCES);
    await POST(req());
    expect(messageEnvoye()).toContain(`${TITRE}\nVersion: orientation-nnpp2-v1\n\n${SOURCES}`);
    // Le modèle ne reçoit pas la vigilance : elle suit le canal des convergences.
    expect(messageEnvoye()).not.toContain(VIGILANCE);
    const trace = donneesEntree();
    expect(trace.vigilanceDeterministe).toContain(VIGILANCE);
    expect(trace.sourcesOrientationNonVerifiees).toBe(true);
    expect(trace.convergencesNonEvaluees).toBe(true);
  });

  it('une levée de la lecture vaut un corpus illisible', async () => {
    reglesOrientationAdmissibles.mockRejectedValue(new Error('corpus indisponible'));
    evaluerOrientationPourPatient.mockResolvedValue(INACTIF_SOURCES);
    await POST(req());
    expect(messageEnvoye()).toContain(SOURCES);
    expect(donneesEntree().vigilanceDeterministe).toContain(VIGILANCE);
  });

  it('contradictions éteintes : la ligne des sources part, la vigilance de convergence non', async () => {
    etat.contradictions = false;
    reglesOrientationAdmissibles.mockResolvedValue(null);
    evaluerOrientationPourPatient.mockResolvedValue(INACTIF_SOURCES);
    await POST(req());
    expect(messageEnvoye()).toContain(SOURCES);
    expect(donneesEntree().vigilanceDeterministe).not.toContain(VIGILANCE);
    expect(donneesEntree().convergencesNonEvaluees).toBe(false);
  });

  it('orientation éteinte (table non signée) : ni bloc ni vigilance, et le corpus n’est pas lu', async () => {
    etat.orientation = false;
    evaluerOrientationPourPatient.mockResolvedValue({ actif: false, version: 'v', message: 'Orientation non activée.' });
    await POST(req());
    expect(reglesOrientationAdmissibles).not.toHaveBeenCalled();
    expect(messageEnvoye()).not.toContain(TITRE);
    expect(donneesEntree().vigilanceDeterministe).not.toContain(VIGILANCE);
    expect(donneesEntree().sourcesOrientationNonVerifiees).toBe(false);
  });

  // Revue `wn-reviewer` de #2065 (P2-1) : la ligne est posée HORS du `try` du
  // producteur de convergence. La déplacer dedans laisserait les autres bancs
  // verts ; celui-ci tombe.
  it('une levée du producteur de convergence ne tait pas la vigilance', async () => {
    reglesOrientationAdmissibles.mockResolvedValue(null);
    evaluerOrientationPourPatient.mockResolvedValue(INACTIF_SOURCES);
    constatsContradictionsPourDossier.mockImplementation((...args: unknown[]) => {
      if (args[3] === 'convergences') throw new Error('producteur de convergence en panne');
      return [];
    });
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(donneesEntree().vigilanceDeterministe).toContain(VIGILANCE);
  });

  it('service d’orientation en panne : aucun bloc (rien reçu à rapporter), la vigilance reste', async () => {
    reglesOrientationAdmissibles.mockResolvedValue(null);
    evaluerOrientationPourPatient.mockRejectedValue(new Error('base indisponible'));
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(messageEnvoye()).not.toContain(TITRE);
    expect(donneesEntree().vigilanceDeterministe).toContain(VIGILANCE);
  });
});

// [[D-511]] §6.3, revue de #2025 : contradictions ACTIVES, la convergence et
// l'orientation reçoivent le MÊME objet de lecture — pas une copie équivalente.
describe('une seule lecture, contradictions actives', () => {
  it('la convergence et l’orientation reçoivent le même objet', async () => {
    const lecture = { regles: [], nonAppliquees: [{ regleId: 'R2-STR-01', claims: [COUPLE] }] };
    reglesOrientationAdmissibles.mockResolvedValue(lecture);
    await POST(req());
    expect(reglesOrientationAdmissibles).toHaveBeenCalledTimes(1);
    const appelConvergence = constatsContradictionsPourDossier.mock.calls.find(appel => appel[3] === 'convergences');
    expect(appelConvergence).toBeDefined();
    expect(appelConvergence?.[4]).toBe(lecture);
    expect(evaluerOrientationPourPatient.mock.calls[0][1]).toBe(lecture);
  });
});

describe('le garde de restitution ne reproche pas au modèle ce que le bloc lui a transmis', () => {
  it('un instrument des arrêts non évalués, absent des résultats, reste citable', async () => {
    evaluerOrientationPourPatient.mockResolvedValue(orientation({
      recommandations: [{
        cible: { type: 'questionnaire' as const, questionnaireId: 'Q_SOM_02' },
        priorite: 1,
        niveau: 'approfondissement' as const,
        objectifs: [],
        needIds: [5],
        dejaAssigne: false,
        dejaRepondu: false,
        motifs: [{ regleId: 'R-SOM-01', conditions: ['condition'], claims: [] }],
      }],
      arretsNonEvalues: [{
        stopRuleId: 'STOP-INF',
        passations: [{ idQuestionnaire: 'Q_INF_03', dateReponse: '2026-06-01T09:30:00.000Z', fenetreJours: 14 }],
      }],
    }));
    validateSyntheseSchema.mockReturnValue({
      points_de_vigilance: [],
      resume_praticien: 'Q_INF_03 au-delà de sa fenêtre d’arrêt : certaines règles d’arrêt n’ont pas été évaluées. Le Q_ZZZ_09 serait utile.',
      narratif_patient: 'Texte.',
    });
    await POST(req());
    expect(messageEnvoye()).toContain('Q_INF_03');
    const ecarts = JSON.stringify(
      (prisma.syntheseIA.create.mock.calls[0][0].data.donneesEntree as { metadonneesPrompt: { orientationEcartsRestitution: unknown } })
        .metadonneesPrompt.orientationEcartsRestitution,
    );
    expect(ecarts).toContain('Q_ZZZ_09');
    expect(ecarts).not.toContain('Q_INF_03');
  });
});
