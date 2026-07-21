import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma, verifierAppartenancePatient, effacerDossier, logger } = vi.hoisted(
  () => ({
    getServerSession: vi.fn(),
    prisma: { patient: { updateMany: vi.fn() } },
    verifierAppartenancePatient: vi.fn(),
    effacerDossier: vi.fn(),
    logger: { security: vi.fn(), error: vi.fn() },
  }),
);

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/observability/logger', () => ({ logger }));
vi.mock('@/lib/praticien/appartenance', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  verifierAppartenancePatient,
}));
vi.mock('@/lib/patient/effacement', () => ({ effacerDossier }));

import { POST } from './route';

function requete(corps: unknown): Request {
  return new Request('http://localhost/api/praticien/patients/cycle-de-vie', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
  });
}

const EFFACEMENT = { idPatient: 'PAT_SEED_03', action: 'effacement', confirmation: 'EFFACER' };

beforeEach(() => {
  vi.clearAllMocks();
  getServerSession.mockResolvedValue({ user: { email: 'martial@wellneuro.fr' } });
  verifierAppartenancePatient.mockResolvedValue('accessible');
  prisma.patient.updateMany.mockResolvedValue({ count: 1 });
  effacerDossier.mockResolvedValue({
    supprimees: { patient: 1, assignations: 2 },
    residu: { anneeNaissance: 1975, initialesNom: 'DOG' },
  });
});

describe('POST /api/praticien/patients/cycle-de-vie', () => {
  it('sans session, rien n’est touché', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await POST(requete(EFFACEMENT))).status).toBe(401);
    expect(effacerDossier).not.toHaveBeenCalled();
  });

  // Mêmes codes que les 30 autres routes praticien : les deux échecs ne se
  // confondent pas, et surtout aucun des deux n'efface quoi que ce soit.
  it('un dossier d’un autre praticien est refusé en 403, sans effacement', async () => {
    verifierAppartenancePatient.mockResolvedValue('autre_praticien');
    expect((await POST(requete(EFFACEMENT))).status).toBe(403);
    expect(effacerDossier).not.toHaveBeenCalled();
  });

  it('un dossier inexistant répond 404', async () => {
    verifierAppartenancePatient.mockResolvedValue('introuvable');
    expect((await POST(requete(EFFACEMENT))).status).toBe(404);
  });

  // LE test de cette route. La confirmation renforcée est exigée PAR LE
  // SERVEUR : une confirmation qui ne vivrait que dans l'écran se contournerait
  // par un appel direct, et l'effacement est irréversible.
  it('sans confirmation explicite, l’effacement n’a pas lieu', async () => {
    const res = await POST(requete({ idPatient: 'PAT_SEED_03', action: 'effacement' }));
    expect(res.status).toBe(400);
    expect(effacerDossier).not.toHaveBeenCalled();
  });

  it('une confirmation approximative ne suffit pas', async () => {
    for (const confirmation of ['effacer', 'OUI', 'EFFACE', '']) {
      await POST(requete({ idPatient: 'PAT_SEED_03', action: 'effacement', confirmation }));
    }
    expect(effacerDossier).not.toHaveBeenCalled();
  });

  it('avec confirmation, l’effacement est exécuté', async () => {
    const res = await POST(requete(EFFACEMENT));
    expect(res.status).toBe(200);
    expect(effacerDossier).toHaveBeenCalledWith('PAT_SEED_03');
  });

  // Le résidu ne doit pas ressortir par la réponse ni par les logs : effacer
  // puis raconter ce qu'on a effacé viderait l'opération de son sens.
  it('ni la réponse ni le journal ne portent le résidu', async () => {
    const corps = await (await POST(requete(EFFACEMENT))).text();
    expect(corps).not.toContain('DOG');
    expect(corps).not.toContain('1975');
    const journal = JSON.stringify(logger.security.mock.calls);
    expect(journal).not.toContain('DOG');
    expect(journal).not.toContain('PAT_SEED_03');
  });

  it('la clôture pose une date, la reprise l’efface', async () => {
    await POST(requete({ idPatient: 'PAT_SEED_03', action: 'cloture' }));
    expect(prisma.patient.updateMany.mock.calls[0][0].data.suiviClotureLe).toBeInstanceOf(Date);

    await POST(requete({ idPatient: 'PAT_SEED_03', action: 'reprise' }));
    expect(prisma.patient.updateMany.mock.calls[1][0].data.suiviClotureLe).toBeNull();

    // Une clôture n'efface jamais rien : c'est toute la distinction du lot.
    expect(effacerDossier).not.toHaveBeenCalled();
  });

  it('une action inconnue est refusée', async () => {
    const res = await POST(requete({ idPatient: 'PAT_SEED_03', action: 'supprimer' }));
    expect(res.status).toBe(400);
    expect(prisma.patient.updateMany).not.toHaveBeenCalled();
    expect(effacerDossier).not.toHaveBeenCalled();
  });
});
