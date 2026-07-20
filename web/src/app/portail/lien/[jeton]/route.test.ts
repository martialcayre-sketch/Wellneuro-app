import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma, ensureActivePortalAccess, logger } = vi.hoisted(() => ({
  prisma: {
    portailMagicLink: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    patient: { findUnique: vi.fn() },
  },
  ensureActivePortalAccess: vi.fn(),
  logger: { security: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/observability/logger', () => ({ logger }));
vi.mock('@/lib/consultation/portal-access', async () => {
  const actual = await vi.importActual<typeof import('@/lib/consultation/portal-access')>(
    '@/lib/consultation/portal-access',
  );
  return { ...actual, ensureActivePortalAccess };
});

import { PortalAccessError } from '@/lib/consultation/portal-access';
import { empreinteJeton } from '@/lib/portail/lienMagique';
import { GET } from './route';

const JETON = 'jeton-de-test-non-production';
const DEMAIN = new Date(Date.now() + 60 * 60 * 1000);
const HIER = new Date(Date.now() - 60 * 60 * 1000);

function requete(jeton = JETON): Request {
  return new Request(`http://localhost/portail/lien/${jeton}`);
}

function appeler(jeton = JETON) {
  return GET(requete(jeton), { params: { jeton } });
}

const LIEN_VALIDE = { id: 'lk_1', idPatient: 'PAT_TEST', expireLe: DEMAIN, consommeLe: null };

describe('GET /portail/lien/[jeton]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    process.env.WN_G4_LIEN_MAGIQUE = 'true';
    prisma.portailMagicLink.findUnique.mockResolvedValue(LIEN_VALIDE);
    prisma.portailMagicLink.updateMany.mockResolvedValue({ count: 1 });
    prisma.portailMagicLink.update.mockResolvedValue({});
    prisma.patient.findUnique.mockResolvedValue({ email: 'michel.dogne@fictif.wellneuro.fr' });
    ensureActivePortalAccess.mockResolvedValue({
      accessToken: 'TOK_PERMANENT',
      url: 'http://localhost/portail/TOK_PERMANENT',
    });
  });

  // Ce qui rend le NO-GO réel : merger la migration n'active rien.
  it('drapeau éteint : la route n’existe pas', async () => {
    delete process.env.WN_G4_LIEN_MAGIQUE;
    const res = await appeler();
    expect(res.status).toBe(404);
    expect(prisma.portailMagicLink.findUnique).not.toHaveBeenCalled();
  });

  it('un lien valide ouvre la session et renvoie vers l’espace patient', async () => {
    const res = await appeler();
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/portail/TOK_PERMANENT');
    expect(res.headers.get('set-cookie')).toContain('wn_portail=');
  });

  // Le jeton n'est jamais stocké : c'est son empreinte qui sert de clé.
  it('la recherche se fait sur l’empreinte, jamais sur le jeton', async () => {
    await appeler();
    const where = prisma.portailMagicLink.findUnique.mock.calls[0][0].where;
    expect(where.jetonEmpreinte).toBe(empreinteJeton(JETON));
    expect(JSON.stringify(where)).not.toContain(JETON);
  });

  // L'invariant du gate : le second passage n'ouvre rien.
  it('un lien déjà consommé est refusé, et le refus est tracé en base', async () => {
    prisma.portailMagicLink.findUnique.mockResolvedValue({ ...LIEN_VALIDE, consommeLe: HIER });
    const res = await appeler();
    expect(res.headers.get('location')).toContain('/portail/lien/indisponible');
    expect(res.headers.get('set-cookie')).toBeNull();
    expect(prisma.portailMagicLink.update).toHaveBeenCalledWith({
      where: { id: 'lk_1' },
      data: { rejeuxRefuses: { increment: 1 }, derniereTentative: expect.any(Date) },
    });
  });

  it('un lien expiré est refusé, et le refus est tracé en base', async () => {
    prisma.portailMagicLink.findUnique.mockResolvedValue({ ...LIEN_VALIDE, expireLe: HIER });
    const res = await appeler();
    expect(res.headers.get('location')).toContain('/portail/lien/indisponible');
    expect(prisma.portailMagicLink.update).toHaveBeenCalled();
  });

  // La consommation ne doit pas être « lire puis écrire » : entre les deux,
  // une seconde requête passerait.
  it('la consommation est atomique — écriture conditionnée à `consommeLe: null`', async () => {
    await appeler();
    expect(prisma.portailMagicLink.updateMany).toHaveBeenCalledWith({
      where: { id: 'lk_1', consommeLe: null },
      data: { consommeLe: expect.any(Date) },
    });
  });

  it('perdre la course de consommation vaut refus, pas ouverture', async () => {
    prisma.portailMagicLink.updateMany.mockResolvedValue({ count: 0 });
    const res = await appeler();
    expect(res.headers.get('location')).toContain('/portail/lien/indisponible');
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('un portail révoqué est refusé comme le reste, sans rien dire de plus', async () => {
    ensureActivePortalAccess.mockRejectedValue(new PortalAccessError('portal_revoked'));
    const res = await appeler();
    expect(res.headers.get('location')).toContain('/portail/lien/indisponible');
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  // Rien ne doit distinguer les quatre refus : ni l'URL, ni le code HTTP.
  it('consommé, expiré, inconnu et révoqué atterrissent au même endroit', async () => {
    const destinations: string[] = [];

    prisma.portailMagicLink.findUnique.mockResolvedValue({ ...LIEN_VALIDE, consommeLe: HIER });
    destinations.push((await appeler()).headers.get('location') ?? '');

    prisma.portailMagicLink.findUnique.mockResolvedValue({ ...LIEN_VALIDE, expireLe: HIER });
    destinations.push((await appeler()).headers.get('location') ?? '');

    prisma.portailMagicLink.findUnique.mockResolvedValue(null);
    destinations.push((await appeler()).headers.get('location') ?? '');

    prisma.portailMagicLink.findUnique.mockResolvedValue(LIEN_VALIDE);
    ensureActivePortalAccess.mockRejectedValue(new PortalAccessError('portal_revoked'));
    destinations.push((await appeler()).headers.get('location') ?? '');

    expect(new Set(destinations).size).toBe(1);
  });

  // `sanitizeUrl` conserve le chemin, et le chemin EST le jeton : sans route
  // journalisée en dur, chaque tentative écrirait un secret d'accès dans les
  // logs. Ce test garde cette substitution.
  it('le jeton n’apparaît jamais dans ce qui est journalisé', async () => {
    prisma.portailMagicLink.findUnique.mockResolvedValue(null);
    await appeler();
    await appeler();

    const journalise = JSON.stringify([
      ...logger.security.mock.calls,
      ...logger.error.mock.calls,
    ]);
    expect(journalise).not.toContain(JETON);
    expect(journalise).toContain('/portail/lien/[jeton]');
  });
});
