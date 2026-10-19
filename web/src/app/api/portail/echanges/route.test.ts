import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

const { authentifierPatientPortail, sourcesMesEchanges } = vi.hoisted(() => ({
  authentifierPatientPortail: vi.fn(),
  sourcesMesEchanges: vi.fn(),
}));
vi.mock('@/lib/trust/portailAuth', () => ({ authentifierPatientPortail }));
vi.mock('@/lib/portail/mesEchangesServeur', () => ({ sourcesMesEchanges }));

import { GET } from './route';

// La route de « Mes échanges » ([[D-293]]) : drapeau d'abord, puis la session ;
// le dossier vient de la session, jamais du client ; aucune donnée ne voyage
// en mode interrupteur.

const VIDE = {
  bilan: null,
  fiches: [],
  lettre: null,
  protocole: null,
  questionnaires: [],
  comptesRendus: [],
  documentsDeposes: [],
  signalements: [],
};

const requete = (suffixe = '') => new Request(`http://localhost/api/portail/echanges${suffixe}`);

beforeEach(() => {
  vi.stubEnv('WN_PORTAIL_MES_ECHANGES', 'true');
  authentifierPatientPortail.mockResolvedValue({ patient: { idPatient: 'PAT_SOPHIE', dateNaissance: '1979-07-28' } });
  sourcesMesEchanges.mockResolvedValue(VIDE);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('GET /api/portail/echanges', () => {
  it.each(['', 'TRUE', '1'])('drapeau « %s » : 404, sans lire la session', async valeur => {
    vi.stubEnv('WN_PORTAIL_MES_ECHANGES', valeur);
    const res = await GET(requete());
    expect(res.status).toBe(404);
    expect(authentifierPatientPortail).not.toHaveBeenCalled();
    expect(sourcesMesEchanges).not.toHaveBeenCalled();
  });

  it('sans session : la réponse de l’authentification, sans rien lire', async () => {
    authentifierPatientPortail.mockResolvedValue({
      erreur: NextResponse.json({ ok: false, reason: 'unauthenticated', error: 'x' }, { status: 401 }),
    });
    const res = await GET(requete());
    expect(res.status).toBe(401);
    expect(sourcesMesEchanges).not.toHaveBeenCalled();
  });

  it('compte refusé (403) : la réponse de l’authentification, sans rien lire', async () => {
    authentifierPatientPortail.mockResolvedValue({
      erreur: NextResponse.json({ ok: false, reason: 'forbidden', error: 'x' }, { status: 403 }),
    });
    const res = await GET(requete());
    expect(res.status).toBe(403);
    expect(sourcesMesEchanges).not.toHaveBeenCalled();
  });

  it.each([
    ['mineur', '2015-03-01'],
    ['date manquante', null],
  ])('dossier %s : 409, ni lien ni journal — surface neuve réservée au majeur (D-283 §5)', async (_cas, dateNaissance) => {
    authentifierPatientPortail.mockResolvedValue({ patient: { idPatient: 'PAT_MICHEL', dateNaissance } });
    for (const suffixe of ['', '?interrupteur=1']) {
      const res = await GET(requete(suffixe));
      expect(res.status).toBe(409);
      expect((await res.json()).ok).toBe(false);
    }
    expect(sourcesMesEchanges).not.toHaveBeenCalled();
  });

  it('le protocole ne livre pas l’identifiant de son approbation au navigateur', async () => {
    sourcesMesEchanges.mockResolvedValue({
      ...VIDE,
      protocole: { approbationId: 'APPROBATION_SECRETE', approuveLe: new Date('2026-10-04T08:00:00Z') },
    });
    const res = await GET(requete());
    expect(JSON.stringify(await res.json())).not.toContain('APPROBATION_SECRETE');
  });

  it('interrupteur : « ouvert », sans aucune lecture du dossier', async () => {
    const res = await GET(requete('?interrupteur=1'));
    expect(await res.json()).toEqual({ ok: true, ouvert: true });
    expect(sourcesMesEchanges).not.toHaveBeenCalled();
  });

  it('lit le dossier de la SESSION, et rend les entrées', async () => {
    sourcesMesEchanges.mockResolvedValue({
      ...VIDE,
      bilan: { id: 'env_1', envoyeLe: new Date('2026-10-01T08:00:00Z') },
    });
    const res = await GET(requete('?idPatient=PAT_AUTRE'));
    expect(sourcesMesEchanges).toHaveBeenCalledWith('PAT_SOPHIE');
    const corps = await res.json();
    expect(corps.ok).toBe(true);
    expect(corps.entrees).toEqual([
      expect.objectContaining({ cle: 'bilan:env_1', sens: 'remis', objet: 'Votre bilan', chemin: 'bilan' }),
    ]);
  });

  it('jour d’ouverture posé avec le drapeau des fiches : la remise antérieure le porte (t14)', async () => {
    vi.stubEnv('WN_FICHES_ASSIETTE_LECTURE_OUVERT_LE', '2026-10-02');
    vi.stubEnv('WN_LETTRE_ADRESSAGE_PATIENT_OUVERT_LE', 'pas une date');
    sourcesMesEchanges.mockResolvedValue({
      ...VIDE,
      fiches: [{ idRemise: 'rem_1', libelle: 'Petit-déjeuner', remiseLe: new Date('2026-09-20T08:00:00Z') }],
      lettre: { id: 'let_1', remiseLe: new Date('2026-09-20T08:00:00Z') },
    });
    const corps = await (await GET(requete())).json();
    const parCle = Object.fromEntries(corps.entrees.map((e: { cle: string }) => [e.cle, e]));
    expect(parCle['fiche_assiette:rem_1'].afficheDepuis).toBe('2026-10-02');
    expect(parCle['lettre_adressage:let_1'].afficheDepuis).toBeUndefined();
  });

  it('lecture en échec : 500, sans détail', async () => {
    sourcesMesEchanges.mockRejectedValue(new Error('base indisponible'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await GET(requete());
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('base indisponible');
  });
});
