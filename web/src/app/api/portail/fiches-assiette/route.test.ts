import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// La route du portail des fiches remises ([[D-251]] §7-§8, lot 9). Style
// « signature réelle » : on ne simule que Prisma et le service, et on forge un
// vrai cookie avec `signPatientSession` — neutraliser l'authentification par
// un mock ne la prouverait pas.

const { prisma, fichesRemisesAuPatient } = vi.hoisted(() => ({
  prisma: { patient: { findUnique: vi.fn() } },
  fichesRemisesAuPatient: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/fiches-assiette/servicePatient', () => ({ fichesRemisesAuPatient }));

import { signPatientSession } from '@/lib/patient-session';
import { GET } from './route';

const PATIENT = { idPatient: 'PAT_TEST', email: 'sophie.nicola@example.test' };

function compteActif(surcharges: Record<string, unknown> = {}): void {
  prisma.patient.findUnique.mockResolvedValue({
    idPatient: PATIENT.idPatient,
    actif: true,
    accessTokenRevoked: false,
    email: PATIENT.email,
    sessionsInvalidesAvant: null,
    createdAt: new Date('2026-06-01T08:00:00.000Z'),
    ...surcharges,
  });
}

function requete(avecCookie = true): Request {
  const cookie = signPatientSession({ idPatient: PATIENT.idPatient, email: PATIENT.email });
  return new Request('http://localhost/api/portail/fiches-assiette', {
    headers: avecCookie ? { cookie: `wn_portail=${encodeURIComponent(cookie)}` } : {},
  });
}

const FICHE = {
  idRemise: 'rem_1',
  libelle: 'Assiette synthétique',
  numero: 1,
  remiseLe: '2026-09-28T08:00:00.000Z',
  etat: 'servie',
  protocole: 'actuel',
  contenu: { titre: 'Titre', precautions: [], sections: [{ titre: 'Section', paragraphes: ['Paragraphe.'] }] },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NEXTAUTH_SECRET', 'secret-de-test-non-production');
  vi.stubEnv('WN_FICHES_ASSIETTE_LECTURE', 'true');
  compteActif();
  fichesRemisesAuPatient.mockResolvedValue([FICHE]);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('GET /api/portail/fiches-assiette — le drapeau de lecture d’abord', () => {
  it.each([undefined, '', 'TRUE', '1', 'oui'])('drapeau %s : 503, ni session ni base lues', async valeur => {
    if (valeur === undefined) vi.stubEnv('WN_FICHES_ASSIETTE_LECTURE', undefined as unknown as string);
    else vi.stubEnv('WN_FICHES_ASSIETTE_LECTURE', valeur);
    const res = await GET(requete());
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, reason: 'feature_disabled', error: 'Cet espace n’est pas encore ouvert.' });
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
    expect(fichesRemisesAuPatient).not.toHaveBeenCalled();
  });

  it('le drapeau d’ÉMISSION ouvert n’ouvre pas la lecture', async () => {
    vi.stubEnv('WN_FICHES_ASSIETTE', 'true');
    vi.stubEnv('WN_FICHES_ASSIETTE_LECTURE', undefined as unknown as string);
    const res = await GET(requete());
    expect(res.status).toBe(503);
    expect(fichesRemisesAuPatient).not.toHaveBeenCalled();
  });
});

describe('GET /api/portail/fiches-assiette — drapeau ouvert', () => {
  it('sans session : 401, rien n’est lu', async () => {
    const res = await GET(requete(false));
    expect(res.status).toBe(401);
    expect(fichesRemisesAuPatient).not.toHaveBeenCalled();
  });

  it.each([
    ['compte désactivé', { actif: false }],
    ['jeton révoqué', { accessTokenRevoked: true }],
  ])('%s : 403, rien n’est lu', async (_cas, surcharge) => {
    compteActif(surcharge);
    const res = await GET(requete());
    expect(res.status).toBe(403);
    expect(fichesRemisesAuPatient).not.toHaveBeenCalled();
  });

  it('sert les fiches du patient de la SESSION, sans exiger d’assignation', async () => {
    const res = await GET(requete());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, fiches: [FICHE] });
    expect(fichesRemisesAuPatient).toHaveBeenCalledWith('PAT_TEST');
  });

  it('une panne de la base PENDANT l’authentification rend 500, sans rien journaliser de la requête', async () => {
    const journal = vi.spyOn(console, 'error').mockImplementation(() => {});
    prisma.patient.findUnique.mockRejectedValue(new Error('AUTH-SENTINELLE'));
    const res = await GET(requete());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, reason: 'exception', error: 'Erreur technique.' });
    expect(fichesRemisesAuPatient).not.toHaveBeenCalled();
    const journalise = journal.mock.calls.flat().map(a => (a instanceof Error ? `${a.name}: ${a.message}` : String(a))).join(' ');
    expect(journalise).not.toContain('AUTH-SENTINELLE');
    journal.mockRestore();
  });

  it('une panne rend 500 sans rien dire de ce que la requête portait', async () => {
    const journal = vi.spyOn(console, 'error').mockImplementation(() => {});
    fichesRemisesAuPatient.mockRejectedValue(new Error('TEXTE-SENTINELLE'));
    const res = await GET(requete());
    expect(res.status).toBe(500);
    const corps = await res.json();
    expect(corps).toEqual({ ok: false, reason: 'exception', error: 'Erreur technique.' });
    // `JSON.stringify` d'une `Error` rend `{}` : on lit son message en clair.
    const journalise = journal.mock.calls.flat().map(a => (a instanceof Error ? `${a.name}: ${a.message}` : String(a))).join(' ');
    expect(journalise).not.toContain('TEXTE-SENTINELLE');
    journal.mockRestore();
  });
});
