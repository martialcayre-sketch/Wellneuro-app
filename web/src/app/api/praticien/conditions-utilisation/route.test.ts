import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma, emettre, envoyerEmail } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findMany: vi.fn() },
    trustAcknowledgement: { findMany: vi.fn() },
    correspondancePatient: { findMany: vi.fn() },
  },
  emettre: vi.fn(),
  envoyerEmail: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/portail/emissionLienMagique', () => ({ emettreLienMagiquePourPraticien: emettre }));
vi.mock('@/lib/consultation/email', async orig => ({
  ...(await orig<typeof import('@/lib/consultation/email')>()),
  sendConditionsUtilisationEmail: envoyerEmail,
}));

import { GET, POST } from './route';

// [[D-292]] §3 — l'envoi des conditions aux patients suivis, geste unique du
// cockpit : la liste et l'aperçu (GET), puis l'envoi confirmé (POST), qui relit
// l'éligibilité en base et n'écrit à personne d'autre.

const SESSION = { user: { email: 'praticien@wellneuro.fr' } };

function patient(over: Record<string, unknown> = {}) {
  return {
    idPatient: 'PAT_1',
    prenom: 'Sophie',
    nom: 'Nicola',
    email: 'sophie.nicola@fictif.wellneuro.fr',
    praticienEmail: 'praticien@wellneuro.fr',
    dateNaissance: '1980-04-12',
    actif: true,
    accessTokenRevoked: false,
    suiviClotureLe: null,
    ...over,
  };
}
const suivi = (idPatient: string) => ({
  idPatient,
  documentKey: 'cadre_accompagnement',
  documentVersion: 'v1',
  type: 'pris_connaissance',
});

function poster(corps: unknown) {
  return POST(
    new Request('http://localhost/api/praticien/conditions-utilisation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corps),
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('WN_PORTAIL_CONDITIONS', 'true');
  vi.stubEnv('WN_G4_LIEN_MAGIQUE', 'true');
  vi.stubEnv('SMTP_URL', 'smtp://localhost:1025');
  getServerSession.mockResolvedValue(SESSION);
  prisma.patient.findMany.mockResolvedValue([
    patient(),
    patient({ idPatient: 'PAT_2', prenom: 'Jennifer', nom: 'Martin', email: 'jennifer.martin@fictif.wellneuro.fr' }),
    patient({ idPatient: 'PAT_3', prenom: 'Michel', nom: 'Dogné', email: 'michel.dogne@fictif.wellneuro.fr' }),
  ]);
  // PAT_1 suivi ; PAT_2 suivi mais déjà servi ; PAT_3 nouveau (aucun accusé).
  prisma.trustAcknowledgement.findMany.mockResolvedValue([suivi('PAT_1'), suivi('PAT_2')]);
  prisma.correspondancePatient.findMany.mockResolvedValue([{ idPatient: 'PAT_2' }]);
  emettre.mockImplementation(async (id: string) => `https://app.wellneuro.fr/portail/lien/J_${id}?vers=conditions`);
  envoyerEmail.mockResolvedValue('Envoye');
});

afterEach(() => vi.unstubAllEnvs());

describe('GET /api/praticien/conditions-utilisation', () => {
  it('sans session : 401', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
  });

  it('liste les seuls dossiers éligibles du praticien, avec l’aperçu du gabarit', async () => {
    const corps = await (await GET()).json();
    expect(corps.ok).toBe(true);
    expect(corps.ouvert).toBe(true);
    expect(corps.eligibles).toEqual([{ idPatient: 'PAT_1', prenom: 'Sophie', nom: 'Nicola' }]);
    expect(corps.apercu.sujet).toBe('Wellneuro — les conditions d’utilisation de votre espace');
    expect(corps.apercu.corps).toContain('ouvrez ce lien : [lien personnel]');
    // La lecture est bornée au praticien en session et aux dossiers ouverts.
    const where = prisma.patient.findMany.mock.calls[0][0].where;
    expect(where.praticienEmail).toEqual({ equals: 'praticien@wellneuro.fr', mode: 'insensitive' });
    expect(where).toMatchObject({ actif: true, accessTokenRevoked: false, suiviClotureLe: null });
    // « Déjà servi » se lit sur la version en vigueur, et sur les seuls envois partis.
    expect(prisma.correspondancePatient.findMany.mock.calls[0][0].where).toMatchObject({
      type: 'conditions_utilisation',
      referenceId: expect.stringMatching(/^conditions_utilisation@/),
      statut: 'Envoye',
    });
  });

  it.each([
    ['WN_PORTAIL_CONDITIONS', 'conditions'],
    ['WN_G4_LIEN_MAGIQUE', 'lien magique'],
  ])('drapeau %s fermé : fermé, aucune lecture de dossier', async drapeau => {
    vi.stubEnv(drapeau, '');
    const corps = await (await GET()).json();
    expect(corps).toMatchObject({ ok: true, ouvert: false, eligibles: [] });
    expect(prisma.patient.findMany).not.toHaveBeenCalled();
  });
});

