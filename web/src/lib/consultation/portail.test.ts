import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({ prisma: { patient: { findUnique: vi.fn() } } }));

vi.mock('@/lib/prisma', () => ({ prisma }));

import { isJetonPerime, resolvePortailPatient, TTL_JETON_PORTAIL_JOURS_DEFAUT } from './portail';

const JOUR_MS = 24 * 60 * 60 * 1000;
const MAINTENANT = new Date('2026-07-21T12:00:00.000Z');

function ilYA(jours: number): Date {
  return new Date(MAINTENANT.getTime() - jours * JOUR_MS);
}

function patientFictif(surcharges: Record<string, unknown> = {}) {
  return {
    idPatient: 'PAT_TEST',
    email: 'michel.dogne@fictif.wellneuro.fr',
    actif: true,
    accessToken: 'TOK_TEST',
    accessTokenRevoked: false,
    accessTokenCreatedAt: ilYA(1),
    ...surcharges,
  };
}

describe('isJetonPerime', () => {
  const ttlInitial = process.env.WN_PORTAIL_TOKEN_TTL_JOURS;

  afterEach(() => {
    if (ttlInitial === undefined) delete process.env.WN_PORTAIL_TOKEN_TTL_JOURS;
    else process.env.WN_PORTAIL_TOKEN_TTL_JOURS = ttlInitial;
  });

  it('laisse passer un jeton plus jeune que le TTL', () => {
    expect(isJetonPerime(ilYA(TTL_JETON_PORTAIL_JOURS_DEFAUT - 1), MAINTENANT)).toBe(false);
  });

  it('périme un jeton plus vieux que le TTL', () => {
    expect(isJetonPerime(ilYA(TTL_JETON_PORTAIL_JOURS_DEFAUT + 1), MAINTENANT)).toBe(true);
  });

  it('ne périme pas pile au seuil', () => {
    expect(isJetonPerime(ilYA(TTL_JETON_PORTAIL_JOURS_DEFAUT), MAINTENANT)).toBe(false);
  });

  // Antériorité : les jetons émis avant que la date de création soit posée
  // systématiquement n'ont pas d'âge connu. Les périmer déconnecterait des
  // patients actifs sans que personne puisse dater leur lien.
  it('ne périme jamais un jeton sans date de création', () => {
    expect(isJetonPerime(null, MAINTENANT)).toBe(false);
    expect(isJetonPerime(undefined, MAINTENANT)).toBe(false);
  });

  it('désactive la péremption quand le TTL vaut 0', () => {
    process.env.WN_PORTAIL_TOKEN_TTL_JOURS = '0';
    expect(isJetonPerime(ilYA(10_000), MAINTENANT)).toBe(false);
  });

  it('honore un TTL personnalisé', () => {
    process.env.WN_PORTAIL_TOKEN_TTL_JOURS = '7';
    expect(isJetonPerime(ilYA(6), MAINTENANT)).toBe(false);
    expect(isJetonPerime(ilYA(8), MAINTENANT)).toBe(true);
  });

  // Une variable mal saisie ne doit pas silencieusement désactiver la garde.
  it('retombe sur le TTL par défaut si la variable est illisible', () => {
    process.env.WN_PORTAIL_TOKEN_TTL_JOURS = 'quatre-vingt-dix';
    expect(isJetonPerime(ilYA(TTL_JETON_PORTAIL_JOURS_DEFAUT + 1), MAINTENANT)).toBe(true);
    expect(isJetonPerime(ilYA(TTL_JETON_PORTAIL_JOURS_DEFAUT - 1), MAINTENANT)).toBe(false);
  });
});

describe('resolvePortailPatient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(MAINTENANT);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('résout un patient dont le jeton est encore valide', async () => {
    prisma.patient.findUnique.mockResolvedValue(patientFictif());
    await expect(resolvePortailPatient('TOK_TEST', 'michel.dogne@fictif.wellneuro.fr')).resolves.not.toBeNull();
  });

  it('refuse un jeton périmé, même avec le bon email', async () => {
    prisma.patient.findUnique.mockResolvedValue(
      patientFictif({ accessTokenCreatedAt: ilYA(TTL_JETON_PORTAIL_JOURS_DEFAUT + 1) }),
    );
    await expect(resolvePortailPatient('TOK_TEST', 'michel.dogne@fictif.wellneuro.fr')).resolves.toBeNull();
  });

  it('accepte un jeton sans date de création', async () => {
    prisma.patient.findUnique.mockResolvedValue(patientFictif({ accessTokenCreatedAt: null }));
    await expect(resolvePortailPatient('TOK_TEST', 'michel.dogne@fictif.wellneuro.fr')).resolves.not.toBeNull();
  });

  it('refuse toujours un jeton révoqué', async () => {
    prisma.patient.findUnique.mockResolvedValue(patientFictif({ accessTokenRevoked: true }));
    await expect(resolvePortailPatient('TOK_TEST', 'michel.dogne@fictif.wellneuro.fr')).resolves.toBeNull();
  });

  it('refuse toujours un email qui ne correspond pas', async () => {
    prisma.patient.findUnique.mockResolvedValue(patientFictif());
    await expect(resolvePortailPatient('TOK_TEST', 'autre@fictif.wellneuro.fr')).resolves.toBeNull();
  });
});
