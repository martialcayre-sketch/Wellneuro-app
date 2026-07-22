import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    trustChoiceEvent: { findMany: vi.fn() },
    syntheseIA: { findUnique: vi.fn() },
    correspondanceMedecin: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { GET, POST } from './route';

const URL_BASE = 'http://localhost/api/praticien/correspondance-medecin';

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

const corps = (partiel: Record<string, unknown> = {}) => ({
  idPatient: 'PAT_TEST',
  sens: 'sortant',
  medecinLibelle: 'Dr Martin, médecin traitant',
  texte: 'Document de suivi remis au patient pour son médecin.',
  ...partiel,
});

const PATIENT_EN_SUIVI = {
  praticienEmail: 'praticien@wellneuro.fr',
  actif: true,
  suiviClotureLe: null,
};

describe('/api/praticien/correspondance-medecin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue(PATIENT_EN_SUIVI);
    prisma.trustChoiceEvent.findMany.mockResolvedValue([]);
    prisma.correspondanceMedecin.findMany.mockResolvedValue([]);
    prisma.syntheseIA.findUnique.mockResolvedValue(null);
    prisma.correspondanceMedecin.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'CORR_1',
        sens: data.sens,
        medecinLibelle: data.medecinLibelle,
        texte: data.texte,
        idSynthese: data.idSynthese ?? null,
        echangeLe: data.echangeLe ?? null,
        // La base pose le présent : le mock reflète ce contrat, pas l'appelant.
        consigneLe: new Date('2026-07-22T17:00:00.000Z'),
      }),
    );
  });

  it('exige une session', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await GET(getRequest())).status).toBe(401);
    expect((await POST(postRequest(corps()))).status).toBe(401);
    expect(prisma.correspondanceMedecin.create).not.toHaveBeenCalled();
  });

  it('refuse un patient d’un autre praticien sans révéler autre chose', async () => {
    prisma.patient.findUnique.mockResolvedValue({
      ...PATIENT_EN_SUIVI,
      praticienEmail: 'autre@wellneuro.fr',
    });
    expect((await GET(getRequest())).status).toBe(403);
    expect((await POST(postRequest(corps()))).status).toBe(403);
    expect(prisma.correspondanceMedecin.create).not.toHaveBeenCalled();
  });

  it('répond 404 sur un patient inconnu', async () => {
    prisma.patient.findUnique.mockResolvedValue(null);
    expect((await POST(postRequest(corps()))).status).toBe(404);
    expect(prisma.correspondanceMedecin.create).not.toHaveBeenCalled();
  });

  it('valide l’identifiant patient', async () => {
    expect((await GET(getRequest('idPatient='))).status).toBe(400);
    expect((await GET(getRequest('idPatient=PAT%20TEST'))).status).toBe(400);
  });

  it('refuse un corps illisible et un sens invalide', async () => {
    const illisible = new Request(URL_BASE, { method: 'POST', body: '{pas du json' });
    expect((await POST(illisible)).status).toBe(400);
    const reponse = await POST(postRequest(corps({ sens: 'lateral' })));
    expect(reponse.status).toBe(400);
    const json = await reponse.json();
    expect(json.reason).toBe('sens_invalide');
    expect(prisma.correspondanceMedecin.create).not.toHaveBeenCalled();
  });

  // FM-2 : la correspondance est une pièce du dossier — un dossier clos n'en
  // reçoit plus, quel que soit le sens. Le chemin propre pour une réponse
  // arrivée après clôture : rouvrir, transcrire, reclôturer.
  it('refuse la consignation sur dossier clos, pour les deux sens', async () => {
    prisma.patient.findUnique.mockResolvedValue({
      ...PATIENT_EN_SUIVI,
      suiviClotureLe: new Date('2026-07-01T00:00:00.000Z'),
    });
    for (const sens of ['sortant', 'entrant']) {
      const reponse = await POST(postRequest(corps({ sens })));
      expect(reponse.status).toBe(409);
      const json = await reponse.json();
      expect(json.reason).toBe('dossier_cloture');
    }
    expect(prisma.correspondanceMedecin.create).not.toHaveBeenCalled();
  });

  it('la lecture n’est jamais refusée sur dossier clos, et l’écran est prévenu', async () => {
    prisma.patient.findUnique.mockResolvedValue({
      ...PATIENT_EN_SUIVI,
      suiviClotureLe: new Date('2026-07-01T00:00:00.000Z'),
    });
    const reponse = await GET(getRequest());
    expect(reponse.status).toBe(200);
    const json = await reponse.json();
    expect(json.accepteConsignation).toBe(false);
  });

  it('refuse une adresse e-mail dans le libellé médecin (minimisation)', async () => {
    const reponse = await POST(postRequest(corps({ medecinLibelle: 'dr@cabinet.fr' })));
    expect(reponse.status).toBe(400);
    expect((await reponse.json()).reason).toBe('medecin_libelle_email');
  });

  it('refuse une synthèse inconnue ou appartenant à un autre patient, même 404', async () => {
    prisma.syntheseIA.findUnique.mockResolvedValue(null);
    const inconnue = await POST(postRequest(corps({ idSynthese: 'SYN_X' })));
    expect(inconnue.status).toBe(404);
    expect((await inconnue.json()).reason).toBe('synthese_not_found');

    prisma.syntheseIA.findUnique.mockResolvedValue({ idPatient: 'PAT_AUTRE' });
    const autrui = await POST(postRequest(corps({ idSynthese: 'SYN_Y' })));
    expect(autrui.status).toBe(404);
    expect((await autrui.json()).reason).toBe('synthese_not_found');
    expect(prisma.correspondanceMedecin.create).not.toHaveBeenCalled();
  });

  // Le cœur du lot : consigner au présent, sans jamais transmettre la date de
  // consignation.
  it('consigne un envoi puis une réponse, sans jamais transmettre consigneLe', async () => {
    for (const sens of ['sortant', 'entrant']) {
      const reponse = await POST(
        postRequest(corps({ sens, echangeLe: '2026-07-20' })),
      );
      expect(reponse.status).toBe(201);
      const json = await reponse.json();
      expect(json.ok).toBe(true);
      expect(json.correspondance.sens).toBe(sens);
    }
    for (const appel of prisma.correspondanceMedecin.create.mock.calls) {
      const data = appel[0].data as Record<string, unknown>;
      expect(Object.keys(data)).not.toContain('consigneLe');
      expect(Object.keys(data)).not.toContain('consigne_le');
      expect(data.praticienEmail).toBe('praticien@wellneuro.fr');
    }
  });

  it('expose le fil avec l’état du consentement de partage', async () => {
    prisma.correspondanceMedecin.findMany.mockResolvedValue([
      {
        id: 'CORR_1',
        sens: 'entrant',
        medecinLibelle: 'Dr Martin',
        texte: 'Réponse du médecin.',
        idSynthese: 'SYN_DISPARUE',
        echangeLe: null,
        consigneLe: new Date('2026-07-22T17:00:00.000Z'),
      },
    ]);
    prisma.trustChoiceEvent.findMany.mockResolvedValue([
      {
        finalite: 'partage_medecin_traitant',
        statut: 'accorde',
        enregistreLe: new Date('2026-07-10T00:00:00.000Z'),
      },
    ]);
    const reponse = await GET(getRequest());
    expect(reponse.status).toBe(200);
    const json = await reponse.json();
    expect(json.partageMedecinTraitant).toBe('accorde');
    // Référence souple : un id de synthèse disparu est exposé tel quel, la
    // lecture ne casse pas (AC-5 de la revue de la PR 1).
    expect(json.correspondances[0].idSynthese).toBe('SYN_DISPARUE');
  });

  it('sans choix exprimé, le consentement est null (jamais deviné)', async () => {
    const json = await (await GET(getRequest())).json();
    expect(json.partageMedecinTraitant).toBeNull();
  });
});
