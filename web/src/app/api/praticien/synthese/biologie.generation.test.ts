import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// LA CHAÎNE DE LA SYNTHÈSE AVEC LE SECOND APPEL — [[D-513]] §11 amendé par
// [[D-539]] §10 : le message réellement envoyé à chaque appel (l'appel
// principal sans bloc, drapeau posé ; le second avec le bloc seul), l'ordre,
// l'assemblage, le rejet des clés biologiques de l'appel principal, la trace,
// les deux échecs (avant et après l'envoi), et la phrase du narratif.
//
// Par la VRAIE route, le VRAI lecteur (`lireBlocBiologiePourSynthese`, drapeau
// compris) et le VRAI constructeur ; seuls la base et le client Anthropic sont
// simulés. Fixtures entièrement fictives ([[D-125]]).

const { getServerSession, prisma, anthropicCreate, loggerWarn, loggerError, annulationsActives } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findFirst: vi.fn() },
    questionnaireReponse: { findMany: vi.fn() },
    consultation: { findFirst: vi.fn() },
    resultatBiologique: { findMany: vi.fn() },
    syntheseIA: { create: vi.fn() },
    auditSynthese: { create: vi.fn() },
  },
  anthropicCreate: vi.fn(),
  loggerWarn: vi.fn(),
  loggerError: vi.fn(),
  annulationsActives: vi.fn(),
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
vi.mock('@/lib/anthropic', async (importOriginal) => {
  const reel = await importOriginal<typeof import('@/lib/anthropic')>();
  return { ...reel, anthropic: { messages: { create: anthropicCreate } } };
});
vi.mock('@/lib/biology-library/publie', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/biology-library/publie')>()),
  annulationsActives,
}));
vi.mock('@/lib/scoring/miniSynthese', () => ({ buildMiniSynthese: () => ({}) }));
vi.mock('@/lib/consultation/contexteClinique', () => ({
  buildContexteClinique: () => 'ANAMNESE-FICTIVE-NE-PART-PAS-AU-SECOND',
  extraireVigilanceDeterministe: () => [] as string[],
}));
vi.mock('@/lib/physio-traitements/lecture', () => ({ lireTraitementsEnVigueur: async () => [] }));
vi.mock('@/lib/observability/logger', () => ({
  logger: { error: loggerError, warn: loggerWarn, security: vi.fn() },
}));
vi.mock('@/lib/observability/requestContext', () => ({
  createRequestContext: () => ({}),
  finalizeLogContext: (_c: unknown, x: unknown) => x,
  withCorrelationHeader: (res: unknown) => res,
}));

import { SYSTEM_PROMPT_SYNTHESE } from '@/lib/anthropic';
import { ECART_INTERVALLE_SUIVI_UNITE, SYSTEM_PROMPT_SYNTHESE_BIOLOGIE } from '@/lib/synthese/appelBiologie';
import { verdictContamination } from '@/lib/synthese/contaminationBiologie';
import { POST } from './route';

const PRINCIPALE = {
  resume_praticien: 'Synthèse concise pour le praticien.',
  axes_prioritaires: [],
  points_de_vigilance: ['Un point'],
  questions_entretien: ['Une question ?'],
  narratif_patient: 'Un texte accessible.',
  limites: 'À valider par le praticien.',
};
const RESTITUTION = {
  resume_biologie_praticien: 'RESTITUTION-FICTIVE du second appel.',
  points_de_vigilance_biologie: ['VIGILANCE-FICTIVE : contexte non recueilli.'],
};

// Une ligne de résultat telle que la base la rend au lecteur — fictive.
const LIGNE = {
  id: 'r1',
  analyteCode: 'FERRITINE',
  valeur: { toFixed: () => '41' },
  unite: 'µg/L',
  preleveLe: new Date('2026-10-08T06:45:00Z'),
  source: 'saisie_praticien',
  saisiLe: new Date('2026-10-09T08:00:00Z'),
  supersedesResultatId: null,
  analyte: { libelle: 'Ferritine' },
  ligneCandidate: {
    intervalleLu: '30 - 400',
    intervalleNonTranscrit: false,
    uniteLue: 'µg/L',
    valeurLue: '41',
    heureLue: false,
    import: { laboratoireLu: 'Laboratoire fictif', versionPrompt: 'bio-extraction-v5' },
  },
  contextesPrelevement: [],
};

