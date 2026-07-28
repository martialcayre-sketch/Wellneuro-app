import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma, listSnapshots, saveSnapshot, readPatientSession, isSessionValideForPatient, resolveProtocoleDiffuse } = vi.hoisted(() => ({
  prisma: {
    patient: { findUnique: vi.fn() },
  },
  listSnapshots: vi.fn(),
  saveSnapshot: vi.fn(),
  readPatientSession: vi.fn(),
  isSessionValideForPatient: vi.fn(),
  resolveProtocoleDiffuse: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/food-observation/persistence', () => ({
  listJaObservationSnapshots: listSnapshots,
  saveJaObservationSnapshot: saveSnapshot,
}));
vi.mock('@/lib/patient-session', () => ({
  readPatientSession,
  isSessionValideForPatient,
}));
vi.mock('@/lib/protocol/portailProtocol', () => ({ resolveProtocoleDiffuse }));

import { GET, POST } from './route';

const payload = {
  episode: {
    episodeId: 'ja_PAT_TEST_abcdef0123456789',
    patientId: 'PAT_TEST',
    startDate: '2026-07-17',
    endDate: '2026-07-24',
    statut: 'actif',
    content: {
      regime: 'essai',
      hypothese: 'Hypothèse',
      action: {
        actionId: 'action_1',
        labelPatient: 'Action test',
        idealPlan: 'Plan idéal',
        simplePlan: 'Plan simple',
      },
    },
    budget: { tracesParSemaine: 3 },
    schemaVersion: 'ja-domaine-v1',
    frictionsVersion: 'frictions-v1',
  },
  traces: [],
  pauses: [],
  plans: [],
  solutions: [],
  actionCareer: [],
};

describe('api/portail/ja/observations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readPatientSession.mockReturnValue({ idPatient: 'PAT_TEST', email: 'sophie.nicola@example.test' });
    prisma.patient.findUnique.mockResolvedValue({
      actif: true,
      accessToken: 'TOK_TEST',
      accessTokenRevoked: false,
      email: 'sophie.nicola@example.test',
    });
    isSessionValideForPatient.mockReturnValue(true);
    resolveProtocoleDiffuse.mockResolvedValue({
      protocolDraftId: 'PD_1',
      protocolDraftInputHash: 'abcdef0123456789ZZZZ',
      approvedAt: new Date('2026-07-20T08:00:00.000Z'),
    });
  });

  it('GET refuse sans session portail', async () => {
    readPatientSession.mockReturnValue(null);
    const res = await GET(new Request('http://localhost/api/portail/ja/observations'));
    expect(res.status).toBe(401);
  });

  it('GET liste les snapshots JA du patient connecté', async () => {
    listSnapshots.mockResolvedValue([{ draftId: 'JA_DRAFT_1' }]);
    const res = await GET(new Request('http://localhost/api/portail/ja/observations'));
    const json = (await res.json()) as { ok: boolean; snapshots: Array<{ draftId: string }> };

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.snapshots[0].draftId).toBe('JA_DRAFT_1');
  });

  it('POST persiste un snapshot JA pour la session portail valide', async () => {
    saveSnapshot.mockResolvedValue({ draftId: 'JA_DRAFT_2' });
    const res = await POST(
      new Request('http://localhost/api/portail/ja/observations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    );
    const json = (await res.json()) as { ok: boolean; snapshot: { draftId: string } };

    expect(res.status).toBe(201);
    expect(json.ok).toBe(true);
    expect(json.snapshot.draftId).toBe('JA_DRAFT_2');
    expect(saveSnapshot).toHaveBeenCalled();
  });

  // Le client patient chaîne ses transmissions ; la route doit passer la tête
  // de chaîne au domaine, et l'`idPatient` doit venir de la session, jamais du
  // corps de requête.
  it('POST transmet supersedesDraftId et impose l’idPatient de la session', async () => {
    saveSnapshot.mockResolvedValue({ draftId: 'JA_DRAFT_3' });
    await POST(
      new Request('http://localhost/api/portail/ja/observations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          supersedesDraftId: 'JA_DRAFT_2',
          idPatient: 'PAT_AUTRE',
          actor: 'praticien',
        }),
      }),
    );

    expect(saveSnapshot).toHaveBeenCalledWith(expect.objectContaining({
      idPatient: 'PAT_TEST',
      actor: 'patient',
      supersedesDraftId: 'JA_DRAFT_2',
    }));
  });

  it('POST refuse un corps incomplet sans appeler le domaine', async () => {
    const { actionCareer: _omis, ...incomplet } = payload;
    const res = await POST(
      new Request('http://localhost/api/portail/ja/observations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(incomplet),
      }),
    );
    const json = (await res.json()) as { ok: boolean; reason: string };

    expect(res.status).toBe(400);
    expect(json.reason).toBe('invalid_payload');
    expect(saveSnapshot).not.toHaveBeenCalled();
  });

  // Garde d'appartenance du domaine : un épisode rattaché à un autre patient
  // ressort en 400, pas en 500 — et n'est jamais persisté.
  it('POST rend 400 quand l’épisode n’appartient pas au patient de la session', async () => {
    saveSnapshot.mockRejectedValue(new TypeError('L’épisode JA n’appartient pas au patient demandé.'));
    const res = await POST(
      new Request('http://localhost/api/portail/ja/observations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, episode: { ...payload.episode, patientId: 'PAT_AUTRE' } }),
      }),
    );
    const json = (await res.json()) as { ok: boolean; reason: string; error: string };

    expect(res.status).toBe(400);
    expect(json.reason).toBe('invalid_payload');
    expect(json.error).toMatch(/n’appartient pas au patient/);
  });

  // Autorité serveur : la cohérence interne du corps ne suffit pas. Un onglet
  // resté ouvert au travers d'une nouvelle diffusion enverrait un instantané
  // parfaitement cohérent avec lui-même, rattaché au cycle périmé.
  it('POST refuse un instantané rattaché à un cycle qui n’est plus diffusé', async () => {
    resolveProtocoleDiffuse.mockResolvedValue({
      protocolDraftId: 'PD_2',
      protocolDraftInputHash: '9999999999999999ZZZZ',
      approvedAt: new Date('2026-08-01T08:00:00.000Z'),
    });
    const res = await POST(
      new Request('http://localhost/api/portail/ja/observations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    );
    const json = (await res.json()) as { reason: string; error: string };

    expect(res.status).toBe(409);
    expect(json.reason).toBe('cycle_perime');
    expect(json.error).toMatch(/Rechargez la page/);
    expect(saveSnapshot).not.toHaveBeenCalled();
  });

  it('POST refuse quand plus aucun protocole n’est diffusé', async () => {
    resolveProtocoleDiffuse.mockResolvedValue(null);
    const res = await POST(
      new Request('http://localhost/api/portail/ja/observations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(409);
    expect(saveSnapshot).not.toHaveBeenCalled();
  });

  // Le patient ne chaîne que sur ses propres transmissions : le filtre est posé
  // EN BASE, une fenêtre tous acteurs pouvant les masquer entièrement.
  it('GET borne la liste aux instantanés du patient, en base', async () => {
    listSnapshots.mockResolvedValue([]);
    await GET(new Request('http://localhost/api/portail/ja/observations'));
    expect(listSnapshots).toHaveBeenCalledWith('PAT_TEST', 10, 'patient');
  });

  it('POST refuse si la session n’est plus valide pour le compte', async () => {
    isSessionValideForPatient.mockReturnValue(false);
    const res = await POST(
      new Request('http://localhost/api/portail/ja/observations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(401);
    expect(saveSnapshot).not.toHaveBeenCalled();
  });
});
