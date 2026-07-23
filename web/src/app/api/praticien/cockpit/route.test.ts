import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma, writes } = vi.hoisted(() => {
  const writes = {
    patientUpdate: vi.fn(),
    responseCreate: vi.fn(),
    consultationUpdate: vi.fn(),
  };
  return {
    getServerSession: vi.fn(),
    writes,
    prisma: {
      patient: { findUnique: vi.fn(), findFirst: vi.fn(), update: writes.patientUpdate },
      questionnaireReponse: { findMany: vi.fn(), create: writes.responseCreate },
      consultation: { findFirst: vi.fn(), update: writes.consultationUpdate },
      // Lu uniquement en lecture d'un état passé (SP-TT).
      assessmentEpisode: { findMany: vi.fn() },
      // Journal des accès (G-TRUST-04) : écriture d'audit, pas clinique.
      journalAccesDossier: { create: vi.fn(), deleteMany: vi.fn() },
    },
  };
});

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { GET, POST } from './route';

const patient = { idPatient: 'PAT_TEST', createdAt: new Date('2026-01-01T00:00:00.000Z') };
const rawAnswers = { P1: '2', P2: '2', P3: '1', P4: '1', P5: '1', P6: '1', P7: '1', P8: '1' };
const responses = [
  {
    idReponse: 'REP_T0', idQuestionnaire: 'Q_SOM_06',
    dateReponse: new Date('2026-01-01T00:00:00.000Z'), scoresJson: { rawAnswers },
  },
  {
    idReponse: 'REP_J21', idQuestionnaire: 'Q_SOM_06',
    dateReponse: new Date('2026-01-22T00:00:00.000Z'), scoresJson: { rawAnswers },
  },
];

function getRequest(query = 'idPatient=PAT_TEST'): Request {
  return new Request(`http://localhost/api/praticien/cockpit?${query}`);
}