function reponse(objet: unknown, usage: Record<string, number> = {}) {
  return { content: [{ type: 'text', text: JSON.stringify(objet) }], stop_reason: 'end_turn', usage };
}

function req(): Request {
  return new Request('http://x/api/praticien/synthese', { method: 'POST', body: JSON.stringify({ idPatient: 'PAT_SEED_01' }) });
}

function allumer() {
  vi.stubEnv('WN_SYNTHESE_BIOLOGIE_ENABLED', 'true');
  vi.stubEnv('WN_CB_RESULTS_ENABLED', 'true');
  vi.stubEnv('WN_CB_ENABLED', 'true');
}

function enregistree() {
  expect(prisma.syntheseIA.create).toHaveBeenCalledTimes(1);
  return prisma.syntheseIA.create.mock.calls[0][0].data;
}

const PHRASE = 'Votre praticien a reçu votre bilan biologique du 8 octobre 2026.';

beforeEach(() => {
  vi.clearAllMocks();
  for (const d of ['WN_SYNTHESE_BIOLOGIE_ENABLED', 'WN_CB_RESULTS_ENABLED', 'WN_CB_ENABLED', 'WN_SYNTHESE_STREAM']) vi.stubEnv(d, '');
  process.env.ANTHROPIC_API_KEY = 'test-key';
  getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
  prisma.patient.findFirst.mockResolvedValue({ idPatient: 'PAT_SEED_01', email: 'pat@example.com', actif: true, suiviClotureLe: null });
  prisma.questionnaireReponse.findMany.mockResolvedValue([
    { idReponse: 'R1', idQuestionnaire: 'Q_ALI_02', titre: 'Diète méditerranéenne', dateReponse: new Date('2026-07-10'), scoresJson: {}, scorePrincipal: 12, interpretation: null },
  ]);
  prisma.consultation.findFirst.mockResolvedValue({ ficheSignaletique: {}, anamnese: {} });
  prisma.resultatBiologique.findMany.mockResolvedValue([LIGNE]);
  annulationsActives.mockResolvedValue(new Map());
  prisma.syntheseIA.create.mockResolvedValue({ idSynthese: 'SYN_1', dateGeneration: new Date('2026-11-18T00:00:00Z') });
  prisma.auditSynthese.create.mockResolvedValue({});
});
afterEach(() => vi.unstubAllEnvs());

