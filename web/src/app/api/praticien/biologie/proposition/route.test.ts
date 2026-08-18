import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma, deriverPropositionPourPatient } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    biologyPanel: { findUnique: vi.fn() },
    panelBiologieDocumente: { findMany: vi.fn(), upsert: vi.fn() },
    journalAccesDossier: { create: vi.fn(), deleteMany: vi.fn() },
  },
  deriverPropositionPourPatient: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/biology-library/propositionService', () => ({ deriverPropositionPourPatient }));

import { GET, POST } from './route';

const URL_BASE = 'http://localhost/api/praticien/biologie/proposition';
const PRATICIEN = 'praticien@wellneuro.fr';

function getRequest(query = 'idPatient=PAT_TEST'): Request {
  return new Request(`${URL_BASE}?${query}`);
}

function postRequest(body: unknown): Request {
  return new Request(URL_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.WN_CB_ENABLED = 'true';
  process.env.WN_CB_PROPOSITION = 'true';
  getServerSession.mockResolvedValue({ user: { email: PRATICIEN } });
  prisma.patient.findUnique.mockResolvedValue({
    praticienEmail: PRATICIEN,
    actif: true,
    suiviClotureLe: null,
  });
  prisma.panelBiologieDocumente.findMany.mockResolvedValue([]);
  prisma.biologyPanel.findUnique.mockResolvedValue({ code: 'PANEL_A' });
  deriverPropositionPourPatient.mockResolvedValue({
    ok: true,
    proposition: { ok: true, lignes: [] },
    limites: [{ type: 'remboursement_non_evalue' }],
  });
});

afterEach(() => {
  delete process.env.WN_CB_ENABLED;
  delete process.env.WN_CB_PROPOSITION;
});

describe('drapeau — fail-closed, et AVANT toute lecture du dossier', () => {
  it('WN_CB_PROPOSITION absent : 503, aucun accès journalisé', async () => {
    delete process.env.WN_CB_PROPOSITION;
    const response = await GET(getRequest());
    expect(response.status).toBe(503);
    // L'ordre n'est pas décoratif : `verifierAppartenancePatient` journalise
    // l'accès. Testé après elle, le drapeau ferait consigner un accès qui n'a
    // pas eu lieu.
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });

  it('WN_CB_ENABLED éteint : 503 même si WN_CB_PROPOSITION est posé', async () => {
    process.env.WN_CB_ENABLED = 'false';
    const response = await GET(getRequest());
    expect(response.status).toBe(503);
  });

  it('« TRUE » n’est pas « true » : le drapeau reste fermé', async () => {
    process.env.WN_CB_PROPOSITION = 'TRUE';
    const response = await GET(getRequest());
    expect(response.status).toBe(503);
  });
});

describe('gardes d’accès', () => {
  // `PostBody` est un cast, pas une validation : un champ mal typé ferait
  // lever `.trim()` AVANT le test du drapeau, et la route rendrait 500 là où
  // elle doit rendre 503 — se distinguant ainsi d'une route fermée.
  it('un corps mal typé ne casse pas l’ordre fail-closed', async () => {
    delete process.env.WN_CB_PROPOSITION;
    const response = await POST(postRequest({ idPatient: 123 }));
    expect(response.status).toBe(503);
  });

  it('sans session : 401, sans lire le dossier', async () => {
    getServerSession.mockResolvedValue(null);
    const response = await GET(getRequest());
    expect(response.status).toBe(401);
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
  });

  it('identifiant patient hors forme : 400', async () => {
    const response = await GET(getRequest('idPatient=PAT%20TEST'));
    expect(response.status).toBe(400);
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
  });

  it('patient inconnu : 404', async () => {
    prisma.patient.findUnique.mockResolvedValue(null);
    const response = await GET(getRequest());
    expect(response.status).toBe(404);
  });

  it('patient d’un autre praticien : 403, et rien n’est dérivé', async () => {
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'autre@wellneuro.fr' });
    const response = await GET(getRequest());
    expect(response.status).toBe(403);
    expect(deriverPropositionPourPatient).not.toHaveBeenCalled();
  });
});

