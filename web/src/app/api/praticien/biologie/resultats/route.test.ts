import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    biologyAnalyte: { findUnique: vi.fn() },
    resultatBiologique: { findMany: vi.fn(), create: vi.fn() },
    journalAccesDossier: { create: vi.fn(), deleteMany: vi.fn() },
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { GET, POST } from './route';

const URL_BASE = 'http://localhost/api/praticien/biologie/resultats';
const PRATICIEN = 'praticien@wellneuro.fr';

function getRequest(idPatient: string): Request {
  return new Request(`${URL_BASE}?idPatient=${idPatient}`);
}

function postRequest(body: unknown): Request {
  return new Request(URL_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const LIGNE_CONSIGNEE = {
  id: 'res1',
  analyteCode: 'BIO_FERRITINE',
  valeur: 42.5,
  unite: 'µg/L',
  preleveLe: new Date('2026-09-01T08:00:00.000Z'),
  source: 'saisie_praticien',
  analyte: { libelle: 'Ferritine' },
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.WN_CB_ENABLED = 'true';
  process.env.WN_CB_RESULTS_ENABLED = 'true';
  getServerSession.mockResolvedValue({ user: { email: PRATICIEN } });
  prisma.patient.findUnique.mockResolvedValue({
    praticienEmail: PRATICIEN,
    actif: true,
    suiviClotureLe: null,
  });
  prisma.biologyAnalyte.findUnique.mockResolvedValue({
    code: 'BIO_FERRITINE',
    libelle: 'Ferritine',
    unite: 'µg/L',
    actif: true,
  });
  prisma.resultatBiologique.findMany.mockResolvedValue([LIGNE_CONSIGNEE]);
  prisma.resultatBiologique.create.mockResolvedValue(LIGNE_CONSIGNEE);
});

afterEach(() => {
  delete process.env.WN_CB_ENABLED;
  delete process.env.WN_CB_RESULTS_ENABLED;
});

describe('drapeau étage 2 — fail-closed des DEUX côtés (D-081, D-122 §2)', () => {
  it('GET : drapeau résultats absent → 503, rien n’est lu ni journalisé', async () => {
    delete process.env.WN_CB_RESULTS_ENABLED;
    const response = await GET(getRequest('PAT1'));
    expect(response.status).toBe(503);
    expect(prisma.resultatBiologique.findMany).not.toHaveBeenCalled();
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });

  it('POST : le rayon seul ne suffit pas — il faut les DEUX drapeaux', async () => {
    delete process.env.WN_CB_RESULTS_ENABLED;
    const response = await POST(postRequest({ idPatient: 'PAT1' }));
    expect(response.status).toBe(503);
    expect(prisma.resultatBiologique.create).not.toHaveBeenCalled();
  });

  it('POST : le drapeau résultats sans le rayon ne suffit pas non plus', async () => {
    delete process.env.WN_CB_ENABLED;
    const response = await POST(postRequest({ idPatient: 'PAT1' }));
    expect(response.status).toBe(503);
  });
});

describe('GET — la série du dossier, journalisée (GD-1)', () => {
  it('rend la série avec libellé, unité et horodatage ISO', async () => {
    const response = await GET(getRequest('PAT1'));
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.resultats).toEqual([
      {
        id: 'res1',
        analyteCode: 'BIO_FERRITINE',
        analyteLibelle: 'Ferritine',
        valeur: 42.5,
        unite: 'µg/L',
        preleveLe: '2026-09-01T08:00:00.000Z',
        source: 'saisie_praticien',
      },
    ]);
  });

  it('lire des données de santé nommées journalise l’accès une fois', async () => {
    await GET(getRequest('PAT1'));
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledTimes(1);
  });

  it('le POST, lui, ne journalise PAS : il ne lit rien du dossier (GD-1 sans fausse ligne)', async () => {
    await POST(postRequest({
      idPatient: 'PAT1', analyteCode: 'BIO_FERRITINE', valeur: 42.5,
      preleveLe: '2026-09-01T08:00:00.000Z',
    }));
    // L'écriture est tracée par la ligne consignée (saisi_par, saisi_le) —
    // une entrée de journal de LECTURE serait un accès qui n'a pas eu lieu.
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });

  it('sans session : 401', async () => {
    getServerSession.mockResolvedValue(null);
    const response = await GET(getRequest('PAT1'));
    expect(response.status).toBe(401);
  });
});

