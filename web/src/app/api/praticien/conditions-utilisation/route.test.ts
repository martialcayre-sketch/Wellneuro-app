import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma, emettre, envoyerEmail, reserver, solder } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findMany: vi.fn() },
    trustAcknowledgement: { findMany: vi.fn() },
  },
  emettre: vi.fn(),
  envoyerEmail: vi.fn(),
  reserver: vi.fn(),
  solder: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/portail/emissionLienMagique', () => ({ emettreLienMagiquePourPraticien: emettre }));
vi.mock('@/lib/consultation/email', () => ({ sendConditionsUtilisationEmail: envoyerEmail }));
vi.mock('@/lib/trust/annonceConditions', async orig => ({
  ...(await orig<typeof import('@/lib/trust/annonceConditions')>()),
  reserverAnnonceConditions: reserver,
  solderAnnonceConditions: solder,
}));

import { GET, POST } from './route';

// [[D-292]] §3 — l'envoi des conditions aux patients suivis, geste unique du
// cockpit : la liste et l'aperçu (GET), puis l'envoi confirmé (POST), par
// lots, qui relit l'éligibilité en base, RÉSERVE chaque dossier avant d'envoyer
// et n'écrit à personne d'autre.

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
  const dossiers = [
    patient(),
    patient({ idPatient: 'PAT_2', prenom: 'Jennifer', nom: 'Martin', email: 'jennifer.martin@fictif.wellneuro.fr' }),
    patient({ idPatient: 'PAT_3', prenom: 'Michel', nom: 'Dogné', email: 'michel.dogne@fictif.wellneuro.fr' }),
  ];
  // La restriction aux dossiers confirmés est appliquée comme la base le ferait.
  prisma.patient.findMany.mockImplementation(async ({ where }: { where: { idPatient?: { in: string[] } } }) =>
    where.idPatient ? dossiers.filter(d => where.idPatient!.in.includes(d.idPatient)) : dossiers,
  );
  // PAT_1 et PAT_2 suivis ; PAT_3 nouveau (aucun accusé) : il lira les conditions à l'accueil.
  prisma.trustAcknowledgement.findMany.mockResolvedValue([suivi('PAT_1'), suivi('PAT_2')]);
  reserver.mockImplementation(async (id: string) => `cp_${id}`);
  solder.mockResolvedValue(undefined);
  emettre.mockImplementation(async (id: string) => `https://app.wellneuro.fr/portail/lien/J_${id}?vers=conditions`);
  envoyerEmail.mockResolvedValue('Envoye');
});

afterEach(() => vi.unstubAllEnvs());