describe('drapeau posé, un résultat : deux appels, dans l’ordre, chacun son message', () => {
  it('l’appel principal ne porte aucune biologie ; le second porte le bloc seul, sous sa consigne', async () => {
    allumer();
    anthropicCreate
      .mockResolvedValueOnce(reponse(PRINCIPALE, { input_tokens: 100 }))
      .mockResolvedValueOnce(reponse(RESTITUTION, { input_tokens: 20 }));
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(anthropicCreate).toHaveBeenCalledTimes(2);

    const [principal] = anthropicCreate.mock.calls[0];
    const [second] = anthropicCreate.mock.calls[1];
    const bloc = enregistree().donneesEntree.blocBiologie;

    // L'appel principal : sa consigne, et rien du bloc dans son message.
    expect(principal.system[0].text).toBe(SYSTEM_PROMPT_SYNTHESE);
    const envoyePrincipal = JSON.stringify(principal.messages);
    for (const interdit of ['Résultats de biologie', 'Ferritine', '41 µg/L', '30 - 400', 'textes_laboratoire_cites', 'Laboratoire fictif', 'Prélevé le']) {
      expect(envoyePrincipal, interdit).not.toContain(interdit);
    }
    // Le second : sa consigne, et le bloc exact, seul.
    expect(second.system[0].text).toBe(SYSTEM_PROMPT_SYNTHESE_BIOLOGIE);
    expect(second.messages).toEqual([{ role: 'user', content: bloc.texte }]);
    expect(bloc.texte.startsWith('## Résultats de biologie')).toBe(true);
    for (const interdit of ['ANAMNESE-FICTIVE', 'Diète méditerranéenne', 'Q_ALI_02', 'PAT_SEED_01', 'pat@example.com']) {
      expect(JSON.stringify(second.messages), interdit).not.toContain(interdit);
    }
  });

  it('l’assemblage : les deux champs du second appel, la phrase en dernier paragraphe, la trace et les métriques', async () => {
    allumer();
    anthropicCreate
      .mockResolvedValueOnce(reponse(PRINCIPALE, { input_tokens: 100, output_tokens: 10 }))
      .mockResolvedValueOnce(reponse(RESTITUTION, { input_tokens: 20, output_tokens: 5 }));
    await POST(req());
    const data = enregistree();
    expect(data.syntheseJson.resume_biologie_praticien).toBe(RESTITUTION.resume_biologie_praticien);
    expect(data.syntheseJson.points_de_vigilance_biologie).toEqual(RESTITUTION.points_de_vigilance_biologie);
    expect(data.syntheseJson.narratif_patient).toBe(`${PRINCIPALE.narratif_patient}\n\n${PHRASE}`);
    expect(data.syntheseJson._schema_version).toBe('synthese-json-v4');
    expect(data.versionPrompt).toBe('synthese-v41');
    expect(data.donneesEntree.appelBiologie).toEqual({
      versionPrompt: 'synthese-biologie-v2', modele: data.modele, issue: 'reussi',
    });
    expect(data.donneesEntree.metriquesAnthropic.input_tokens).toBe(120);
    expect(data.donneesEntree.metriquesAnthropic.output_tokens).toBe(15);
    // La clé de trace est celle que lit le contrôle de contamination : la
    // restitution dans les champs dédiés et la phrase n'y sont pas suspectes.
    expect(data.donneesEntree.blocBiologie.formes.valeursUnites).toEqual([{ valeur: '41', unite: 'µg/L' }]);
    expect(verdictContamination(data.syntheseJson, data.donneesEntree)).toEqual({ suspecte: false });
    // …et une recopie dans un champ ordinaire, elle, l'est.
    expect(verdictContamination({ ...data.syntheseJson, resume_praticien: 'Ferritine 41 µg/L.' }, data.donneesEntree).suspecte).toBe(true);
    expect(loggerWarn).not.toHaveBeenCalled();
  });

  it('des clés biologiques produites par l’appel principal sont rejetées : relance, puis le second appel', async () => {
    allumer();
    anthropicCreate
      .mockResolvedValueOnce(reponse({ ...PRINCIPALE, resume_biologie_praticien: 'Ferritine 41 µg/L', points_de_vigilance_biologie: [] }))
      .mockResolvedValueOnce(reponse(PRINCIPALE))
      .mockResolvedValueOnce(reponse(RESTITUTION));
    await POST(req());
    expect(anthropicCreate).toHaveBeenCalledTimes(3);
    expect(anthropicCreate.mock.calls[2][0].system[0].text).toBe(SYSTEM_PROMPT_SYNTHESE_BIOLOGIE);
    expect(enregistree().syntheseJson.resume_biologie_praticien).toBe(RESTITUTION.resume_biologie_praticien);
  });

  it('l’appel principal en échec : le bloc ne part pas, rien n’est enregistré', async () => {
    allumer();
    anthropicCreate.mockResolvedValue(reponse({ ...PRINCIPALE, axes_prioritaires: [{ axe: 'x', niveau_priorite: 'critique', arguments: ['a'], points_a_confirmer: ['b'] }] }));
    const res = await POST(req());
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(anthropicCreate).toHaveBeenCalledTimes(2);
    for (const [corps] of anthropicCreate.mock.calls) expect(corps.system[0].text).toBe(SYSTEM_PROMPT_SYNTHESE);
    expect(prisma.syntheseIA.create).not.toHaveBeenCalled();
  });
});

