import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EN_TETE_DOSSIER_PAGE, MESSAGE_AUTRE_DOSSIER } from '@/lib/portail/dossierPage';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    patient: { findUnique: vi.fn(), updateMany: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { signPatientSession } from '@/lib/patient-session';
import { POST } from './route';

/**
 * La même requête sous le segment donné (`null` : en-tête absent), et sans
 * cookie au besoin : la garde du dossier de la page ([[D-481]], DOC-14).
 */
function sousSegment(req: Request, segment: string | null, { sansCookie = false } = {}): Request {
  const entetes = new Headers(req.headers);
  if (segment === null) entetes.delete(EN_TETE_DOSSIER_PAGE);
  else entetes.set(EN_TETE_DOSSIER_PAGE, segment);
  if (sansCookie) entetes.delete('cookie');
  return new Request(req, { headers: entetes });
}

// D-284 §3, lot (h) : le patient donne sa date de naissance quand elle manque.
// Ce banc tient les trois promesses de la route — l'identité vient de la
// session, une date lisible ne s'écrase jamais, une date que la garde ne sait
// pas lire n'est pas enregistrée.

const patient = {
  idPatient: 'PAT_SOPHIE',
  email: 'sophie.nicola@example.test',
  prenom: 'Sophie',
  nom: 'Nicola',
  actif: true,
  accessTokenRevoked: false,
  sessionsInvalidesAvant: null,
  dateNaissance: null as string | null,
};

function requete(corps: unknown, avecSession = true): Request {
  const headers = new Headers({ 'content-type': 'application/json', [EN_TETE_DOSSIER_PAGE]: 'PAT_SOPHIE' });
  if (avecSession) {
    const jeton = signPatientSession({ idPatient: patient.idPatient, email: patient.email });
    headers.set('cookie', `wn_portail=${encodeURIComponent(jeton)}`);
  }
  return new Request('http://localhost/api/portail/date-naissance', {
    method: 'POST',
    headers,
    body: typeof corps === 'string' ? corps : JSON.stringify(corps),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
  prisma.patient.findUnique.mockResolvedValue({ ...patient });
  prisma.patient.updateMany.mockResolvedValue({ count: 1 });
});

describe('POST /api/portail/date-naissance', () => {
  it('sans session : 401, rien n’est écrit', async () => {
    const res = await POST(requete({ dateNaissance: '1985-03-12' }, false));
    expect(res.status).toBe(401);
    expect(prisma.patient.updateMany).not.toHaveBeenCalled();
  });

  // La garde du dossier de la page ([[D-481]], DOC-14).
  it('page ouverte sous un autre dossier, ou sans segment : 409 (T-51), rien d’écrit', async () => {
    for (const segment of ['PAT_AUTRE', null]) {
      const res = await POST(sousSegment(requete({ dateNaissance: '1985-03-12' }), segment));
      expect(res.status).toBe(409);
      expect(await res.json()).toEqual({ ok: false, reason: 'autre_dossier', error: MESSAGE_AUTRE_DOSSIER });
    }
    expect(prisma.patient.updateMany).not.toHaveBeenCalled();
  });

  it('sans session, le 401 passe avant la garde du dossier de la page', async () => {
    const res = await POST(sousSegment(requete({ dateNaissance: '1985-03-12' }), 'PAT_AUTRE', { sansCookie: true }));
    expect(res.status).toBe(401);
  });

  it('compte refusé (introuvable ou révoqué) : le 403 passe avant la garde du dossier de la page', async () => {
    prisma.patient.findUnique.mockReset();
    prisma.patient.findUnique.mockResolvedValue(null);
    const res = await POST(sousSegment(requete({ dateNaissance: '1985-03-12' }), 'PAT_AUTRE'));
    expect(res.status).toBe(403);
  });

  it('★ écrit la date au dossier DE LA SESSION, seulement si elle manque encore, et rend « majeur »', async () => {
    const res = await POST(requete({ dateNaissance: '1985-03-12', idPatient: 'PAT_AUTRE' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, statutAge: 'majeur', trancheMineur: null });
    expect(prisma.patient.updateMany).toHaveBeenCalledWith({
      where: { idPatient: 'PAT_SOPHIE', dateNaissance: null },
      data: { dateNaissance: '1985-03-12' },
    });
  });

  it('une date de mineur s’enregistre et rend « mineur » : la pause continue (D-284 §4)', async () => {
    const quinzeAns = new Date(Date.now() - 15 * 366 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const res = await POST(requete({ dateNaissance: quinzeAns }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, statutAge: 'mineur', trancheMineur: '15_17' });
  });

  it('une date de moins de 15 ans rend sa tranche : la variante du texte 2B (D-537 §7)', async () => {
    const douzeAns = new Date(Date.now() - 12 * 366 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const res = await POST(requete({ dateNaissance: douzeAns }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, statutAge: 'mineur', trancheMineur: 'moins_15' });
  });

  it('★ une date lisible déjà au dossier ne s’écrase pas : 409, rien n’est écrit', async () => {
    // Sans cette règle, un mineur se déclarerait majeur d'un geste.
    prisma.patient.findUnique.mockResolvedValue({ ...patient, dateNaissance: '2012-05-01' });
    const res = await POST(requete({ dateNaissance: '1985-03-12' }));
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('deja_renseignee');
    expect(prisma.patient.updateMany).not.toHaveBeenCalled();
  });

  it('une date ILLISIBLE au dossier vaut une date manquante : elle se remplace, sous condition', async () => {
    prisma.patient.findUnique.mockResolvedValue({ ...patient, dateNaissance: '1985-02-31' });
    const res = await POST(requete({ dateNaissance: '1985-03-12' }));
    expect(res.status).toBe(200);
    expect(prisma.patient.updateMany.mock.calls[0][0].where).toEqual({
      idPatient: 'PAT_SOPHIE',
      dateNaissance: '1985-02-31',
    });
  });

  it('★ refuse une date future, irréelle, hors format ou antérieure à 1900 — rien n’est écrit', async () => {
    for (const dateNaissance of ['2099-01-01', '1985-02-31', '12/03/1985', '1899-12-31', '', 42, null]) {
      const res = await POST(requete({ dateNaissance }));
      expect(res.status, String(dateNaissance)).toBe(400);
    }
    expect(prisma.patient.updateMany).not.toHaveBeenCalled();
  });

  it('une écriture concurrente gagne : 409 au second, sans écrasement', async () => {
    prisma.patient.updateMany.mockResolvedValue({ count: 0 });
    const res = await POST(requete({ dateNaissance: '1985-03-12' }));
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('deja_renseignee');
  });

  it('★ dossier clos : 409, rien n’est écrit — il ne recueille plus rien', async () => {
    prisma.patient.findUnique.mockResolvedValue({ ...patient, suiviClotureLe: new Date('2026-10-01T00:00:00Z') });
    const res = await POST(requete({ dateNaissance: '1985-03-12' }));
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('dossier_cloture');
    expect(prisma.patient.updateMany).not.toHaveBeenCalled();
  });

  it('corps illisible : 400', async () => {
    const res = await POST(requete('{pas du json'));
    expect(res.status).toBe(400);
  });
});