describe('POST — la saisie praticien, bornée par le serveur', () => {
  const SAISIE = {
    idPatient: 'PAT1',
    analyteCode: 'BIO_FERRITINE',
    valeur: 42.5,
    preleveLe: '2026-09-01T08:00:00.000Z',
  };

  it('consigne avec l’unité DE L’ANALYTE, la source et l’auteur posés serveur', async () => {
    const response = await POST(postRequest({ ...SAISIE, unite: 'mg/dL', source: 'import_labo', saisiPar: 'intrus@x.fr' }));
    expect(response.status).toBe(201);
    const data = prisma.resultatBiologique.create.mock.calls[0][0].data;
    // L'unité vient du catalogue — celle du client est ignorée (concordance
    // par construction, frontière PR #838).
    expect(data.unite).toBe('µg/L');
    expect(data.source).toBe('saisie_praticien');
    expect(data.saisiPar).toBe(PRATICIEN);
  });

  it('analyte inconnu au catalogue : 409, rien n’est consigné', async () => {
    prisma.biologyAnalyte.findUnique.mockResolvedValue(null);
    const response = await POST(postRequest(SAISIE));
    expect(response.status).toBe(409);
    expect((await response.json()).reason).toBe('analyte_inconnu');
    expect(prisma.resultatBiologique.create).not.toHaveBeenCalled();
  });

  it('analyte inactif : 409 — pas de nouvelle mesure sur une fiche retirée', async () => {
    prisma.biologyAnalyte.findUnique.mockResolvedValue({
      code: 'BIO_FERRITINE', libelle: 'Ferritine', unite: 'µg/L', actif: false,
    });
    const response = await POST(postRequest(SAISIE));
    expect(response.status).toBe(409);
    expect((await response.json()).reason).toBe('analyte_inactif');
  });

  it('une valeur en CHAÎNE (« 42.5 ») est refusée au niveau route : 400', async () => {
    const response = await POST(postRequest({ ...SAISIE, valeur: '42.5' }));
    expect(response.status).toBe(400);
    expect((await response.json()).reason).toBe('valeur_invalide');
  });

  it('une valeur au-delà de la capacité DECIMAL(65,30) : 400 motivé, jamais un 500 opaque', async () => {
    const response = await POST(postRequest({ ...SAISIE, valeur: 1e40 }));
    expect(response.status).toBe(400);
    expect((await response.json()).reason).toBe('valeur_hors_capacite');
  });

  it('un analyte sans unité au catalogue se consigne SANS unité — jamais une unité inventée', async () => {
    prisma.biologyAnalyte.findUnique.mockResolvedValue({
      code: 'BIO_NFS', libelle: 'NFS', unite: null, actif: true,
    });
    const response = await POST(postRequest({ ...SAISIE, analyteCode: 'BIO_NFS' }));
    expect(response.status).toBe(201);
    expect(prisma.resultatBiologique.create.mock.calls[0][0].data.unite).toBeNull();
  });

  it('date de prélèvement future (au-delà de 24 h) : 400 motivé', async () => {
    const futur = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
    const response = await POST(postRequest({ ...SAISIE, preleveLe: futur }));
    expect(response.status).toBe(400);
    expect((await response.json()).reason).toBe('date_future');
  });

  it('doublon exact (patient, analyte, horodatage) : 409 propre, l’heure est nommée', async () => {
    prisma.resultatBiologique.create.mockRejectedValue(
      Object.assign(new Error('doublon'), { code: 'P2002' }),
    );
    const response = await POST(postRequest(SAISIE));
    expect(response.status).toBe(409);
    const payload = await response.json();
    expect(payload.reason).toBe('doublon_mesure');
    expect(payload.error).toContain('l’heure');
  });

  it('dossier clos : refusé dans la route, rien n’est consigné', async () => {
    prisma.patient.findUnique.mockResolvedValue({
      praticienEmail: PRATICIEN,
      actif: false,
      suiviClotureLe: '2026-08-01T00:00:00.000Z',
    });
    const response = await POST(postRequest(SAISIE));
    expect(response.status).toBe(409);
    expect(prisma.resultatBiologique.create).not.toHaveBeenCalled();
  });

  it('un corps JSON `null` est un 400, jamais un 500 pré-auth', async () => {
    const response = await POST(postRequest(null));
    expect(response.status).toBe(400);
  });

  it('patient d’un autre praticien : 403, l’analyte n’est même pas lu', async () => {
    prisma.patient.findUnique.mockResolvedValue({
      praticienEmail: 'autre@wellneuro.fr',
      actif: true,
      suiviClotureLe: null,
    });
    const response = await POST(postRequest(SAISIE));
    expect(response.status).toBe(403);
    expect(prisma.biologyAnalyte.findUnique).not.toHaveBeenCalled();
  });

  it('une consignation qui lève ne journalise JAMAIS la valeur mesurée', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    prisma.resultatBiologique.create.mockRejectedValue(
      Object.assign(new Error('Invalid value: 42.5 µg/L'), {
        name: 'PrismaClientValidationError',
      }),
    );
    const response = await POST(postRequest(SAISIE));
    expect(response.status).toBe(500);
    const journalise = spy.mock.calls.flat().join(' ');
    expect(journalise).not.toContain('42.5');
    spy.mockRestore();
  });
});
