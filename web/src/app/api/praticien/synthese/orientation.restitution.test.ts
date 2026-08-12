import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// LOT-06 — ce que la synthèse reçoit de l'orientation déterministe, et ce
// qu'elle en journalise. Le contrat tient en une phrase : le modèle restitue,
// il ne produit pas. Deux gestes le soutiennent, et les deux sont testés ici :
// quand il n'y a rien à restituer, RIEN n'est injecté (on ne compte pas sur la
// consigne pour tenir un bloc vide) ; et si un pack est cité hors de ceux
// transmis, l'écart est journalisé sous son propre code.

const { getServerSession, prisma, anthropicCreate, validateSyntheseSchema, evaluerOrientationPourPatient, loggerWarn } =
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
  // Non vide, et citant un instrument : c'est de cette chaîne que la route
  // dérive les identifiants « soufflés » au modèle par la consigne.
  SYSTEM_PROMPT_SYNTHESE: "Exemple de consigne : la grille d'apports (Q_ALI_03) demande un nombre de portions.",
  VERSION_CORPUS_SYNTHESE: 'v',
  VERSION_PROMPT_SYNTHESE: 'v',
  VERSION_SCHEMA_SYNTHESE: 'v',
  validateSyntheseSchema,
  // Délégation au mock historique : voir la note de `route.post.test.ts`.
  analyserSortieSynthese: (o: unknown) => ({ ok: true, synthese: validateSyntheseSchema(o) }),
  sanitizeAuditError: (m: string) => m,
  CORPUS_CLINIQUE_ACTIF: '',
}));
vi.mock('@/lib/clinical/corpusSyntheseV1', () => ({
  CORPUS_CLINIQUE_METADATA: {},
  CORPUS_CLINIQUE_SHA256: 'sha',
  sha256: (texte: string) => `sha256(${texte.length})`,
}));
// Le service est mocké ICI, et seulement ici : c'est ce qui permet d'exercer le
// chemin `actif: true`, impossible autrement tant que la table n'est pas signée.
vi.mock('@/lib/clinical/orientationService', () => ({ evaluerOrientationPourPatient }));
vi.mock('@/lib/scoring/miniSynthese', () => ({ buildMiniSynthese: () => ({}) }));
vi.mock('@/lib/consultation/contexteClinique', () => ({
  buildContexteClinique: () => '',
  extraireVigilanceDeterministe: () => [] as string[],
}));
vi.mock('@/lib/observability/logger', () => ({
  logger: { error: vi.fn(), warn: loggerWarn, security: vi.fn() },
}));
vi.mock('@/lib/observability/eventCodes', () => ({
  EVENT_CODES: {
    SYNTHESE_ORIENTATION_RESTITUTION_INFIDELE: 'SYNTHESE_IA.ORIENTATION.RESTITUTION_INFIDELE',
    SYNTHESE_ORIENTATION_INDISPONIBLE: 'SYNTHESE_IA.ORIENTATION.INDISPONIBLE',
    SYNTHESE_POST_CONTEXT_UNAVAILABLE: 'SYNTHESE_IA.GENERATION.CONTEXT_UNAVAILABLE',
  },
}));
vi.mock('@/lib/observability/requestContext', () => ({
  createRequestContext: () => ({}),
  finalizeLogContext: (_c: unknown, x: unknown) => x,
  withCorrelationHeader: (res: unknown) => res,
}));

import { POST } from './route';

function req(): Request {
  return new Request('http://x/api/praticien/synthese', {
    method: 'POST',
    body: JSON.stringify({ idPatient: 'PAT_SEED_01' }),
  });
}

/** Le message user réellement envoyé au modèle. */
function messageEnvoye(): string {
  return anthropicCreate.mock.calls[0][0].messages[0].content as string;
}

