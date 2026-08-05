import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma, listSnapshots, readSnapshot, saveSnapshot } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    journalAccesDossier: { create: vi.fn(), deleteMany: vi.fn() },
  },
  listSnapshots: vi.fn(),
  readSnapshot: vi.fn(),
  saveSnapshot: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/food-observation/persistence', () => ({
  listJaObservationSnapshots: listSnapshots,
  readJaObservationSnapshot: readSnapshot,
  saveJaObservationSnapshot: saveSnapshot,
}));

import { GET, POST } from './route';

function postRequest(body: unknown): Request {
  return new Request('http://localhost/api/praticien/ja/observations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const payload = {
  idPatient: 'PAT_TEST',
  episode: {
    episodeId: 'ja_episode_1',
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

describe('api/praticien/ja/observations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET refuse sans session praticien', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET(new Request('http://localhost/api/praticien/ja/observations?idPatient=PAT_TEST'));
    expect(res.status).toBe(401);
  });

  // H-A : le filtre d'acteur est posé EN BASE. Appliqué après coup sur une
  // fenêtre de 10 lignes tous acteurs — chaque activation praticien en écrivant
  // deux — le panneau conclurait « aucune transmission du patient » alors qu'il
  // en existe.
  it('GET borne la liste à l’acteur demandé, en base', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'praticien@wellneuro.fr' });
    listSnapshots.mockResolvedValue([]);

    await GET(new Request('http://localhost/api/praticien/ja/observations?idPatient=PAT_TEST&actor=patient'));
    expect(listSnapshots).toHaveBeenCalledWith('PAT_TEST', 10, 'patient');
  });

  it('GET ignore un acteur inconnu plutôt que de le passer au domaine', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'praticien@wellneuro.fr' });
    listSnapshots.mockResolvedValue([]);

    await GET(new Request('http://localhost/api/praticien/ja/observations?idPatient=PAT_TEST&actor=nimporte'));
    expect(listSnapshots).toHaveBeenCalledWith('PAT_TEST', 10, undefined);
  });

  it('GET liste les snapshots si patient autorisé', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'praticien@wellneuro.fr' });
    listSnapshots.mockResolvedValue([{ draftId: 'JA_DRAFT_1' }]);

    const res = await GET(new Request('http://localhost/api/praticien/ja/observations?idPatient=PAT_TEST'));
    const json = (await res.json()) as { ok: boolean; snapshots: Array<{ draftId: string }> };

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.snapshots[0].draftId).toBe('JA_DRAFT_1');
    // Le GET accessible journalise la lecture au gabarit littéral (G-TRUST-04).
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledTimes(1);
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledWith({
      data: {
        idPatient: 'PAT_TEST',
        praticienEmail: 'praticien@wellneuro.fr',
        route: '/api/praticien/ja/observations',
        methode: 'GET',
      },
    });
  });

  it('GET refuse hors périmètre : 403 à l’octet, jamais journalisé', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'autre@wellneuro.fr' });

    const res = await GET(new Request('http://localhost/api/praticien/ja/observations?idPatient=PAT_TEST'));
    expect(res.status).toBe(403);
    // Corps 403 historique préservé à l'octet malgré le ralliement à la garde.
    expect(await res.json()).toEqual({
      ok: false,
      reason: 'forbidden',
      error: 'Patient non accessible pour ce praticien.',
    });
    expect(listSnapshots).not.toHaveBeenCalled();
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });

  it('POST persiste un snapshot JA si patient autorisé', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'praticien@wellneuro.fr' });
    saveSnapshot.mockResolvedValue({ draftId: 'JA_DRAFT_1' });

    const res = await POST(postRequest(payload));
    const json = (await res.json()) as { ok: boolean; snapshot: { draftId: string } };

    expect(res.status).toBe(201);
    expect(json.ok).toBe(true);
    expect(json.snapshot.draftId).toBe('JA_DRAFT_1');
    expect(saveSnapshot).toHaveBeenCalled();
    // Une écriture laisse déjà sa propre trace datée et attribuée (GD-1).
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });

  it('POST refuse un patient hors périmètre praticien', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'autre@wellneuro.fr' });

    const res = await POST(postRequest(payload));
    expect(res.status).toBe(403);
    // Corps 403 historique préservé à l'octet malgré le ralliement à la garde.
    expect(await res.json()).toEqual({
      ok: false,
      reason: 'forbidden',
      error: 'Patient non accessible pour ce praticien.',
    });
    expect(saveSnapshot).not.toHaveBeenCalled();
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });
});

