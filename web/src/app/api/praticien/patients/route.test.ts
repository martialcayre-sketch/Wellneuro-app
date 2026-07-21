import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    assignation: { findMany: vi.fn() },
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { GET, PATCH } from './route';

function get(query = ''): Request {
  return new Request(`http://localhost/api/praticien/patients${query ? `?${query}` : ''}`);
}

function patch(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/praticien/patients', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// Régression E7 — cette route renvoyait tous les patients de la base (e-mail,
// téléphone inclus) et laissait PATCH muter n'importe lequel, sans
// vérifier l'appartenance au praticien en session. Garde ajoutée 2026-07-21.
describe('GET /api/praticien/patients', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.patient.findMany.mockResolvedValue([]);
    prisma.patient.count.mockResolvedValue(0);
    prisma.assignation.findMany.mockResolvedValue([]);
  });

  it('refuse sans session (401)', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET(get());
    expect(res.status).toBe(401);
    expect(prisma.patient.findMany).not.toHaveBeenCalled();
  });

  it('liste non paginée : scope patients et assignations au praticien en session', async () => {
    await GET(get());
    expect(prisma.patient.findMany).toHaveBeenCalledWith({
      where: { praticienEmail: { equals: 'p@wellneuro.fr', mode: 'insensitive' } },
      orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
    });
    expect(prisma.assignation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { patient: { praticienEmail: { equals: 'p@wellneuro.fr', mode: 'insensitive' } } } })
    );
  });

  // Sans ce champ, l'écran ne peut pas distinguer un dossier clos d'un dossier
  // désactivé : le premier conserve la lecture, le second la perd.
  it('expose l’état de clôture du suivi, en ISO ou null', async () => {
    prisma.patient.findMany.mockResolvedValue([
      {
        idPatient: 'PAT_SEED_03',
        email: 'michel.dogne@fictif.wellneuro.fr',
        prenom: 'Michel',
        nom: 'Dogné',
        telephone: null,
        actif: true,
        suiviClotureLe: new Date('2026-07-21T10:00:00.000Z'),
      },
      {
        idPatient: 'PAT_SEED_01',
        email: 'sophie.nicola@fictif.wellneuro.fr',
        prenom: 'Sophie',
        nom: 'Nicola',
        telephone: null,
        actif: true,
        suiviClotureLe: null,
      },
    ]);
    const json = (await (await GET(get())).json()) as {
      patients: { idPatient: string; suiviClotureLe: string | null }[];
    };
    expect(json.patients[0].suiviClotureLe).toBe('2026-07-21T10:00:00.000Z');
    expect(json.patients[1].suiviClotureLe).toBeNull();
  });

  it('liste paginée : scope aussi le where de recherche', async () => {
    await GET(get('page=1&search=Nicola'));
    const where = prisma.patient.findMany.mock.calls[0][0].where;
    expect(where.praticienEmail).toEqual({ equals: 'p@wellneuro.fr', mode: 'insensitive' });
    expect(where.OR).toBeDefined();
    expect(prisma.patient.count).toHaveBeenCalledWith({ where });
  });
});

describe('PATCH /api/praticien/patients', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({ idPatient: 'PAT001', praticienEmail: 'p@wellneuro.fr' });
    prisma.patient.update.mockResolvedValue({});
  });

  it('patient d’un autre praticien : 403, aucune écriture', async () => {
    prisma.patient.findUnique.mockResolvedValue({ idPatient: 'PAT001', praticienEmail: 'autre@wellneuro.fr' });
    const res = await PATCH(patch({ idPatient: 'PAT001', actif: 'NON' }));
    expect(res.status).toBe(403);
    expect(prisma.patient.update).not.toHaveBeenCalled();
  });

  it('patient accessible : autorise la modification', async () => {
    const res = await PATCH(patch({ idPatient: 'PAT001', actif: 'NON' }));
    expect(res.status).toBe(200);
    expect(prisma.patient.update).toHaveBeenCalledOnce();
  });

  // La forme `/^PAT\d+$/` rejetait les identifiants à tiret bas, dont le
  // patient fictif `PAT_SEED_03` : « Modifier » était inopérant sur le dossier
  // de seed, et le menu de LOT-01b passe par cette même route pour activer et
  // désactiver un dossier.
  it('accepte un identifiant à tiret bas (PAT_SEED_03)', async () => {
    prisma.patient.findUnique.mockResolvedValue({ idPatient: 'PAT_SEED_03', praticienEmail: 'p@wellneuro.fr' });
    const res = await PATCH(patch({ idPatient: 'PAT_SEED_03', actif: 'OUI' }));
    expect(res.status).toBe(200);
    expect(prisma.patient.update).toHaveBeenCalledOnce();
  });

  // L'alphabet élargi ne doit pas devenir un contournement : l'appartenance
  // reste vérifiée, y compris sur les identifiants à tiret bas.
  it('un identifiant à tiret bas d’un autre praticien reste refusé (403)', async () => {
    prisma.patient.findUnique.mockResolvedValue({ idPatient: 'PAT_SEED_03', praticienEmail: 'autre@wellneuro.fr' });
    const res = await PATCH(patch({ idPatient: 'PAT_SEED_03', actif: 'NON' }));
    expect(res.status).toBe(403);
    expect(prisma.patient.update).not.toHaveBeenCalled();
  });

  it('refuse toujours un identifiant hors alphabet (400, aucune écriture)', async () => {
    const res = await PATCH(patch({ idPatient: 'PAT001; DROP', actif: 'NON' }));
    expect(res.status).toBe(400);
    expect(prisma.patient.update).not.toHaveBeenCalled();
  });
});

// Il n'y a PAS de handler `DELETE` sur cette route, et ce test est là pour que
// son absence échoue en CI si on le réintroduit. Le verbe existait, n'écrivait
// que `actif: false`, et voisinerait aujourd'hui un effacement qui détruit
// vraiment : un lecteur pressé confondrait les deux. Désactiver passe par
// `PATCH { actif: 'NON' }`, effacer par `POST …/cycle-de-vie`. Un commentaire
// seul n'aurait pas résisté au réflexe REST — celui-ci, si.
describe('DELETE /api/praticien/patients', () => {
  it('n’existe pas : Next répond 405 en l’absence de handler', async () => {
    const handlers = await import('./route');
    expect('DELETE' in handlers).toBe(false);
  });
});