function metadonneesPersistees(): Record<string, unknown> {
  const data = prisma.syntheseIA.create.mock.calls[0][0].data;
  return (data.donneesEntree as { metadonneesPrompt: Record<string, unknown> }).metadonneesPrompt;
}

const ORIENTATION_ACTIVE = {
  actif: true as const,
  version: 'orientation-nnpp2-v1',
  sha256: 'abc123def456',
  recommandations: [
    {
      cible: { type: 'pack' as const, packId: 'pack_sommeil_chronobiologie' },
      idPackBase: 'PACK_SOMMEIL_CHRONO',
      priorite: 1,
      niveau: 'approfondissement' as const,
      objectifs: ['Caractériser la fragmentation'],
      needIds: [3],
      dejaAssigne: false,
      dejaRepondu: false,
      motifs: [
        {
          regleId: 'R-SOM-01',
          conditions: ['PSQI au-dessus de son seuil publié'],
          claims: [{ claimId: 'WN-CLM-0001', versionClaim: 'v1.0' }],
        },
      ],
    },
  ],
};

const INACTIVE = {
  actif: false as const,
  version: 'orientation-nnpp2-v1',
  message: 'Orientation en cours de constitution — les règles NNPP2 ne sont pas encore validées.',
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ANTHROPIC_API_KEY = 'test-key';
  delete process.env.WN_SYNTHESE_STREAM;
  getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
  prisma.patient.findFirst.mockResolvedValue({ idPatient: 'PAT_SEED_01', email: 'pat@example.com' });
  prisma.questionnaireReponse.findMany.mockResolvedValue([
    {
      idQuestionnaire: 'Q_ALI_02',
      titre: 'Diète méditerranéenne',
      dateReponse: new Date('2026-07-10'),
      scoresJson: {},
      scorePrincipal: 12,
      interpretation: null,
    },
  ]);
  prisma.consultation.findFirst.mockResolvedValue(null);
  validateSyntheseSchema.mockReturnValue({ points_de_vigilance: [] });
  anthropicCreate.mockResolvedValue({
    content: [{ type: 'text', text: '{"resume_praticien":"ok"}' }],
    stop_reason: 'end_turn',
    usage: {},
  });
  prisma.syntheseIA.create.mockResolvedValue({
    idSynthese: 'SYN_1',
    dateGeneration: new Date('2026-08-03T00:00:00Z'),
  });
  prisma.auditSynthese.create.mockResolvedValue({});
  evaluerOrientationPourPatient.mockResolvedValue(INACTIVE);
});