// Lot 4 — le praticien lisait des compteurs ; il lit désormais ce que le patient
// a écrit. Deux gardes tiennent cette lecture : le cloisonnement par patient, et
// la distinction entre « introuvable » et « rien écrit ».
describe('GET ?draftId — le contenu d’une transmission', () => {
  beforeEach(() => {
    getServerSession.mockResolvedValue({ user: { email: 'pro@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'pro@wellneuro.fr' });
    prisma.journalAccesDossier.create.mockResolvedValue({});
    readSnapshot.mockReset();
    listSnapshots.mockReset();
  });

  const get = (query: string) =>
    GET(new Request(`http://localhost/api/praticien/ja/observations?${query}`));

  it('rend le contenu, mots libres compris', async () => {
    readSnapshot.mockResolvedValue({
      draftId: 'JA_1',
      idPatient: 'PAT_TEST',
      actor: 'patient',
      tracesCount: 1,
      journeesCount: 1,
      traces: [{ traceId: 't1', localDate: '2026-07-28', issue: 'fait', motLibre: 'plus simple la veille' }],
      journees: [{ journeeId: 'j1', localDate: '2026-07-28', typeJournee: 'repos' }],
      pauses: [],
      plans: [],
      solutions: [],
    });

    const res = await get('idPatient=PAT_TEST&draftId=JA_1');
    const json = (await res.json()) as { ok: boolean; snapshot: { traces: { motLibre?: string }[] } };

    expect(res.status).toBe(200);
    expect(json.snapshot.traces[0].motLibre).toBe('plus simple la veille');
    expect(readSnapshot).toHaveBeenCalledWith('PAT_TEST', 'JA_1');
  });

  // « Introuvable » et « ce patient n'a rien écrit » ne se lisent pas de la même
  // façon en consultation : un 200 vide serait le second.
  it('rend 404 — jamais un 200 vide — quand la transmission n’est pas celle de ce patient', async () => {
    readSnapshot.mockResolvedValue(null);
    const res = await get('idPatient=PAT_TEST&draftId=JA_AUTRE');
    const json = (await res.json()) as { ok: boolean; reason: string };
    expect(res.status).toBe(404);
    expect(json.reason).toBe('snapshot_introuvable');
  });

  it('refuse un patient hors périmètre avant même de lire', async () => {
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'autre@wellneuro.fr' });
    const res = await get('idPatient=PAT_TEST&draftId=JA_1');
    expect(res.status).toBe(403);
    expect(readSnapshot).not.toHaveBeenCalled();
  });
});

describe('GET — la troncature est dite', () => {
  beforeEach(() => {
    getServerSession.mockResolvedValue({ user: { email: 'pro@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'pro@wellneuro.fr' });
    prisma.journalAccesDossier.create.mockResolvedValue({});
    listSnapshots.mockReset();
  });

  const get = () => GET(new Request('http://localhost/api/praticien/ja/observations?idPatient=PAT_TEST'));

  it('signale une fenêtre saturée', async () => {
    listSnapshots.mockResolvedValue(Array.from({ length: 10 }, (_, i) => ({ draftId: `JA_${i}` })));
    const json = (await (await get()).json()) as { tronquee: boolean };
    expect(json.tronquee).toBe(true);
  });

  it('ne signale rien quand la fenêtre ne l’est pas', async () => {
    listSnapshots.mockResolvedValue([{ draftId: 'JA_1' }, { draftId: 'JA_2' }]);
    const json = (await (await get()).json()) as { tronquee: boolean };
    expect(json.tronquee).toBe(false);
  });
});
