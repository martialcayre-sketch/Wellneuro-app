import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma, sendMagicLinkEmail, logger } = vi.hoisted(() => ({
  prisma: {
    patient: { findUnique: vi.fn() },
    portailMagicLink: { count: vi.fn(), create: vi.fn() },
  },
  sendMagicLinkEmail: vi.fn(),
  logger: { security: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/observability/logger', () => ({ logger }));
vi.mock('@/lib/consultation/email', () => ({
  sendMagicLinkEmail,
  buildMagicLinkUrl: (jeton: string) => `http://localhost/portail/lien/${jeton}`,
}));

import { POST } from './route';

const PATIENT = {
  idPatient: 'PAT_SEED_03',
  prenom: 'Michel',
  email: 'michel.dogne@fictif.wellneuro.fr',
  actif: true,
  accessTokenRevoked: false,
};

function requete(email: unknown): Request {
  return new Request('http://localhost/api/portail/lien/demande', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
}

/** Ce qu'un appelant peut observer : code, corps, en-têtes. */
async function observable(res: Response) {
  return {
    status: res.status,
    corps: await res.text(),
    entetes: [...res.headers.entries()].filter(([cle]) => cle !== 'x-wellneuro-correlation-id'),
  };
}

describe('POST /api/portail/lien/demande', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    process.env.WN_G4_LIEN_MAGIQUE = 'true';
    process.env.WN_G4_REDEMANDE_PATIENT = 'true';
    prisma.patient.findUnique.mockResolvedValue(PATIENT);
    prisma.portailMagicLink.count.mockResolvedValue(0);
    prisma.portailMagicLink.create.mockResolvedValue({});
  });

  it('drapeau G4 éteint : la route n’existe pas', async () => {
    delete process.env.WN_G4_LIEN_MAGIQUE;
    expect((await POST(requete(PATIENT.email))).status).toBe(404);
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
  });

  // Ce canal est public et non authentifié : il s'ouvre séparément, pour
  // qu'allumer G4 n'expose pas d'emblée une surface publique sur des adresses
  // réelles tant que le temps de réponse n'est pas égalisé.
  it('G4 allumé mais redemande éteinte : la route n’existe toujours pas', async () => {
    delete process.env.WN_G4_REDEMANDE_PATIENT;
    expect((await POST(requete(PATIENT.email))).status).toBe(404);
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
  });

  it('une adresse connue reçoit un lien', async () => {
    await POST(requete(PATIENT.email));
    expect(prisma.portailMagicLink.create).toHaveBeenCalled();
    expect(sendMagicLinkEmail).toHaveBeenCalledWith(
      PATIENT.email,
      PATIENT.prenom,
      expect.stringContaining('/portail/lien/'),
    );
  });

  it('une adresse inconnue ne déclenche ni écriture ni envoi', async () => {
    prisma.patient.findUnique.mockResolvedValue(null);
    await POST(requete('inconnue@example.test'));
    expect(prisma.portailMagicLink.create).not.toHaveBeenCalled();
    expect(sendMagicLinkEmail).not.toHaveBeenCalled();
  });

  // LE test de cette route. Si la réponse diffère, elle devient un oracle
  // permettant d'énumérer les patients de l'application.
  it('connue ou inconnue, la réponse est rigoureusement identique', async () => {
    const connue = await observable(await POST(requete(PATIENT.email)));

    prisma.patient.findUnique.mockResolvedValue(null);
    const inconnue = await observable(await POST(requete('inconnue@example.test')));

    expect(inconnue).toEqual(connue);
  });

  it('un patient inactif ou révoqué répond comme une adresse inconnue', async () => {
    const reference = await observable(await POST(requete(PATIENT.email)));

    prisma.patient.findUnique.mockResolvedValue({ ...PATIENT, actif: false });
    expect(await observable(await POST(requete(PATIENT.email)))).toEqual(reference);

    prisma.patient.findUnique.mockResolvedValue({ ...PATIENT, accessTokenRevoked: true });
    expect(await observable(await POST(requete(PATIENT.email)))).toEqual(reference);

    expect(prisma.portailMagicLink.create).toHaveBeenCalledTimes(1);
  });

  it('la 4ᵉ demande de l’heure n’envoie rien, et répond pareil', async () => {
    const reference = await observable(await POST(requete(PATIENT.email)));
    vi.clearAllMocks();

    prisma.patient.findUnique.mockResolvedValue(PATIENT);
    prisma.portailMagicLink.count.mockResolvedValue(3);
    const plafonnee = await observable(await POST(requete(PATIENT.email)));

    expect(plafonnee).toEqual(reference);
    expect(prisma.portailMagicLink.create).not.toHaveBeenCalled();
    expect(sendMagicLinkEmail).not.toHaveBeenCalled();
  });

  it('la cadence se compte en base, sur l’heure glissante et les demandes du patient', async () => {
    await POST(requete(PATIENT.email));
    const where = prisma.portailMagicLink.count.mock.calls[0][0].where;
    expect(where.idPatient).toBe(PATIENT.idPatient);
    expect(where.creePar).toBe('patient');
    expect(where.creeLe.gte).toBeInstanceOf(Date);
  });

  // Une panne ne doit pas devenir un signal : 500 sur adresse connue et 200 sur
  // inconnue dirait exactement ce qu'on refuse de dire.
  it('même une panne répond comme un succès', async () => {
    const reference = await observable(await POST(requete(PATIENT.email)));

    prisma.patient.findUnique.mockRejectedValue(new Error('base indisponible'));
    expect(await observable(await POST(requete(PATIENT.email)))).toEqual(reference);
  });

  it('une adresse mal formée est refusée — ce n’est pas une énumération', async () => {
    const res = await POST(requete('pas-une-adresse'));
    expect(res.status).toBe(400);
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
  });

  it('le jeton n’est ni journalisé, ni renvoyé au demandeur', async () => {
    const res = await POST(requete(PATIENT.email));
    const jeton = sendMagicLinkEmail.mock.calls[0][2].split('/').pop() as string;

    expect(await res.text()).not.toContain(jeton);
    expect(JSON.stringify(logger.security.mock.calls)).not.toContain(jeton);
    // Ce qui part en base est l'empreinte, jamais le jeton lui-même.
    const data = prisma.portailMagicLink.create.mock.calls[0][0].data;
    expect(JSON.stringify(data)).not.toContain(jeton);
    expect(data.jetonEmpreinte).toBeTruthy();
  });
});
