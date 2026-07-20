import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma, sendMagicLinkEmail, logger, attendre } = vi.hoisted(() => ({
  prisma: {
    patient: { findUnique: vi.fn() },
    portailMagicLink: { count: vi.fn(), create: vi.fn() },
    portailDemandeTentative: { count: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
  },
  sendMagicLinkEmail: vi.fn(),
  logger: { security: vi.fn(), error: vi.fn() },
  attendre: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma }));
// Le *combien* est une fonction pure, testée dans `lienMagique.test.ts` ; ici on
// vérifie que la route l'appelle sur toutes ses sorties — sans dormir 1,5 s par cas.
vi.mock('@/lib/portail/attente', () => ({ attendre }));
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

function requete(email: unknown, ip = '203.0.113.7'): Request {
  return new Request('http://localhost/api/portail/lien/demande', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
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
    prisma.portailDemandeTentative.count.mockResolvedValue(1);
    prisma.portailDemandeTentative.create.mockResolvedValue({});
    prisma.portailDemandeTentative.deleteMany.mockResolvedValue({ count: 0 });
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

  // ── Résidu 1 : le temps de réponse ────────────────────────────────────────
  // Corps et code étaient déjà identiques. Restait la durée : une adresse
  // connue coûte une écriture et une poignée SMTP, une inconnue ne coûte rien.

  it('toute sortie indifférenciée passe par le plancher — même la panne', async () => {
    const branches: Array<() => void> = [
      () => undefined,
      () => prisma.patient.findUnique.mockResolvedValue(null),
      () => prisma.portailMagicLink.count.mockResolvedValue(3),
      () => prisma.portailDemandeTentative.count.mockResolvedValue(999),
      () => prisma.patient.findUnique.mockRejectedValue(new Error('base indisponible')),
    ];

    for (const brancher of branches) {
      vi.clearAllMocks();
      prisma.patient.findUnique.mockResolvedValue(PATIENT);
      prisma.portailMagicLink.count.mockResolvedValue(0);
      prisma.portailDemandeTentative.count.mockResolvedValue(1);
      brancher();

      await POST(requete(PATIENT.email));
      expect(attendre).toHaveBeenCalledTimes(1);
      expect(attendre.mock.calls[0][0]).toBeGreaterThan(0);
    }
  });

  // ── Résidu 2 : la limitation par origine réseau ───────────────────────────

  it('chaque tentative est comptée avant même de savoir si l’adresse existe', async () => {
    prisma.patient.findUnique.mockResolvedValue(null);
    await POST(requete('inconnue@example.test'));
    // C'est tout l'enjeu : une adresse inconnue ne crée aucun lien magique,
    // donc seule cette table peut compter l'énumération.
    expect(prisma.portailDemandeTentative.create).toHaveBeenCalledTimes(1);
  });

  it('l’adresse IP n’est jamais écrite en base, seulement son empreinte', async () => {
    await POST(requete(PATIENT.email, '198.51.100.4'));
    const data = prisma.portailDemandeTentative.create.mock.calls[0][0].data;
    expect(JSON.stringify(data)).not.toContain('198.51.100.4');
    expect(data.empreinteIp).toMatch(/^[A-Za-z0-9_-]+$/);
    // Aucune colonne ne relie la tentative à un patient : la table sait
    // combien, jamais pour qui.
    expect(Object.keys(data)).toEqual(['empreinteIp']);
  });

  it('deux origines distinctes ne se comptent pas ensemble', async () => {
    await POST(requete(PATIENT.email, '198.51.100.4'));
    await POST(requete(PATIENT.email, '198.51.100.5'));
    const [a, b] = prisma.portailDemandeTentative.count.mock.calls.map(
      (appel) => appel[0].where.empreinteIp,
    );
    expect(a).not.toBe(b);
  });

  it('au-delà du plafond, aucune adresse n’est même consultée', async () => {
    const reference = await observable(await POST(requete(PATIENT.email)));
    vi.clearAllMocks();

    prisma.portailDemandeTentative.count.mockResolvedValue(21);
    const plafonnee = await observable(await POST(requete(PATIENT.email)));

    expect(plafonnee).toEqual(reference);
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
    expect(sendMagicLinkEmail).not.toHaveBeenCalled();
  });

  it('les tentatives sorties de la fenêtre sont purgées, jamais conservées', async () => {
    await POST(requete(PATIENT.email));
    const where = prisma.portailDemandeTentative.deleteMany.mock.calls[0][0].where;
    // Un DELETE sans WHERE effacerait le comptage en cours.
    expect(where.creeLe.lt).toBeInstanceOf(Date);
    expect(where.creeLe.lt.getTime()).toBeLessThan(Date.now() - 23 * 60 * 60 * 1000);
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