function postRequest(body: unknown): Request {
  return new Request('http://localhost/api/praticien/cockpit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function proposal(milestone: 'T0' | 'J21' = 'T0') {
  const response = await GET(getRequest(`idPatient=PAT_TEST&milestone=${milestone}`));
  return response.json() as Promise<{ proposalHash: string; proposal: { inWindowResponseIds: string[] } }>;
}

describe('/api/praticien/cockpit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.patient.findFirst.mockResolvedValue(patient);
    prisma.questionnaireReponse.findMany.mockResolvedValue(responses);
    prisma.consultation.findFirst.mockResolvedValue({
      anamnese: { motif_principal: 'Fatigue', objectif_prioritaire: 'Énergie', attentes: ['Comprendre'] },
    });
  });

  it('exige une session et valide patient et jalon', async () => {
    getServerSession.mockResolvedValueOnce(null);
    expect((await GET(getRequest())).status).toBe(401);
    expect((await GET(getRequest('idPatient=&milestone=T0'))).status).toBe(400);
    expect((await GET(getRequest('idPatient=PAT_TEST&milestone=J7'))).status).toBe(400);
  });

  it('répond 404 pour un patient absent sans charger ses données liées', async () => {
    prisma.patient.findFirst.mockResolvedValueOnce(null);
    const response = await GET(getRequest());
    expect(response.status).toBe(404);
    expect(prisma.questionnaireReponse.findMany).not.toHaveBeenCalled();
    expect(prisma.consultation.findFirst).not.toHaveBeenCalled();
    // Un refus ne se journalise jamais : la ligne nommerait un dossier non lu.
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });

  it('GET accessible journalise la lecture au gabarit littéral (G-TRUST-04)', async () => {
    await GET(getRequest());
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledTimes(1);
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledWith({
      data: {
        idPatient: 'PAT_TEST',
        praticienEmail: 'praticien@wellneuro.fr',
        route: '/api/praticien/cockpit',
        methode: 'GET',
      },
    });
  });

  it('propose T0 par défaut et J21 sur demande avec réponses dans et hors fenêtre', async () => {
    const t0Response = await GET(getRequest());
    const t0 = await t0Response.json();
    expect(t0Response.status).toBe(200);
    expect(t0).toMatchObject({
      status: 'proposal_required',
      proposal: { milestone: 'T0', inWindowResponseIds: ['REP_T0'], outOfWindowResponseIds: ['REP_J21'] },
    });
    expect(t0.proposalHash).toHaveLength(64);

    const j21 = await proposal('J21');
    expect(j21.proposal.inWindowResponseIds).toEqual(['REP_J21']);
  });

  it('autorise une proposition vide', async () => {
    prisma.questionnaireReponse.findMany.mockResolvedValueOnce([]);
    const response = await GET(getRequest());
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.proposal.candidateResponses).toEqual([]);
    expect(payload.proposal.sourceDateRange).toBeNull();
  });

  it('confirme explicitement puis construit une chaîne prudente et versionnée', async () => {
    const proposed = await proposal();
    const response = await POST(postRequest({
      idPatient: 'PAT_TEST', milestone: 'T0',
      includedResponseIds: proposed.proposal.inWindowResponseIds,
      proposalHash: proposed.proposalHash,
    }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.status).toBe('ready');
    expect(payload.snapshot.patientContext).toMatchObject({ mainReason: 'Fatigue', priorityGoal: 'Énergie' });
    expect(payload.snapshot.versions.snapshotSchema).toBe('c1-clinical-snapshot-v1');
    expect(payload.snapshot.versions.questionnaireScoring[0].version).toBeNull();
    expect(payload.review.abstention.status).toBe('not_evaluated');
    expect(payload.decisionCard).toMatchObject({
      priorityCandidates: [], proposedMainPriorityId: null, selectedMainPriority: null,
      abstention: { status: 'not_evaluated' },
    });
    expect(payload.decisionCard.limitations).toContain(
      'Aucune priorité ne peut être proposée avant une évaluation explicite de l’abstention et la revue des bloqueurs.'
    );
  });

  it('accepte une correction explicite hors fenêtre et refuse un identifiant inconnu', async () => {
    const proposed = await proposal();
    const corrected = await POST(postRequest({
      idPatient: 'PAT_TEST', milestone: 'T0', includedResponseIds: ['REP_J21'], proposalHash: proposed.proposalHash,
    }));
    expect(corrected.status).toBe(200);
    expect((await corrected.json()).snapshot.assessmentEpisode.includedResponseIds).toEqual(['REP_J21']);

    const unknown = await POST(postRequest({
      idPatient: 'PAT_TEST', milestone: 'T0', includedResponseIds: ['REP_INCONNUE'], proposalHash: proposed.proposalHash,
    }));
    expect(unknown.status).toBe(400);
    expect(await unknown.json()).toMatchObject({ status: 'unavailable', reason: 'invalid_payload' });
  });

  it('refuse une proposition périmée et un payload invalide', async () => {
    const stale = await POST(postRequest({
      idPatient: 'PAT_TEST', milestone: 'T0', includedResponseIds: [], proposalHash: 'hash-obsolete',
    }));
    expect(stale.status).toBe(409);
    expect(await stale.json()).toMatchObject({ status: 'unavailable', reason: 'proposal_stale' });

    const invalid = await POST(postRequest({
      idPatient: 'PAT_TEST', milestone: 'J7', includedResponseIds: [], proposalHash: 'x',
    }));
    expect(invalid.status).toBe(400);
  });

  it('invalide la proposition si le contenu clinique change à identifiants constants', async () => {
    const proposed = await proposal();
    prisma.questionnaireReponse.findMany.mockResolvedValueOnce([
      { ...responses[0], scoresJson: { rawAnswers: { ...rawAnswers, P1: '3' } } },
      responses[1],
    ]);
    const responseChanged = await POST(postRequest({
      idPatient: 'PAT_TEST', milestone: 'T0', includedResponseIds: ['REP_T0'], proposalHash: proposed.proposalHash,
    }));
    expect(responseChanged.status).toBe(409);

    const proposedAgain = await proposal();
    prisma.consultation.findFirst.mockResolvedValueOnce({
      anamnese: { motif_principal: 'Motif corrigé', objectif_prioritaire: 'Énergie', attentes: ['Comprendre'] },
    });
    const contextChanged = await POST(postRequest({
      idPatient: 'PAT_TEST', milestone: 'T0', includedResponseIds: ['REP_T0'], proposalHash: proposedAgain.proposalHash,
    }));
    expect(contextChanged.status).toBe(409);
  });

  it('ne déclenche aucune écriture Prisma clinique', async () => {
    // Le journal des accès (G-TRUST-04) écrit sur le GET — écriture d'audit,
    // hors périmètre de cette assertion qui protège l'état clinique.
    await GET(getRequest());
    const proposed = await proposal();
    await POST(postRequest({
      idPatient: 'PAT_TEST', milestone: 'T0', includedResponseIds: ['REP_T0'], proposalHash: proposed.proposalHash,
    }));
    expect(writes.patientUpdate).not.toHaveBeenCalled();
    expect(writes.responseCreate).not.toHaveBeenCalled();
    expect(writes.consultationUpdate).not.toHaveBeenCalled();
  });

  it('le POST (confirmation) ne journalise pas — sa trace datée existe déjà (GD-1)', async () => {
    const proposed = await proposal();
    prisma.journalAccesDossier.create.mockClear();
    await POST(postRequest({
      idPatient: 'PAT_TEST', milestone: 'T0', includedResponseIds: ['REP_T0'], proposalHash: proposed.proposalHash,
    }));
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });
});