describe('GET /api/praticien/conditions-utilisation', () => {
  it('sans session : 401', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
  });

  it('liste les seuls dossiers éligibles du praticien, avec l’aperçu et la taille des lots', async () => {
    const corps = await (await GET()).json();
    expect(corps).toMatchObject({ ok: true, ouvert: true, tronque: false, parEnvoi: 10 });
    expect(corps.eligibles).toEqual([
      { idPatient: 'PAT_1', prenom: 'Sophie', nom: 'Nicola' },
      { idPatient: 'PAT_2', prenom: 'Jennifer', nom: 'Martin' },
    ]);
    expect(corps.apercu.sujet).toBe('Wellneuro — les conditions d’utilisation de votre espace évoluent');
    expect(corps.apercu.corps).toContain('ouvrez ce lien : [lien personnel]');
  });

  it('la lecture exclut EN SQL ce qui peut l’être, réservations comprises, pour que le plafond ne coupe que des candidats', async () => {
    await GET();
    const where = prisma.patient.findMany.mock.calls[0][0].where;
    expect(where.praticienEmail).toEqual({ equals: 'praticien@wellneuro.fr', mode: 'insensitive' });
    expect(where).toMatchObject({ actif: true, accessTokenRevoked: false, suiviClotureLe: null });
    expect(where.correspondancesPatient.none).toMatchObject({
      sourceType: 'conditions_utilisation',
      referenceId: expect.stringMatching(/^conditions_utilisation@/),
      sourceId: { not: null },
    });
    expect(where.trustAcknowledgements.none).toMatchObject({
      documentKey: 'conditions_utilisation',
      type: 'pris_connaissance',
    });
    // Revue CodeRabbit de #1503 : le statut « suivi » et la date se filtrent
    // AVANT le plafond — seul l'âge reste calculé après la lecture.
    expect(where.dateNaissance).toEqual({ not: null });
    expect(where.trustAcknowledgements.some).toEqual({
      type: 'pris_connaissance',
      documentKey: {
        in: ['cadre_accompagnement', 'limites_securite', 'donnees_confidentialite', 'usage_ia', 'conditions_utilisation'],
      },
    });
  });

  it('plafond atteint : la liste le dit', async () => {
    prisma.patient.findMany.mockResolvedValue(
      Array.from({ length: 300 }, (_, i) => patient({ idPatient: `PAT_${i}` })),
    );
    prisma.trustAcknowledgement.findMany.mockResolvedValue([]);
    expect((await (await GET()).json()).tronque).toBe(true);
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
  it('sans session : 401, rien réservé ni émis', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await poster({ idsPatient: ['PAT_1'] })).status).toBe(401);
    expect(reserver).not.toHaveBeenCalled();
    expect(emettre).not.toHaveBeenCalled();
  });

  it('drapeau fermé : 409, rien réservé ni émis', async () => {
    vi.stubEnv('WN_PORTAIL_CONDITIONS', '');
    expect((await poster({ idsPatient: ['PAT_1'] })).status).toBe(409);
    expect(reserver).not.toHaveBeenCalled();
  });

  it('sans messagerie : 503, rien réservé, AUCUN lien émis', async () => {
    vi.stubEnv('SMTP_URL', '');
    expect((await poster({ idsPatient: ['PAT_1'] })).status).toBe(503);
    expect(reserver).not.toHaveBeenCalled();
    expect(emettre).not.toHaveBeenCalled();
  });

  it.each([
    [{}],
    [{ idsPatient: [] }],
    [{ idsPatient: 'PAT_1' }],
    [{ idsPatient: [42] }],
    [{ idsPatient: [''] }],
    [{ idsPatient: Array.from({ length: 11 }, (_, i) => `PAT_${i}`) }],
  ])('corps invalide %j : 400', async corps => {
    expect((await poster(corps)).status).toBe(400);
    expect(reserver).not.toHaveBeenCalled();
  });

  it('relit l’éligibilité au praticien en session et aux seuls dossiers confirmés', async () => {
    await poster({ idsPatient: ['PAT_1', 'PAT_2', 'PAT_3', 'PAT_1'] });
    const where = prisma.patient.findMany.mock.calls[0][0].where;
    expect(where.praticienEmail).toEqual({ equals: 'praticien@wellneuro.fr', mode: 'insensitive' });
    expect(where.idPatient).toEqual({ in: ['PAT_1', 'PAT_2', 'PAT_3'] });
  });

  it('réserve, émet un lien vers la page des conditions, envoie, puis solde — dans cet ordre', async () => {
    const res = await poster({ idsPatient: ['PAT_1', 'PAT_3'] });
    // PAT_3 n'est pas suivi : ignoré, rien réservé pour lui.
    expect(await res.json()).toEqual({ ok: true, envoyes: 1, echoues: 0, ignores: 1 });
    expect(reserver).toHaveBeenCalledTimes(1);
    expect(reserver).toHaveBeenCalledWith('PAT_1');
    expect(emettre).toHaveBeenCalledWith('PAT_1', 'praticien@wellneuro.fr', 'conditions');
    expect(envoyerEmail).toHaveBeenCalledWith({
      patientEmail: 'sophie.nicola@fictif.wellneuro.fr',
      lien: 'https://app.wellneuro.fr/portail/lien/J_PAT_1?vers=conditions',
      praticienEmail: 'praticien@wellneuro.fr',
    });
    expect(solder).toHaveBeenCalledWith('cp_PAT_1', 'Envoye');
    const ordre = (fn: { mock: { invocationCallOrder: number[] } }) => fn.mock.invocationCallOrder[0];
    expect(ordre(reserver)).toBeLessThan(ordre(emettre));
    expect(ordre(emettre)).toBeLessThan(ordre(envoyerEmail));
    expect(ordre(envoyerEmail)).toBeLessThan(ordre(solder));
  });

  // LE P1 DE LA REVUE : un second POST (délai dépassé, deux onglets) ne doit
  // pas renvoyer. La réservation est prise par le premier : rien ne part.
  it('dossier déjà réservé par un envoi concurrent : ni lien, ni e-mail', async () => {
    reserver.mockResolvedValue(null);
    const res = await poster({ idsPatient: ['PAT_1', 'PAT_2'] });
    expect(await res.json()).toEqual({ ok: true, envoyes: 0, echoues: 0, ignores: 2 });
    expect(emettre).not.toHaveBeenCalled();
    expect(envoyerEmail).not.toHaveBeenCalled();
  });

  it('un échec libère sa réservation et n’arrête pas les suivants', async () => {
    prisma.trustAcknowledgement.findMany.mockResolvedValue([suivi('PAT_1'), suivi('PAT_2'), suivi('PAT_3')]);
    emettre.mockImplementation(async (id: string) => (id === 'PAT_2' ? null : `https://x/portail/lien/J_${id}`));
    envoyerEmail.mockImplementation(async ({ patientEmail }: { patientEmail: string }) => {
      if (patientEmail.startsWith('michel')) throw new Error('smtp down');
      return 'Envoye';
    });
    const res = await poster({ idsPatient: ['PAT_1', 'PAT_2', 'PAT_3'] });
    expect(await res.json()).toEqual({ ok: true, envoyes: 1, echoues: 2, ignores: 0 });
    // Sans lien, pas d'e-mail : il ne mènerait nulle part.
    expect(envoyerEmail).toHaveBeenCalledTimes(2);
    expect(solder).toHaveBeenCalledWith('cp_PAT_1', 'Envoye');
    expect(solder).toHaveBeenCalledWith('cp_PAT_2', 'Erreur', 'lien non émis');
    expect(solder).toHaveBeenCalledWith('cp_PAT_3', 'Erreur', expect.any(Error));
  });

  it('une réservation impossible (base) compte en échec, sans lien ni e-mail', async () => {
    reserver.mockRejectedValue(new Error('base indisponible'));
    const res = await poster({ idsPatient: ['PAT_1'] });
    expect(await res.json()).toEqual({ ok: true, envoyes: 0, echoues: 1, ignores: 0 });
    expect(emettre).not.toHaveBeenCalled();
  });
});