describe('bloc d’orientation transmis au modèle', () => {
  it('n’injecte AUCUN bloc quand la table n’est pas signée', async () => {
    await POST(req());
    const message = messageEnvoye();
    // Pas d'en-tête vide : un titre sans contenu invite le modèle à le remplir.
    expect(message).not.toContain("Recommandation d'exploration déterministe");
  });

  it('n’injecte AUCUN bloc quand la table est signée mais ne recommande rien', async () => {
    evaluerOrientationPourPatient.mockResolvedValue({ ...ORIENTATION_ACTIVE, recommandations: [] });
    await POST(req());
    expect(messageEnvoye()).not.toContain("Recommandation d'exploration déterministe");
  });

  it('injecte le bloc, sa provenance et ses motifs quand la table recommande', async () => {
    evaluerOrientationPourPatient.mockResolvedValue(ORIENTATION_ACTIVE);
    await POST(req());
    const message = messageEnvoye();

    expect(message).toContain("## Recommandation d'exploration déterministe");
    expect(message).toContain('SHA-256: abc123def456');
    expect(message).toContain('Version: orientation-nnpp2-v1');
    // Le titre de doctrine, pas le slug : c'est ce que le modèle doit citer.
    expect(message).toContain('Sommeil et chronobiologie');
    expect(message).toContain('R-SOM-01');
    expect(message).toContain('PSQI au-dessus de son seuil publié');
    // Numéroté : l'ordre est calculé, la numérotation lui retire toute raison
    // de le refaire.
    expect(message).toContain('1. pack');
  });

  // LOT-B — l'antériorité voyage avec la recommandation. Sans elle, le modèle
  // proposait de faire passer un instrument déjà chez le patient : la seule
  // façon de ne pas le dire était de ne pas le savoir.
  it('transmet l’état « déjà assigné » au modèle', async () => {
    evaluerOrientationPourPatient.mockResolvedValue({
      ...ORIENTATION_ACTIVE,
      recommandations: [{ ...ORIENTATION_ACTIVE.recommandations[0], dejaAssigne: true }],
    });
    await POST(req());
    expect(messageEnvoye()).toContain('DÉJÀ ASSIGNÉ (en attente de réponse)');
  });

  it('transmet l’état « déjà renseigné »', async () => {
    evaluerOrientationPourPatient.mockResolvedValue({
      ...ORIENTATION_ACTIVE,
      recommandations: [{ ...ORIENTATION_ACTIVE.recommandations[0], dejaRepondu: true }],
    });
    await POST(req());
    expect(messageEnvoye()).toContain('DÉJÀ RENSEIGNÉ');
  });

  // « inconnu » n'est pas « non renseigné » : un fait inconnu ne doit pas se
  // présenter au modèle comme un fait négatif — même doctrine que le badge
  // « couverture inconnue » du panneau praticien.
  it('distingue une couverture inconnue d’une absence de réponse', async () => {
    evaluerOrientationPourPatient.mockResolvedValue({
      ...ORIENTATION_ACTIVE,
      recommandations: [{ ...ORIENTATION_ACTIVE.recommandations[0], dejaRepondu: null }],
    });
    await POST(req());
    expect(messageEnvoye()).toContain('couverture inconnue');
    expect(messageEnvoye()).not.toContain('DÉJÀ RENSEIGNÉ');
  });

  // Cas réel : une repassation d'un instrument déjà répondu est à la fois
  // renseignée et de nouveau en attente. Les deux états cumulent dans le même
  // segment — aucun n'écrase l'autre.
  it('cumule les deux états quand une repassation est en attente', async () => {
    evaluerOrientationPourPatient.mockResolvedValue({
      ...ORIENTATION_ACTIVE,
      recommandations: [
        { ...ORIENTATION_ACTIVE.recommandations[0], dejaAssigne: true, dejaRepondu: true },
      ],
    });
    await POST(req());
    const message = messageEnvoye();
    expect(message).toContain('DÉJÀ ASSIGNÉ (en attente de réponse)');
    expect(message).toContain('DÉJÀ RENSEIGNÉ');
  });

  // Contrôle négatif. ATTENTION à ce qu'il prouve, et à ce qu'il ne prouve
  // PAS : l'absence de segment ne dit pas « jamais adressé ». Pour un pack,
  // `dejaAssigne` est un `every()` sur la composition — un pack dont sept
  // membres sur huit sont déjà chez le patient ne porte aucun segment. La
  // consigne système est écrite en conséquence et interdit d'en conclure quoi
  // que ce soit ; ce test vérifie seulement qu'on ne fabrique pas d'état.
  it('n’écrit aucun état quand le moteur n’en signale aucun', async () => {
    evaluerOrientationPourPatient.mockResolvedValue(ORIENTATION_ACTIVE);
    await POST(req());
    expect(messageEnvoye()).not.toContain('État :');
  });

  it('place le bloc avant les résultats de questionnaires', async () => {
    evaluerOrientationPourPatient.mockResolvedValue(ORIENTATION_ACTIVE);
    await POST(req());
    const message = messageEnvoye();
    expect(message.indexOf("## Recommandation d'exploration déterministe")).toBeLessThan(
      message.indexOf('## Résultats des questionnaires'),
    );
  });

  it('ne fait pas échouer la synthèse si l’orientation est indisponible', async () => {
    evaluerOrientationPourPatient.mockRejectedValue(new Error('base indisponible'));
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(messageEnvoye()).not.toContain("Recommandation d'exploration déterministe");
  });
});