describe('/api/praticien/cockpit — lecture d’un état passé (SP-TT)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.patient.findFirst.mockResolvedValue(patient);
    prisma.questionnaireReponse.findMany.mockResolvedValue(responses);
    prisma.consultation.findFirst.mockResolvedValue({ anamnese: {} });
    prisma.assessmentEpisode.findMany.mockResolvedValue([]);
  });

  it('sans `asOf`, rien ne change : la lecture reste au présent', async () => {
    const res = await GET(getRequest('idPatient=PAT_TEST'));
    const payload = await res.json();
    expect(res.status).toBe(200);
    expect(payload.asOf ?? null).toBeNull();
    // Les épisodes ne sont même pas lus tant qu'aucune date n'est demandée.
    expect(prisma.assessmentEpisode.findMany).not.toHaveBeenCalled();
    expect(payload.proposal.candidateResponses).toHaveLength(2);
  });

  it('à un repère connu, aucune donnée postérieure ne subsiste', async () => {
    const res = await GET(getRequest('idPatient=PAT_TEST&asOf=2026-01-01T00:00:00.000Z'));
    const payload = await res.json();
    expect(res.status).toBe(200);
    expect(payload.asOf).toBe('2026-01-01T00:00:00.000Z');
    // La réponse du 22/01 n'existait pas le 01/01 : elle ne doit pas apparaître.
    expect(payload.proposal.candidateResponses).toHaveLength(1);
  });

  it('une date arbitraire est refusée, jamais ramenée au présent en silence', async () => {
    const res = await GET(getRequest('idPatient=PAT_TEST&asOf=2026-01-15T00:00:00.000Z'));
    expect(res.status).toBe(400);
    expect((await res.json()).reason).toBe('invalid_payload');
    // Le dossier a été résolu et ses données lues avant le refus de date :
    // la lecture est journalisée (même principe que le 422 de booklet).
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledTimes(1);
  });

  it('une date illisible est refusée', async () => {
    const res = await GET(getRequest('idPatient=PAT_TEST&asOf=hier'));
    expect(res.status).toBe(400);
  });

  it('aucune écriture n’est possible en mode passé', async () => {
    const res = await POST(
      new Request('http://localhost/api/praticien/cockpit?asOf=2026-01-01T00:00:00.000Z', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idPatient: 'PAT_TEST', milestone: 'T0' }),
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/état passé/);
    // Le refus intervient AVANT toute lecture, donc avant toute écriture.
    expect(prisma.patient.findFirst).not.toHaveBeenCalled();
  });
});