describe('POST /api/praticien/conditions-utilisation', () => {
  it('sans session : 401, rien émis', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await poster({ idsPatient: ['PAT_1'] })).status).toBe(401);
    expect(emettre).not.toHaveBeenCalled();
  });

  it('drapeau fermé : 409, rien émis', async () => {
    vi.stubEnv('WN_PORTAIL_CONDITIONS', '');
    expect((await poster({ idsPatient: ['PAT_1'] })).status).toBe(409);
    expect(emettre).not.toHaveBeenCalled();
  });

  it('sans messagerie : 503, AUCUN lien émis', async () => {
    vi.stubEnv('SMTP_URL', '');
    expect((await poster({ idsPatient: ['PAT_1'] })).status).toBe(503);
    expect(emettre).not.toHaveBeenCalled();
  });

  it.each([[{}], [{ idsPatient: [] }], [{ idsPatient: 'PAT_1' }], [{ idsPatient: [42] }], [{ idsPatient: [''] }]])(
    'corps invalide %j : 400',
    async corps => {
      expect((await poster(corps)).status).toBe(400);
      expect(emettre).not.toHaveBeenCalled();
    },
  );

  it('n’envoie qu’aux dossiers confirmés ET encore éligibles, un lien vers la page des conditions chacun', async () => {
    const res = await poster({ idsPatient: ['PAT_1', 'PAT_2', 'PAT_3', 'PAT_1'] });
    expect(await res.json()).toEqual({ ok: true, envoyes: 1, echoues: 0, ignores: 2 });
    // La relecture est restreinte aux dossiers confirmés (dédupliqués).
    expect(prisma.patient.findMany.mock.calls[0][0].where.idPatient).toEqual({ in: ['PAT_1', 'PAT_2', 'PAT_3'] });
    expect(emettre).toHaveBeenCalledTimes(1);
    expect(emettre).toHaveBeenCalledWith('PAT_1', 'praticien@wellneuro.fr', 'conditions');
    expect(envoyerEmail).toHaveBeenCalledWith({
      patientEmail: 'sophie.nicola@fictif.wellneuro.fr',
      lien: 'https://app.wellneuro.fr/portail/lien/J_PAT_1?vers=conditions',
      idPatient: 'PAT_1',
      praticienEmail: 'praticien@wellneuro.fr',
      referenceId: expect.stringMatching(/^conditions_utilisation@/),
    });
  });

  it('un échec n’arrête pas les suivants, et se compte', async () => {
    prisma.trustAcknowledgement.findMany.mockResolvedValue([suivi('PAT_1'), suivi('PAT_2'), suivi('PAT_3')]);
    prisma.correspondancePatient.findMany.mockResolvedValue([]);
    emettre.mockImplementation(async (id: string) => (id === 'PAT_2' ? null : `https://x/portail/lien/J_${id}`));
    envoyerEmail.mockImplementation(async ({ idPatient }: { idPatient: string }) => {
      if (idPatient === 'PAT_3') throw new Error('smtp down');
      return 'Envoye';
    });
    const res = await poster({ idsPatient: ['PAT_1', 'PAT_2', 'PAT_3'] });
    expect(await res.json()).toEqual({ ok: true, envoyes: 1, echoues: 2, ignores: 0 });
    // Sans lien, pas d'e-mail : il ne mènerait nulle part.
    expect(envoyerEmail).toHaveBeenCalledTimes(2);
  });
});