describe('métadonnées d’audit', () => {
  it('persiste la version, le sha256 et les packs transmis', async () => {
    evaluerOrientationPourPatient.mockResolvedValue(ORIENTATION_ACTIVE);
    await POST(req());
    const meta = metadonneesPersistees();

    expect(meta.orientationInjectee).toBe(true);
    expect(meta.orientationSha256).toBe('abc123def456');
    expect(meta.orientationVersion).toBe('orientation-nnpp2-v1');
    expect(meta.orientationPacksTransmis).toEqual(['pack_sommeil_chronobiologie']);
  });

  it('n’inscrit pas de sha256 quand aucun bloc n’est parti, mais garde la version en vigueur', async () => {
    await POST(req());
    const meta = metadonneesPersistees();
    expect(meta.orientationInjectee).toBe(false);
    // Le sha256 signe un bloc transmis : sans bloc, il n'existe pas.
    expect(meta.orientationSha256).toBeNull();
    // La version, elle, dit quelle table était EN VIGUEUR — un fait distinct,
    // et le seul moyen de savoir plus tard sous quelle table on a rédigé.
    expect(meta.orientationVersion).toBe('orientation-nnpp2-v1');
  });

  // LE CAS DE LA TABLE DU 2026-08-06 (LOT-02, D-030) — et il fallait l'écrire,
  // parce qu'il ressemble à un bug sans en être un. Plus aucune règle publiée ne
  // cible un pack : l'orientation est ACTIVE, elle recommande, un bloc part au
  // modèle — et `orientationPacksTransmis` est pourtant VIDE. C'est l'allowlist
  // du garde de restitution : vide, elle interdit au modèle TOUTE mention de
  // pack, ce qui est exactement le comportement voulu. Un futur lecteur qui la
  // verrait vide pourrait conclure à une régression de la persistance ; ce banc
  // dit que non, et qu'un bloc est bien parti.
  it('un bloc PARTI sans aucune cible pack persiste une allowlist VIDE', async () => {
    evaluerOrientationPourPatient.mockResolvedValue({
      ...ORIENTATION_ACTIVE,
      recommandations: [
        {
          ...ORIENTATION_ACTIVE.recommandations[0],
          cible: { type: 'questionnaire' as const, questionnaireId: 'Q_SOM_01' },
          idPackBase: null,
        },
      ],
    });
    await POST(req());
    expect(messageEnvoye()).toContain("Recommandation d'exploration déterministe");
    const meta = metadonneesPersistees();
    // Le bloc est bien parti : `injectee` et le sha en témoignent.
    expect(meta.orientationInjectee).toBe(true);
    expect(meta.orientationSha256).toBe('abc123def456');
    // Et l'allowlist est vide — aucun pack n'a été proposé, aucun ne peut être cité.
    expect(meta.orientationPacksTransmis).toEqual([]);
  });

  it('n’inscrit rien non plus sur une table signée qui ne recommande rien', async () => {
    evaluerOrientationPourPatient.mockResolvedValue({ ...ORIENTATION_ACTIVE, recommandations: [] });
    await POST(req());
    const meta = metadonneesPersistees();
    expect(meta.orientationInjectee).toBe(false);
    expect(meta.orientationSha256).toBeNull();
  });
});

function codesJournalises(): string[] {
  return loggerWarn.mock.calls.map(appel => appel[0].event);
}