describe('GET — la proposition', () => {
  it('rend lignes, limites et déclarations', async () => {
    prisma.panelBiologieDocumente.findMany.mockResolvedValue([
      {
        panelCode: 'PANEL_A',
        documenteLe: new Date('2026-08-01T00:00:00.000Z'),
        declarePar: PRATICIEN,
        declareLe: new Date('2026-08-02T00:00:00.000Z'),
      },
    ]);
    const response = await GET(getRequest());
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.limites).toEqual([{ type: 'remboursement_non_evalue' }]);
    expect(payload.documentes[0].documenteLe).toBe('2026-08-01T00:00:00.000Z');
  });

  it('journalise l’accès au dossier EXACTEMENT une fois, au gabarit littéral', async () => {
    await GET(getRequest());
    // Un seul site `acces` par handler. Retirer le second argument de
    // `garder()` ferait disparaître la traçabilité G-TRUST-04 en silence.
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledTimes(1);
    const data = prisma.journalAccesDossier.create.mock.calls[0][0].data;
    expect(data.route).toBe('/api/praticien/biologie/proposition');
    expect(data.methode).toBe('GET');
  });

  // SENTINELLE DE PAYLOAD. Ni la table de règles ni sa signature ne doivent
  // traverser HTTP — le jour où quelqu'un « ajoute la signature pour
  // déboguer », ce banc rougit avant la revue.
  it('le payload ne porte que les quatre clés attendues, et jamais la signature', async () => {
    const response = await GET(getRequest());
    const brut = await response.text();
    expect(Object.keys(JSON.parse(brut)).sort()).toEqual([
      'documentes',
      'lignes',
      'limites',
      'ok',
    ]);
    expect(brut).not.toContain('shaPerimetre');
    expect(brut).not.toContain('validationExterne');
    expect(brut).not.toContain('claimsSource');
  });

  it('l’abstention du moteur rend son motif en 409, pas une erreur technique', async () => {
    deriverPropositionPourPatient.mockResolvedValue({
      ok: false,
      motif: 'La table des indications biologiques n’est pas signée.',
    });
    const response = await GET(getRequest());
    const payload = await response.json();
    expect(response.status).toBe(409);
    expect(payload.error).toContain('n’est pas signée');
  });
});

