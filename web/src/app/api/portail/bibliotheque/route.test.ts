import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

const { authentifierPatientPortail, aDesFichesRemises } = vi.hoisted(() => ({
  authentifierPatientPortail: vi.fn(),
  aDesFichesRemises: vi.fn(),
}));
vi.mock('@/lib/trust/portailAuth', () => ({ authentifierPatientPortail }));
vi.mock('@/lib/fiches-assiette/servicePatient', () => ({ aDesFichesRemises }));

import { GET } from './route';

// La route de « Ma bibliothèque » ([[D-357]]) : drapeau d'abord, puis la
// session, puis la garde d'âge (§5) ; elle ne sert aucun document, seulement
// les rayons qui ont quelque chose à montrer.

const requete = () => new Request('http://localhost/api/portail/bibliotheque');

beforeEach(() => {
  vi.stubEnv('WN_PORTAIL_BIBLIOTHEQUE', 'true');
  vi.stubEnv('WN_FICHES_ASSIETTE_LECTURE', 'true');
  authentifierPatientPortail.mockResolvedValue({ patient: { idPatient: 'PAT_SOPHIE', dateNaissance: '1979-07-28' } });
  aDesFichesRemises.mockResolvedValue(true);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('GET /api/portail/bibliotheque', () => {
  it.each(['', 'TRUE', '1'])('drapeau « %s » : 404, sans lire la session', async valeur => {
    vi.stubEnv('WN_PORTAIL_BIBLIOTHEQUE', valeur);
    const res = await GET(requete());
    expect(res.status).toBe(404);
    expect(authentifierPatientPortail).not.toHaveBeenCalled();
    expect(aDesFichesRemises).not.toHaveBeenCalled();
  });

  it('sans session : la réponse de l’authentification, sans rien lire', async () => {
    authentifierPatientPortail.mockResolvedValue({
      erreur: NextResponse.json({ ok: false, reason: 'unauthenticated', error: 'x' }, { status: 401 }),
    });
    const res = await GET(requete());
    expect(res.status).toBe(401);
    expect(aDesFichesRemises).not.toHaveBeenCalled();
  });

  it.each([
    ['mineur', '2015-03-01'],
    ['date manquante', null],
  ])('dossier %s : 409, sans rien lire — dossiers majeurs seuls (D-357 §5)', async (_cas, dateNaissance) => {
    authentifierPatientPortail.mockResolvedValue({ patient: { idPatient: 'PAT_MICHEL', dateNaissance } });
    const res = await GET(requete());
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ ok: false, reason: 'hors_majeur' });
    expect(aDesFichesRemises).not.toHaveBeenCalled();
  });

  it.each([true, false])('dossier majeur : dit seulement si une fiche a été remise (%s), sans servir de document', async remise => {
    aDesFichesRemises.mockResolvedValue(remise);
    const res = await GET(requete());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, ouvert: true, fichesRemises: remise });
    expect(aDesFichesRemises).toHaveBeenCalledWith('PAT_SOPHIE');
  });

  it('lecture des fiches fermée : le rayon des documents remis est vide, sans lire la base', async () => {
    vi.stubEnv('WN_FICHES_ASSIETTE_LECTURE', '');
    const res = await GET(requete());
    expect(await res.json()).toEqual({ ok: true, ouvert: true, fichesRemises: false });
    expect(aDesFichesRemises).not.toHaveBeenCalled();
  });

  it('panne : 500, la classe seule au journal', async () => {
    const journal = vi.spyOn(console, 'error').mockImplementation(() => {});
    aDesFichesRemises.mockRejectedValue(new TypeError('PAT_SOPHIE dans le message'));
    const res = await GET(requete());
    expect(res.status).toBe(500);
    expect(journal.mock.calls.flat().join(' ')).not.toContain('PAT_SOPHIE');
    journal.mockRestore();
  });
});
