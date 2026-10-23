import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma, reconstructProtocolDraft, resolvePatientFoodCompassView, rejouerCarteDecision } = vi.hoisted(() => ({
  prisma: {
    assignation: { findFirst: vi.fn(), findUnique: vi.fn() },
    patient: { findUnique: vi.fn() },
    protocolDiffusionApproval: { findMany: vi.fn() },
    protocolDraft: { findUnique: vi.fn(), findMany: vi.fn() },
    portailLecturePatient: { findUnique: vi.fn() },
  },
  reconstructProtocolDraft: vi.fn(),
  resolvePatientFoodCompassView: vi.fn(),
  rejouerCarteDecision: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({ prisma }));

// Le calendrier du cycle ([[D-255]]) : par défaut, le jour 0 est l'approbation
// active et sa seule version — le cas d'un cycle diffusé une fois. Les cas
// d'une rediffusion le règlent eux-mêmes.
const { calendrierDuProtocoleDiffuse } = vi.hoisted(() => ({
  calendrierDuProtocoleDiffuse: vi.fn(
    async (_idPatient: string, diffuse: { approvedAt: Date; protocolDraftId: string }) => ({
      jourZero: diffuse.approvedAt,
      versionIds: [diffuse.protocolDraftId],
    }),
  ),
}));
vi.mock('@/lib/protocol/calendriersPersistes', () => ({ calendrierDuProtocoleDiffuse }));
vi.mock('@/lib/protocol/fromPrisma', () => ({
  reconstructProtocolDraft,
  ProtocolPayloadIntegrityError: class ProtocolPayloadIntegrityError extends Error {},
}));
vi.mock('@/lib/food-compass/patientReference', () => ({ resolvePatientFoodCompassView }));
// SEUL LE REJEU EST SIMULÉ — il lit la base. `buildPatientProtocolView`, lui,
// TOURNE POUR DE VRAI dans ces bancs : c'est lui le producteur de la vue depuis
// [[D-191]], et le simuler laisserait la route « verte » quelle que soit la
// projection servie.
vi.mock('@/lib/clinical-engine/rejeuCarteDecision', () => ({ rejouerCarteDecision }));
// LES PAUSES ([[D-281]] §2) : la vraie lecture, verrou compris, sauf quand un
// cas pose les siennes — le calcul a son banc (`pauseEffetIndesirable.test.ts`).
const { pausesPosees } = vi.hoisted(() => ({ pausesPosees: { valeur: null as { actionId: string; texte: string }[] | null } }));
vi.mock('@/lib/trust/pauseEffetIndesirableServeur', async orig => {
  const original = await orig<typeof import('@/lib/trust/pauseEffetIndesirableServeur')>();
  return {
    ...original,
    pausesServies: (...args: Parameters<typeof original.pausesServies>) =>
      (pausesPosees.valeur ? Promise.resolve(pausesPosees.valeur) : original.pausesServies(...args)),
  };
});

import { signPatientSession } from '@/lib/patient-session';
import { GET } from './route';

const assignation = { idAssignation: 'ASS_1', idPatient: 'PAT_PROPRIO', emailPatient: 'proprio@example.test' };

function proprioCookie(): string {
  return signPatientSession({ idPatient: assignation.idPatient, email: assignation.emailPatient });
}
function mockOwnerAuth(): void {
  prisma.assignation.findFirst.mockResolvedValue(assignation);
  // Ancre du bilan de calibrage : servie tant qu'aucun protocole n'est diffusé.
  prisma.assignation.findUnique.mockResolvedValue({ dateAssignation: new Date('2026-07-20T00:00:00Z') });
  prisma.patient.findUnique.mockResolvedValue({ idPatient: assignation.idPatient, actif: true, accessTokenRevoked: false, email: assignation.emailPatient });
}
function request(cookie?: string): Request {
  return new Request('http://localhost/api/portail/protocole', {
    headers: cookie ? { cookie: `wn_portail=${encodeURIComponent(cookie)}` } : {},
  });
}

// Hash d'ancrage de longueur réelle : une fixture d'un caractère laissait
// passer toute valeur de LONGUEUR_CYCLE_REF, troncature comprise.
const HASH_COMPLET = 'a1b2c3d4e5f60718293a4b5c6d7e8f901a2b3c4d5e6f708192a3b4c5d6e7f801';

// Empreintes de la chaîne : le contrat exige qu'elles se recoupent entre la
// carte, le brouillon et l'approbation. Les nommer ici rend le recoupement
// LISIBLE — une fixture aux trois valeurs identiques cacherait une comparaison
// qui ne compare rien.
const EMPREINTE_CARTE = 'decision-hash';
const ID_CARTE = 'runtime-decision-PAT_PROPRIO-T0';
const ID_PRIORITE = 'priority:sommeil-fragmente';
const LIBELLE_AXE = 'Sommeil fragmenté, réveils nocturnes';

// LE LIBELLÉ D'AXE VIENT DE LA CARTE, et la carte le tient du registre SIGNÉ des
// priorités (`candidate.label` = `regle.libelle`). Aucun texte n'est fabriqué
// sur le chemin patient.
const CARTE_REJOUEE = {
  decisionCardId: ID_CARTE,
  inputHash: EMPREINTE_CARTE,
  abstention: { status: 'not_required', ruleIds: [], limitations: [] },
  safetyFindingIds: [],
  selectedMainPriority: { candidateId: ID_PRIORITE, selectedBy: 'practitioner', selectedAt: '2026-07-01T08:00:00.000Z', rationale: 'INTERNE — motif praticien' },
  priorityCandidates: [{ candidateId: ID_PRIORITE, label: LIBELLE_AXE, rationale: 'INTERNE — rationale moteur' }],
};

// TROIS ACTIONS, dont une SUSPENDUE : le constructeur en fait saisir trois, et
// le portail n'en servait qu'une.
const draftDerive = {
  protocolDraftId: 'proto_DEC#h',
  inputHash: HASH_COMPLET,
  decisionCardId: ID_CARTE,
  decisionCardInputHash: EMPREINTE_CARTE,
  selectedPriorityId: ID_PRIORITE,
  status: 'practitioner_reviewed',
  review: { reviewedAt: '2026-07-01T09:00:00.000Z' },
  purpose: 'Stabiliser vos matins.',
  followUpCriterion: 'Réveils nocturnes < 2 par nuit à J21.',
  adviceSheetRef: 'Fiche sommeil',
  actions: [
    { actionId: 'a1', type: 'food', title: 'Petit-déjeuner protéiné', minimalPlan: 'Trois matins cette semaine', idealPlan: 'INTERNE', rescuePlan: 'INTERNE', limitations: ['INTERNE'], interventionStatus: 'active' },
    { actionId: 'a2', type: 'chronobiology', title: 'Avancer le coucher', minimalPlan: 'Vingt minutes plus tôt', idealPlan: 'INTERNE', rescuePlan: 'INTERNE', limitations: ['INTERNE'], interventionStatus: 'active' },
    { actionId: 'a3', type: 'supplement_exploration', title: 'Piste fer', minimalPlan: 'Rien à faire pour l’instant', idealPlan: 'INTERNE', rescuePlan: 'INTERNE', limitations: ['INTERNE'], interventionStatus: 'conditionnelle_biologie' },
  ],
};

/** L'approbation servie par la fixture, alignée sur le brouillon et la carte. */
function approbation(overrides: Record<string, unknown> = {}) {
  return {
    id: 'appr_1', protocolDraftId: 'proto_DEC#h', protocolDraftInputHash: HASH_COMPLET,
    decisionCardInputHash: EMPREINTE_CARTE, approvedBy: 'practitioner',
    confirmation: 'content_approved_for_diffusion', supersedesApprovalId: null,
    createdAt: new Date(), approvedAt: new Date(Date.now() - 7 * 24 * 3600 * 1000),
    ...overrides,
  };
}

function mockProtocoleDiffuse(): void {
  prisma.protocolDiffusionApproval.findMany.mockResolvedValue([approbation()]);
  prisma.protocolDraft.findUnique.mockResolvedValue({ payload: {}, inputHash: HASH_COMPLET, assessmentEpisodeId: 'runtime-episode-PAT_PROPRIO-T0', decisionCardId: ID_CARTE, decisionCardInputHash: EMPREINTE_CARTE, status: 'practitioner_reviewed', reviewedAt: new Date(0) });
  prisma.protocolDraft.findMany.mockResolvedValue([{ id: 'proto_DEC#h', inputHash: HASH_COMPLET, supersedesDraftId: null, createdAt: new Date() }]);
  reconstructProtocolDraft.mockReturnValue(draftDerive);
  rejouerCarteDecision.mockResolvedValue({ ok: true, decisionCard: CARTE_REJOUEE, selectionEcartee: false });
}

describe('GET /api/portail/protocole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    process.env.WN_C5_ENABLED = 'false';
  });

  it('refuse sans session portail (401)', async () => {
    const res = await GET(request());
    expect(res.status).toBe(401);
    expect(prisma.protocolDraft.findUnique).not.toHaveBeenCalled();
  });

  it('refuse l’accès inter-patient (404)', async () => {
    prisma.assignation.findFirst.mockResolvedValue(assignation);
    const cookie = signPatientSession({ idPatient: 'PAT_INTRUS', email: assignation.emailPatient });
    const res = await GET(request(cookie));
    expect(res.status).toBe(404);
  });

  it('renvoie protocoleDiffuse=false sans approbation active (200)', async () => {
    mockOwnerAuth();
    prisma.protocolDiffusionApproval.findMany.mockResolvedValue([]);
    const res = await GET(request(proprioCookie()));
    const json = (await res.json()) as { ok: boolean; protocoleDiffuse: boolean; vue: unknown };
    expect(res.status).toBe(200);
    expect(json.protocoleDiffuse).toBe(false);
    expect(json.vue).toBeNull();
    // Le carnet n'est pas muet avant le protocole : il reçoit l'ancre du bilan
    // de calibrage, ancrée sur l'assignation et non sur l'horloge.
    expect((json as unknown as { calibrage: { ancre: string; debut: string } }).calibrage)
      .toEqual({ ancre: 'ASS_1', debut: '2026-07-20' });
  });

  // LE BANC QUI FIGEAIT L'AMPUTATION, RETOURNÉ ([[D-191]]). Il asseyait
  // `actionPrincipale` par égalité EXACTE : deux actions sur trois pouvaient
  // disparaître sans qu'il bronche, puisque c'est précisément ce qu'il gardait.
  it('sert LES TROIS actions, le libellé d’axe et le critère J21 (200)', async () => {
    mockOwnerAuth();
    mockProtocoleDiffuse();

    const res = await GET(request(proprioCookie()));
    const json = (await res.json()) as {
      ok: boolean; protocoleDiffuse: boolean; finDeCycle: boolean; indisponible: boolean;
      vue: {
        priorityLabel: string; purpose: string; followUpCriterion: string;
        actions: { actionId: string; type: string; title: string; minimalPlan: string; attente?: string }[];
        cycleRef: string; debutCycle: string;
      };
    };
    expect(res.status).toBe(200);
    expect(json.protocoleDiffuse).toBe(true);
    expect(json.indisponible).toBe(false);
    // RÈGLE AMENDÉE NON SIGNÉE ([[D-281]] §6) : aucune pause servie. Le double
    // de Prisma n'a pas de table des signalements : une lecture aurait levé.
    expect((json as unknown as { pauses: unknown[] }).pauses).toEqual([]);
    expect(json.finDeCycle).toBe(false);

    expect(json.vue.actions).toHaveLength(3);
    expect(json.vue.actions.map(action => action.actionId)).toEqual(['a1', 'a2', 'a3']);
    expect(json.vue.actions[0]).toMatchObject({ type: 'food', title: 'Petit-déjeuner protéiné', minimalPlan: 'Trois matins cette semaine' });

    // Le libellé d'axe SIGNÉ, recopié de la carte rejouée — le patient ne savait
    // pas sur quoi on travaillait.
    expect(json.vue.priorityLabel).toBe(LIBELLE_AXE);
    // Servi dans le JSON depuis toujours, rendu par aucun écran jusqu'ici.
    expect(json.vue.followUpCriterion).toBe('Réveils nocturnes < 2 par nuit à J21.');
    expect(json.vue.purpose).toBe('Stabiliser vos matins.');

    // Référence de cycle du carnet alimentaire (lot 2, item 5) : opaque,
    // dérivée du hash d'ancrage, et bornée — jamais le hash entier.
    expect(json.vue.cycleRef).toBe(HASH_COMPLET.slice(0, 16));
    expect(json.vue.cycleRef).toHaveLength(16);
    expect(JSON.stringify(json)).not.toContain(HASH_COMPLET);
    expect(typeof json.vue.debutCycle).toBe('string');
    // Aucune fuite de champ interne — plans idéal et de secours, limitations
    // internes, motif praticien de sélection et rationale du moteur.
    expect(JSON.stringify(json)).not.toContain('INTERNE');
  });

  // UNE INTERVENTION NON FERME NE SE LIT JAMAIS COMME UN CONSEIL. La phrase vient
  // du contrat et jamais de la cible d'attente du praticien.
  it('accompagne une action suspendue de sa phrase d’attente, et elle seule', async () => {
    mockOwnerAuth();
    mockProtocoleDiffuse();

    const json = (await (await GET(request(proprioCookie()))).json()) as {
      vue: { actions: { actionId: string; interventionStatus?: string; attente?: string }[] };
    };
    const suspendue = json.vue.actions.find(action => action.actionId === 'a3')!;
    expect(suspendue.interventionStatus).toBe('conditionnelle_biologie');
    expect(suspendue.attente).toBe('En attente de confirmation par votre bilan.');
    // `ferritine` est le vocabulaire du praticien : la phrase ne le reprend pas.
    expect(json.vue.actions.filter(action => action.attente)).toHaveLength(1);
  });

  // L'IDENTITÉ INTERNE DU DOSSIER NE TRAVERSE PAS. Le contrat porte les
  // identifiants d'enveloppe et les trois empreintes ; la projection les écarte.
  it('n’envoie au navigateur patient aucun identifiant d’enveloppe ni empreinte', async () => {
    mockOwnerAuth();
    mockProtocoleDiffuse();

    const corps = JSON.stringify(await (await GET(request(proprioCookie()))).json());
    expect(corps).not.toContain(ID_CARTE);
    expect(corps).not.toContain(EMPREINTE_CARTE);
    expect(corps).not.toContain('proto_DEC#h');
    expect(corps).not.toContain('inputHash');
  });

  // LE CONSTAT DE FRAÎCHEUR. La carte est recomposée à chaque lecture : si son
  // empreinte n'est plus celle qu'a approuvée le praticien, rien n'est servi —
  // et l'écran le DIT, au lieu de laisser croire à une attente.
  it('refuse de servir une carte qui a dérivé, et l’annonce comme indisponible', async () => {
    mockOwnerAuth();
    mockProtocoleDiffuse();
    rejouerCarteDecision.mockResolvedValue({ ok: false, motif: 'carte_derivee' });

    const json = (await (await GET(request(proprioCookie()))).json()) as {
      ok: boolean; protocoleDiffuse: boolean; indisponible: boolean; vue: unknown; calibrage: unknown;
    };
    expect(json.ok).toBe(true);
    expect(json.protocoleDiffuse).toBe(true);
    expect(json.indisponible).toBe(true);
    expect(json.vue).toBeNull();
    // ET AUCUNE ANCRE DE CALIBRAGE. Le bilan de calibrage est l'épisode d'AVANT
    // le protocole : le rouvrir ici ferait reculer un patient qui a déjà le
    // sien, et lui ferait saisir des journées repères sous un épisode que son
    // praticien ne relira jamais.
    expect(json.calibrage).toBeNull();
  });

  // LE CONTRAT REFUSE UN STATUT QU'IL NE SAIT PAS DIRE. Servir l'action sans sa
  // phrase d'attente ferait lire un conseil ferme là où le praticien a posé une
  // réserve : le refus est le bon comportement, et il ne doit pas passer pour un
  // 500.
  it('refuse un statut d’intervention inconnu plutôt que de le servir en silence', async () => {
    mockOwnerAuth();
    mockProtocoleDiffuse();
    reconstructProtocolDraft.mockReturnValue({
      ...draftDerive,
      actions: [{ ...draftDerive.actions[0], interventionStatus: 'statut_futur_inconnu' }],
    });

    const res = await GET(request(proprioCookie()));
    const json = (await res.json()) as { ok: boolean; indisponible: boolean; vue: unknown };
    expect(res.status).toBe(200);
    expect(json.indisponible).toBe(true);
    expect(json.vue).toBeNull();
  });

  it('marque finDeCycle au-delà de J21+tolérance', async () => {
    mockOwnerAuth();
    mockProtocoleDiffuse();
    prisma.protocolDiffusionApproval.findMany.mockResolvedValue([
      approbation({ approvedAt: new Date(Date.now() - 30 * 24 * 3600 * 1000) }),
    ]);

    const res = await GET(request(proprioCookie()));
    const json = (await res.json()) as { finDeCycle: boolean };
    expect(json.finDeCycle).toBe(true);
  });

  it('compte la fin et le début du cycle depuis son jour 0, pas depuis la dernière rediffusion (D-255)', async () => {
    mockOwnerAuth();
    mockProtocoleDiffuse();
    // L'approbation active a 7 jours ; la première diffusion du cycle, 30.
    const jourZero = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    calendrierDuProtocoleDiffuse.mockResolvedValueOnce({ jourZero, versionIds: ['proto_DEC#h'] });

    const res = await GET(request(proprioCookie()));
    const json = (await res.json()) as { finDeCycle: boolean; vue: { debutCycle: string } };
    expect(json.finDeCycle).toBe(true);
    expect(json.vue.debutCycle).toBe(jourZero.toISOString());
    expect(calendrierDuProtocoleDiffuse).toHaveBeenCalledWith(
      'PAT_PROPRIO',
      expect.objectContaining({ approbationId: 'appr_1', protocolDraftId: 'proto_DEC#h' }),
    );
  });

  it('ajoute uniquement le résumé Boussole patient-safe du protocole approuvé', async () => {
    process.env.WN_C5_ENABLED = 'true';
    mockOwnerAuth();
    mockProtocoleDiffuse();
    prisma.protocolDiffusionApproval.findMany.mockResolvedValue([approbation({ approvedAt: new Date() })]);
    const foodCompassRef = { foodRef: 'ciqual-2025-v1:26034', refHash: 'ref-hash' };
    reconstructProtocolDraft.mockReturnValue({
      ...draftDerive,
      actions: [
        { ...draftDerive.actions[0], foodCompassRef },
        { ...draftDerive.actions[0], actionId: 'a2', foodCompassRef },
      ],
    });
    const safe = {
      foodRef: '26034', foodLabel: 'Sardine', qualitativeSummary: 'Lecture qualitative.',
      reasons: ['Raison qualitative.'], sourceLabel: 'Table Ciqual, Anses',
      limitations: ['Limite qualitative.'], alternative: null,
    };
    resolvePatientFoodCompassView.mockResolvedValue(safe);
    const response = await GET(request(proprioCookie()));
    const payload = await response.json();
    expect(payload.vue.boussoles).toEqual([safe]);
    expect(resolvePatientFoodCompassView).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(payload.vue.boussoles)).not.toMatch(/score|inputHash|refHash|%/i);
    // Règle amendée non signée : aucune lecture marquée.
    expect(payload.boussolesEnPause).toEqual([]);
  });

  // EN PAUSE, JAMAIS MASQUÉE ([[D-281]] §2, arbitrage du 2026-10-16) : la
  // lecture reste dans la vue, et sa marque arrive hors de la vue signée.
  it('marque la lecture Boussole dont l’aliment est porté par un élément en pause', async () => {
    process.env.WN_C5_ENABLED = 'true';
    mockOwnerAuth();
    mockProtocoleDiffuse();
    prisma.protocolDiffusionApproval.findMany.mockResolvedValue([approbation({ approvedAt: new Date() })]);
    const foodCompassRef = { foodRef: 'ciqual-2025-v1:26034', refHash: 'ref-hash' };
    reconstructProtocolDraft.mockReturnValue({
      ...draftDerive,
      actions: [{ ...draftDerive.actions[0], foodCompassRef }, ...draftDerive.actions.slice(1)],
    });
    const safe = {
      foodRef: '26034', foodLabel: 'Sardine', qualitativeSummary: 'Lecture qualitative.',
      reasons: ['Raison qualitative.'], sourceLabel: 'Table Ciqual, Anses',
      limitations: ['Limite qualitative.'], alternative: null,
    };
    resolvePatientFoodCompassView.mockResolvedValue(safe);
    pausesPosees.valeur = [{ actionId: draftDerive.actions[0].actionId, texte: 'element' }];
    try {
      const payload = await (await GET(request(proprioCookie()))).json();
      expect(payload.vue.boussoles).toEqual([safe]);
      expect(payload.boussolesEnPause).toEqual([{ foodRef: '26034', texte: 'element' }]);
    } finally {
      pausesPosees.valeur = null;
    }
  });

  it('masque un protocole approuvé devenu caduc', async () => {
    mockOwnerAuth();
    mockProtocoleDiffuse();
    prisma.protocolDraft.findMany.mockResolvedValue([
      { id: 'proto_DEC#h2', inputHash: 'h2', supersedesDraftId: 'proto_DEC#h', createdAt: new Date() },
      { id: 'proto_DEC#h', inputHash: HASH_COMPLET, supersedesDraftId: null, createdAt: new Date(0) },
    ]);
    const res = await GET(request(proprioCookie()));
    expect(await res.json()).toMatchObject({ ok: true, protocoleDiffuse: false, vue: null });
  });

  // LE JOURNAL DE LECTURE DU PROTOCOLE ([[D-315]], CC-8).
  describe('lectureDuDetail', () => {
    afterEach(() => {
      delete process.env.WN_PORTAIL_LECTURE_PROTOCOLE;
    });

    it('drapeau fermé : absente, et la trace n’est même pas lue', async () => {
      mockOwnerAuth();
      mockProtocoleDiffuse();
      const json = await (await GET(request(proprioCookie()))).json();
      expect(json.vue).not.toBeNull();
      expect(json).not.toHaveProperty('lectureDuDetail');
      expect(prisma.portailLecturePatient.findUnique).not.toHaveBeenCalled();
    });

    it.each([
      ['jamais ouverte', null, false],
      ['déjà ouverte', { idObjet: 'appr_1' }, true],
    ])('drapeau ouvert, diffusion %s : dejaOuvert = %s, lu sur LA diffusion en vigueur', async (_cas, ligne, attendu) => {
      process.env.WN_PORTAIL_LECTURE_PROTOCOLE = 'true';
      mockOwnerAuth();
      mockProtocoleDiffuse();
      prisma.portailLecturePatient.findUnique.mockResolvedValue(ligne);
      const json = await (await GET(request(proprioCookie()))).json();
      expect(json.lectureDuDetail).toEqual({ dejaOuvert: attendu });
      expect(prisma.portailLecturePatient.findUnique).toHaveBeenCalledWith({
        where: { idPatient_espece_idObjet: { idPatient: assignation.idPatient, espece: 'protocole', idObjet: 'appr_1' } },
        select: { idObjet: true },
      });
    });

    it('une trace illisible ne prive pas le patient de son protocole : servi, replié', async () => {
      process.env.WN_PORTAIL_LECTURE_PROTOCOLE = 'true';
      mockOwnerAuth();
      mockProtocoleDiffuse();
      prisma.portailLecturePatient.findUnique.mockRejectedValue(new Error('panne'));
      const res = await GET(request(proprioCookie()));
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.vue).not.toBeNull();
      expect(json.lectureDuDetail).toEqual({ dejaOuvert: false });
    });

    it('sans protocole servi, rien n’est lu ni annoncé', async () => {
      process.env.WN_PORTAIL_LECTURE_PROTOCOLE = 'true';
      mockOwnerAuth();
      prisma.protocolDiffusionApproval.findMany.mockResolvedValue([]);
      const json = await (await GET(request(proprioCookie()))).json();
      expect(json).not.toHaveProperty('lectureDuDetail');
      expect(prisma.portailLecturePatient.findUnique).not.toHaveBeenCalled();
    });
  });

  // L'ENCART « QUAND RALENTIR OU DEMANDER AVIS » ([[D-348]], lettre bd).
  describe('encartConduite', () => {
    afterEach(() => {
      delete process.env.WN_PORTAIL_ENCART_CONDUITE;
    });

    it('drapeau fermé : absent, le protocole servi comme avant', async () => {
      mockOwnerAuth();
      mockProtocoleDiffuse();
      const json = await (await GET(request(proprioCookie()))).json();
      expect(json.vue).not.toBeNull();
      expect(json).not.toHaveProperty('encartConduite');
    });

    it.each(['1', 'TRUE', 'oui'])('valeur « %s » : fermé (seule la chaîne exacte « true » ouvre)', async (valeur) => {
      process.env.WN_PORTAIL_ENCART_CONDUITE = valeur;
      mockOwnerAuth();
      mockProtocoleDiffuse();
      const json = await (await GET(request(proprioCookie()))).json();
      expect(json).not.toHaveProperty('encartConduite');
    });

    it('drapeau ouvert, vue servie : annoncé', async () => {
      process.env.WN_PORTAIL_ENCART_CONDUITE = 'true';
      mockOwnerAuth();
      mockProtocoleDiffuse();
      const json = await (await GET(request(proprioCookie()))).json();
      expect(json.vue).not.toBeNull();
      expect(json.encartConduite).toBe(true);
    });

    it('drapeau ouvert, sans protocole servi : rien n’est annoncé', async () => {
      process.env.WN_PORTAIL_ENCART_CONDUITE = 'true';
      mockOwnerAuth();
      prisma.protocolDiffusionApproval.findMany.mockResolvedValue([]);
      const json = await (await GET(request(proprioCookie()))).json();
      expect(json.vue).toBeNull();
      expect(json).not.toHaveProperty('encartConduite');
    });
  });
});