describe('garde de restitution', () => {
  it('ne journalise rien quand la synthèse restitue fidèlement', async () => {
    evaluerOrientationPourPatient.mockResolvedValue(ORIENTATION_ACTIVE);
    validateSyntheseSchema.mockReturnValue({
      points_de_vigilance: [],
      resume_praticien: 'Le pack Sommeil et chronobiologie est proposé par la table.',
    });

    await POST(req());

    expect(codesJournalises()).not.toContain('SYNTHESE_IA.ORIENTATION.RESTITUTION_INFIDELE');
  });

  it('journalise l’écart quand un pack non transmis est cité', async () => {
    evaluerOrientationPourPatient.mockResolvedValue(ORIENTATION_ACTIVE);
    validateSyntheseSchema.mockReturnValue({
      points_de_vigilance: [],
      resume_praticien: 'J’ajoute aussi le pack Stress chronique et burnout.',
    });

    await POST(req());

    const ecart = loggerWarn.mock.calls.find(
      appel => appel[0].event === 'SYNTHESE_IA.ORIENTATION.RESTITUTION_INFIDELE',
    );
    expect(ecart).toBeTruthy();
    expect(ecart?.[0].message).toContain('pack:pack_stress_chronique_burnout');
  });

  it('rend tout de même la synthèse : on journalise, on ne censure pas', async () => {
    evaluerOrientationPourPatient.mockResolvedValue(ORIENTATION_ACTIVE);
    validateSyntheseSchema.mockReturnValue({
      points_de_vigilance: [],
      resume_praticien: 'J’ajoute aussi le pack Stress chronique et burnout.',
    });

    const res = await POST(req());

    // L'objet actionnable — la carte et son bouton — vient de la route
    // déterministe, jamais d'ici : un pack cité à tort ne peut rien déclencher.
    expect(res.status).toBe(200);
    expect(prisma.syntheseIA.create).toHaveBeenCalledOnce();
    expect(metadonneesPersistees().orientationEcartsRestitution).toEqual([
      { type: 'pack', identifiant: 'pack_stress_chronique_burnout' },
    ]);
  });

  // Le défaut trouvé à la revue adversariale, et le chemin que la production
  // exécute réellement tant que la table n'est pas signée.
  it('NE TOURNE PAS quand aucun bloc n’a été injecté, même sur une prose évocatrice', async () => {
    // Orientation inactive : allowlist vide. Un garde qui tournerait quand même
    // comparerait cette phrase aux seize titres et accuserait une synthèse à
    // qui aucune recommandation n'a jamais été présentée.
    validateSyntheseSchema.mockReturnValue({
      points_de_vigilance: [],
      resume_praticien:
        "Prioriser l'axe digestif et intestin-cerveau ; un stress chronique et burnout débutant sont évoqués.",
    });

    await POST(req());

    expect(codesJournalises()).not.toContain('SYNTHESE_IA.ORIENTATION.RESTITUTION_INFIDELE');
    expect(metadonneesPersistees().orientationEcartsRestitution).toEqual([]);
  });

  it('ne tourne pas non plus sur une table signée sans recommandation', async () => {
    evaluerOrientationPourPatient.mockResolvedValue({ ...ORIENTATION_ACTIVE, recommandations: [] });
    validateSyntheseSchema.mockReturnValue({
      points_de_vigilance: [],
      resume_praticien: 'Je propose le pack Stress chronique et burnout.',
    });

    await POST(req());

    expect(codesJournalises()).not.toContain('SYNTHESE_IA.ORIENTATION.RESTITUTION_INFIDELE');
  });

  it('ne signale pas les questionnaires du dossier, qui sont au prompt', async () => {
    evaluerOrientationPourPatient.mockResolvedValue(ORIENTATION_ACTIVE);
    validateSyntheseSchema.mockReturnValue({
      points_de_vigilance: [],
      // Q_ALI_02 est la fixture du dossier : le citer est le travail du modèle.
      resume_praticien: 'Le Q_ALI_02 montre une exposition faible aux légumineuses.',
    });

    await POST(req());

    expect(codesJournalises()).not.toContain('SYNTHESE_IA.ORIENTATION.RESTITUTION_INFIDELE');
  });

  it('ne signale pas un identifiant que la consigne système lui a mis en bouche', async () => {
    evaluerOrientationPourPatient.mockResolvedValue(ORIENTATION_ACTIVE);
    validateSyntheseSchema.mockReturnValue({
      points_de_vigilance: [],
      // `Q_ALI_03` est cité en exemple par SYSTEM_PROMPT_GOUVERNANCE et absent
      // du dossier : le reprocher au modèle serait l'accuser d'avoir inventé ce
      // qu'on lui a soufflé.
      limites: 'La grille d’estimation des apports (Q_ALI_03) n’a pas été renseignée.',
    });

    await POST(req());

    expect(codesJournalises()).not.toContain('SYNTHESE_IA.ORIENTATION.RESTITUTION_INFIDELE');
  });

  it('signale en revanche un questionnaire absent du dossier et de la recommandation', async () => {
    evaluerOrientationPourPatient.mockResolvedValue(ORIENTATION_ACTIVE);
    validateSyntheseSchema.mockReturnValue({
      points_de_vigilance: [],
      resume_praticien: 'Faire passer Q_NEU_11 en complément.',
    });

    await POST(req());

    const ecart = loggerWarn.mock.calls.find(
      appel => appel[0].event === 'SYNTHESE_IA.ORIENTATION.RESTITUTION_INFIDELE',
    );
    expect(ecart?.[0].message).toContain('questionnaire:Q_NEU_11');
  });
});