describe('les deux échecs, qui ne se confondent pas (D-539 §2)', () => {
  it('après l’envoi, erreur du fournisseur : bloc conservé, issue dite, champs vides, phrase posée, journal sans contenu', async () => {
    allumer();
    anthropicCreate
      .mockResolvedValueOnce(reponse(PRINCIPALE))
      .mockRejectedValueOnce(new Error('message brut du fournisseur : Ferritine 41 µg/L'));
    const res = await POST(req());
    expect(res.status).toBe(200);
    const data = enregistree();
    expect(data.donneesEntree.blocBiologie.texte).toContain('Ferritine');
    expect(data.donneesEntree.appelBiologie.issue).toBe('echec_appel');
    expect(data.syntheseJson.resume_biologie_praticien).toBe('');
    expect(data.syntheseJson.points_de_vigilance_biologie).toEqual([]);
    expect(data.syntheseJson.narratif_patient.endsWith(`\n\n${PHRASE}`)).toBe(true);
    const ligne = loggerWarn.mock.calls.map(c => c[0]).find(l => l.event === 'SYNTHESE_IA.BIOLOGIE.APPEL_ECHOUE');
    expect(ligne).toBeDefined();
    const journal = JSON.stringify(loggerWarn.mock.calls);
    for (const interdit of ['Ferritine', '41', 'message brut', 'Résultats de biologie']) expect(journal, interdit).not.toContain(interdit);
  });

  it('après l’envoi, sortie rejetée deux fois : sortie_rejetee, champs vides, journal sans la sortie', async () => {
    allumer();
    anthropicCreate
      .mockResolvedValueOnce(reponse(PRINCIPALE))
      .mockResolvedValue(reponse({ resume_biologie_praticien: '', points_de_vigilance_biologie: ['SORTIE-DU-MODELE'] }));
    await POST(req());
    expect(anthropicCreate).toHaveBeenCalledTimes(3);
    const data = enregistree();
    expect(data.donneesEntree.appelBiologie.issue).toBe('sortie_rejetee');
    expect(data.syntheseJson.resume_biologie_praticien).toBe('');
    expect(data.syntheseJson.points_de_vigilance_biologie).toEqual([]);
    expect(JSON.stringify(loggerWarn.mock.calls)).not.toContain('SORTIE-DU-MODELE');
  });

  it('un intervalle imprimé suivi d’une unité, corrigé à la relance : servi, et le journal nomme l’écart du contrôle, sans texte du bloc (revue wn-reviewer, P2-1)', async () => {
    allumer();
    anthropicCreate
      .mockResolvedValueOnce(reponse(PRINCIPALE))
      .mockResolvedValueOnce(reponse({ resume_biologie_praticien: 'Intervalle imprimé : 30 - 400 µg/L.', points_de_vigilance_biologie: [] }))
      .mockResolvedValueOnce(reponse(RESTITUTION));
    await POST(req());
    const data = enregistree();
    expect(data.donneesEntree.appelBiologie.issue).toBe('reussi');
    expect(data.syntheseJson.resume_biologie_praticien).toBe(RESTITUTION.resume_biologie_praticien);
    const ligne = loggerWarn.mock.calls.map(c => c[0]).find(l => l.event === 'SYNTHESE_IA.BIOLOGIE.REJETE_RELANCE');
    expect(ligne?.message).toContain(ECART_INTERVALLE_SUIVI_UNITE);
    expect(ligne?.message).not.toContain('hors schéma');
    const journal = JSON.stringify(loggerWarn.mock.calls);
    for (const interdit of ['Ferritine', '41', '30 - 400', 'µg/L']) expect(journal, interdit).not.toContain(interdit);
  });

  it('un intervalle imprimé suivi d’une unité, deux fois : sortie_rejetee, synthèse servie, écart nommé sans texte du bloc (D-545 §4)', async () => {
    allumer();
    const fautive = {
      resume_biologie_praticien: 'Ferritine 41 µg/L le 2026-10-08 ; intervalle imprimé par le laboratoire : 30 - 400 µg/L.',
      points_de_vigilance_biologie: [],
    };
    anthropicCreate
      .mockResolvedValueOnce(reponse(PRINCIPALE))
      .mockResolvedValue(reponse(fautive));
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(anthropicCreate).toHaveBeenCalledTimes(3);
    expect(anthropicCreate.mock.calls[2][0].messages.at(-1).content).toContain(ECART_INTERVALLE_SUIVI_UNITE);
    const data = enregistree();
    expect(data.donneesEntree.appelBiologie.issue).toBe('sortie_rejetee');
    expect(data.syntheseJson.resume_biologie_praticien).toBe('');
    expect(data.syntheseJson.points_de_vigilance_biologie).toEqual([]);
    expect(data.syntheseJson.narratif_patient.endsWith(`\n\n${PHRASE}`)).toBe(true);
    const journal = JSON.stringify(loggerWarn.mock.calls);
    expect(journal).toContain(ECART_INTERVALLE_SUIVI_UNITE);
    for (const interdit of ['Ferritine', '41', '30 - 400', 'µg/L', 'Résultats de biologie']) expect(journal, interdit).not.toContain(interdit);
  });

  it('avant l’envoi, lecture en échec : rien n’est parti, blocBiologie et appelBiologie à null, aucune phrase', async () => {
    allumer();
    prisma.resultatBiologique.findMany.mockRejectedValue(new Error('erreur de base citant 41 µg/L'));
    anthropicCreate.mockResolvedValueOnce(reponse(PRINCIPALE));
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(anthropicCreate).toHaveBeenCalledTimes(1);
    const data = enregistree();
    expect(data.donneesEntree.blocBiologie).toBeNull();
    expect(data.donneesEntree.appelBiologie).toBeNull();
    expect(data.syntheseJson.narratif_patient).toBe(PRINCIPALE.narratif_patient);
    const ligne = loggerWarn.mock.calls.map(c => c[0]).find(l => l.event === 'SYNTHESE_IA.BIOLOGIE.BLOC_INDISPONIBLE');
    expect(ligne).toBeDefined();
    expect(JSON.stringify(loggerWarn.mock.calls)).not.toContain('41');
  });
});

