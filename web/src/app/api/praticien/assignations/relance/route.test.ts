import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getServerSession,
  verifierAppartenancePatient,
  journaliserCorrespondancePatient,
  prisma,
} = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  verifierAppartenancePatient: vi.fn(),
  journaliserCorrespondancePatient: vi.fn(),
  prisma: {
    assignation: { findUnique: vi.fn() },
    patient: { findUnique: vi.fn() },
    correspondancePatient: { findMany: vi.fn() },
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/praticien/appartenance', () => ({
  verifierAppartenancePatient,
  emailPraticien: () => 'praticien@wellneuro.fr',
}));
vi.mock('@/lib/correspondance/patient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/correspondance/patient')>()),
  journaliserCorrespondancePatient,
}));

import { POST } from './route';

function requete(corps: unknown): Request {
  return new Request('http://localhost/api/praticien/assignations/relance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
  });
}

const DEMAIN_DU_RETARD = '2026-01-01';

describe('/api/praticien/assignations/relance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('WN_RELANCE_QUESTIONNAIRE', 'true');
    // Sans SMTP, l'envoi TRACE quand même : c'est cette trace que la cadence
    // relira. Un envoi non tracé rouvrirait la porte à l'appel suivant.
    vi.stubEnv('SMTP_URL', '');
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    verifierAppartenancePatient.mockResolvedValue('ok');
    prisma.assignation.findUnique.mockResolvedValue({
      idPatient: 'PAT_TEST', statut: 'En attente', dateLimite: DEMAIN_DU_RETARD,
    });
    prisma.patient.findUnique.mockResolvedValue({
      actif: true, suiviClotureLe: null, email: 'patient@example.test',
    });
    prisma.correspondancePatient.findMany.mockResolvedValue([]);
  });

  // DRAPEAU D'ABORD, et AVANT toute lecture : ce qui s'ouvre est un courrier de
  // plus vers le patient. Refuser après avoir lu le dossier laisserait une
  // trace d'accès pour un geste qui ne peut pas aboutir.
  it('refuse 503 drapeau éteint, sans rien lire du dossier', async () => {
    vi.stubEnv('WN_RELANCE_QUESTIONNAIRE', '');
    const res = await POST(requete({ idAssignation: 'ASS_1' }));

    expect(res.status).toBe(503);
    expect(prisma.assignation.findUnique).not.toHaveBeenCalled();
  });

  it('exige une session et un identifiant recevable', async () => {
    getServerSession.mockResolvedValueOnce(null);
    expect((await POST(requete({ idAssignation: 'ASS_1' }))).status).toBe(401);
    expect((await POST(requete({ idAssignation: '' }))).status).toBe(400);
    expect((await POST(requete({ idAssignation: 'ASS 1 !' }))).status).toBe(400);
  });

  it('traite l’assignation d’un autre praticien comme inaccessible', async () => {
    verifierAppartenancePatient.mockResolvedValueOnce('autre_praticien');
    expect((await POST(requete({ idAssignation: 'ASS_1' }))).status).toBe(403);
  });

  it('envoie le rappel et le trace, sans rien écrire dans le dossier', async () => {
    const res = await POST(requete({ idAssignation: 'ASS_1' }));

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, statut: 'Non_envoye' });
    // LA TRACE PORTE L'ASSIGNATION : c'est par elle que la cadence du prochain
    // appel distingue ce questionnaire des autres du même dossier.
    expect(journaliserCorrespondancePatient).toHaveBeenCalledWith(
      expect.objectContaining({
        idPatient: 'PAT_TEST',
        type: 'relance_questionnaire',
        referenceType: 'assignation',
        referenceId: 'ASS_1',
      }),
    );
  });

  it('refuse 409 une assignation sans échéance, en le disant', async () => {
    prisma.assignation.findUnique.mockResolvedValueOnce({
      idPatient: 'PAT_TEST', statut: 'En attente', dateLimite: null,
    });
    const res = await POST(requete({ idAssignation: 'ASS_1' }));

    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ ok: false, reason: 'sans_echeance' });
    expect(journaliserCorrespondancePatient).not.toHaveBeenCalled();
  });

  // 429 ET NON 409 : ce n'est pas l'état du dossier qui refuse, c'est le
  // rythme — et l'écran peut dire quand ce sera possible.
  it('refuse 429 sur la cadence, et dit quand le prochain rappel sera possible', async () => {
    prisma.correspondancePatient.findMany.mockResolvedValueOnce([
      { enregistreLe: new Date() },
    ]);
    const res = await POST(requete({ idAssignation: 'ASS_1' }));

    expect(res.status).toBe(429);
    const charge = await res.json();
    expect(charge).toMatchObject({ ok: false, reason: 'cadence' });
    expect(typeof charge.possibleLe).toBe('string');
  });

  it('refuse 409 sur un dossier au suivi clôturé', async () => {
    prisma.patient.findUnique.mockResolvedValueOnce({
      actif: true, suiviClotureLe: new Date('2026-02-01'), email: 'patient@example.test',
    });
    const res = await POST(requete({ idAssignation: 'ASS_1' }));

    expect(res.status).toBe(409);
    expect(journaliserCorrespondancePatient).not.toHaveBeenCalled();
  });
});