describe('transport SSE (WN_SYNTHESE_STREAM)', () => {
  it('transmet le même bloc d’orientation que le transport JSON', async () => {
    process.env.WN_SYNTHESE_STREAM = 'true';
    evaluerOrientationPourPatient.mockResolvedValue(ORIENTATION_ACTIVE);

    const res = await POST(req());
    // Le corps est un flux : on n'assert pas dessus, mais l'appel modèle a bien
    // eu lieu avec le même message — les deux transports partagent `genererArgs`.
    await res.text();

    expect(messageEnvoye()).toContain("## Recommandation d'exploration déterministe");
    expect(messageEnvoye()).toContain('SHA-256: abc123def456');
  });

  it('applique la même allowlist qu’en JSON — vérifié par exécution', async () => {
    process.env.WN_SYNTHESE_STREAM = 'true';
    evaluerOrientationPourPatient.mockResolvedValue(ORIENTATION_ACTIVE);
    validateSyntheseSchema.mockReturnValue({
      points_de_vigilance: [],
      // Q_ALI_02 est au dossier, Q_NEU_11 ne l'est nulle part.
      resume_praticien: 'Le Q_ALI_02 est lu ; faire passer Q_NEU_11.',
    });

    const res = await POST(req());
    await res.text();

    expect(metadonneesPersistees().orientationEcartsRestitution).toEqual([
      { type: 'questionnaire', identifiant: 'Q_NEU_11' },
    ]);
  });
});

describe('cohérence du prédicat d’injection', () => {
  // Le défaut B1 était une divergence entre « un bloc est-il parti ? » et
  // « le garde doit-il tourner ? ». Les deux dérivent maintenant du même
  // prédicat ; ce banc structurel échoue si l'un des deux s'en détache.
  it('le garde et le builder consultent le même prédicat', () => {
    const source = readFileSync(join(__dirname, 'route.ts'), 'utf8');
    const occurrences = source.match(/orientationInjectee\(/g) ?? [];
    // Une définition, plus les appels : garde, métadonnée, version.
    expect(occurrences.length).toBeGreaterThanOrEqual(3);
    // `buildBlocOrientation` doit rendre '' sur exactement la négation du
    // prédicat — même conditions, même ordre.
    expect(source).toContain(
      "if (!orientation || !orientation.actif || orientation.recommandations.length === 0) return '';",
    );
    expect(source).toContain(
      "return orientation?.actif === true && orientation.recommandations.length > 0;",
    );
  });
});