describe('sans second appel, les deux champs restent vides (D-539 §2)', () => {
  it('drapeau éteint : aucune lecture, un seul appel, trace à null, aucune phrase', async () => {
    anthropicCreate.mockResolvedValueOnce(reponse(PRINCIPALE));
    await POST(req());
    expect(prisma.resultatBiologique.findMany).not.toHaveBeenCalled();
    expect(anthropicCreate).toHaveBeenCalledTimes(1);
    const data = enregistree();
    expect(data.donneesEntree.blocBiologie).toBeNull();
    expect(data.donneesEntree.appelBiologie).toBeNull();
    expect(data.syntheseJson.resume_biologie_praticien).toBe('');
    expect(data.syntheseJson.points_de_vigilance_biologie).toEqual([]);
    expect(data.syntheseJson.narratif_patient).toBe(PRINCIPALE.narratif_patient);
  });

  it('drapeau posé, aucun résultat : un seul appel, aucune phrase', async () => {
    allumer();
    prisma.resultatBiologique.findMany.mockResolvedValue([]);
    anthropicCreate.mockResolvedValueOnce(reponse(PRINCIPALE));
    await POST(req());
    expect(anthropicCreate).toHaveBeenCalledTimes(1);
    expect(enregistree().donneesEntree.appelBiologie).toBeNull();
    expect(enregistree().syntheseJson.narratif_patient).toBe(PRINCIPALE.narratif_patient);
  });
});