describe('POST — déclarer un panel documenté', () => {
  it('consigne la déclaration, l’auteur venant de la SESSION', async () => {
    prisma.panelBiologieDocumente.upsert.mockResolvedValue({
      panelCode: 'PANEL_A',
      documenteLe: new Date('2026-08-01T00:00:00.000Z'),
      declarePar: PRATICIEN,
      declareLe: new Date('2026-08-02T00:00:00.000Z'),
    });
    const response = await POST(
      postRequest({ idPatient: 'PAT_TEST', panelCode: 'PANEL_A', documenteLe: '2026-08-01' }),
    );
    expect(response.status).toBe(200);
    const appel = prisma.panelBiologieDocumente.upsert.mock.calls[0][0];
    expect(appel.create.declarePar).toBe(PRATICIEN);
    // Une re-déclaration réécrit l'auteur EN MÊME TEMPS que la date : sinon la
    // ligne attribuerait au premier déclarant une date posée par un second.
    expect(appel.update.declarePar).toBe(PRATICIEN);
    expect(appel.update).toHaveProperty('documenteLe');
    // `declareLe` est porté par `@updatedAt`, jamais par le client.
    expect(appel.update).not.toHaveProperty('declareLe');
    expect(appel.create).not.toHaveProperty('declareLe');
  });

  it('un auteur fourni par le client est ignoré', async () => {
    prisma.panelBiologieDocumente.upsert.mockResolvedValue({
      panelCode: 'PANEL_A',
      documenteLe: new Date('2026-08-01T00:00:00.000Z'),
      declarePar: PRATICIEN,
      declareLe: new Date('2026-08-02T00:00:00.000Z'),
    });
    await POST(
      postRequest({
        idPatient: 'PAT_TEST',
        panelCode: 'PANEL_A',
        documenteLe: '2026-08-01',
        declarePar: 'usurpateur@ailleurs.fr',
      }),
    );
    expect(prisma.panelBiologieDocumente.upsert.mock.calls[0][0].create.declarePar).toBe(PRATICIEN);
  });

  // LA BORNE QUE POSTGRES NE PEUT PAS PORTER (`now()` n'est pas immutable).
  // Sans elle, une date future ferait conclure `deja_documente` au moteur et
  // RETIRERAIT le panel des propositions — une saisie fautive tairait un bilan.
  it('une date dans le futur est refusée, au-delà de la tolérance de fuseau', async () => {
    // Un jour de marge absorbe l'écart Paris/UTC ; ce que la borne vise — une
    // année saisie de travers — reste très au-delà.
    const futur = new Date(Date.now() + 365 * 86_400_000).toISOString();
    const response = await POST(
      postRequest({ idPatient: 'PAT_TEST', panelCode: 'PANEL_A', documenteLe: futur }),
    );
    const payload = await response.json();
    expect(response.status).toBe(400);
    expect(payload.reason).toBe('date_future');
    expect(prisma.panelBiologieDocumente.upsert).not.toHaveBeenCalled();
  });

  it('la tolérance ne dépasse pas un jour', async () => {
    const apresDemain = new Date(Date.now() + 2 * 86_400_000).toISOString();
    const response = await POST(
      postRequest({ idPatient: 'PAT_TEST', panelCode: 'PANEL_A', documenteLe: apresDemain }),
    );
    expect(response.status).toBe(400);
  });

  // Entre minuit et 2 h à Paris, `<input type="date">` rend un jour que
  // `new Date()` lit en UTC minuit — donc dans le futur. Sans tolérance, la
  // date DU JOUR serait refusée chaque nuit, avec un message faux.
  it('la date du jour reste acceptée aux heures où Paris et UTC divergent', async () => {
    prisma.panelBiologieDocumente.upsert.mockResolvedValue({
      panelCode: 'PANEL_A',
      documenteLe: new Date(),
      declarePar: PRATICIEN,
      declareLe: new Date(),
    });
    vi.useFakeTimers();
    // 22 h 30 UTC le 17 = 00 h 30 à Paris le 18.
    vi.setSystemTime(new Date('2026-08-17T22:30:00.000Z'));
    const response = await POST(
      postRequest({ idPatient: 'PAT_TEST', panelCode: 'PANEL_A', documenteLe: '2026-08-18' }),
    );
    vi.useRealTimers();
    expect(response.status).toBe(200);
  });

  it('une date illisible est refusée', async () => {
    const response = await POST(
      postRequest({ idPatient: 'PAT_TEST', panelCode: 'PANEL_A', documenteLe: 'avant-hier' }),
    );
    expect(response.status).toBe(400);
    expect(prisma.panelBiologieDocumente.upsert).not.toHaveBeenCalled();
  });

  it('un code de panel hors forme est refusé', async () => {
    const response = await POST(
      postRequest({ idPatient: 'PAT_TEST', panelCode: 'panel a', documenteLe: '2026-08-01' }),
    );
    expect(response.status).toBe(400);
  });

  it('un panel absent du catalogue est refusé proprement, pas en 500', async () => {
    prisma.biologyPanel.findUnique.mockResolvedValue(null);
    const response = await POST(
      postRequest({ idPatient: 'PAT_TEST', panelCode: 'PANEL_INCONNU', documenteLe: '2026-08-01' }),
    );
    const payload = await response.json();
    expect(response.status).toBe(404);
    expect(payload.reason).toBe('panel_inconnu');
  });

  it('dossier clos : la déclaration est refusée dans la ROUTE, pas seulement à l’écran', async () => {
    prisma.patient.findUnique.mockResolvedValue({
      praticienEmail: PRATICIEN,
      actif: false,
      suiviClotureLe: new Date('2026-08-01T00:00:00.000Z'),
    });
    const response = await POST(
      postRequest({ idPatient: 'PAT_TEST', panelCode: 'PANEL_A', documenteLe: '2026-08-01' }),
    );
    expect(response.status).toBe(409);
    expect(prisma.panelBiologieDocumente.upsert).not.toHaveBeenCalled();
  });

  it('le POST ne journalise aucun accès — un seul site par handler', async () => {
    prisma.panelBiologieDocumente.upsert.mockResolvedValue({
      panelCode: 'PANEL_A',
      documenteLe: new Date('2026-08-01T00:00:00.000Z'),
      declarePar: PRATICIEN,
      declareLe: new Date('2026-08-02T00:00:00.000Z'),
    });
    await POST(
      postRequest({ idPatient: 'PAT_TEST', panelCode: 'PANEL_A', documenteLe: '2026-08-01' }),
    );
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });
});
