import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EN_TETE_DOSSIER_PAGE, MESSAGE_AUTRE_DOSSIER } from '@/lib/portail/dossierPage';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    patient: { findUnique: vi.fn() },
    trustAcknowledgement: { create: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { signPatientSession } from '@/lib/patient-session';
import { getDocumentCourant } from '@/lib/trust/contenus/registre';
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

const patient = {
  idPatient: 'PAT_TEST',
  email: 'sophie.nicola@example.test',
  prenom: 'Sophie',
  nom: 'Nicola',
  actif: true,
  accessTokenRevoked: false,
  praticienEmail: 'praticien@wellneuro.fr',
  dateNaissance: '1979-07-28' as string | null,
};

function request(body: object, avecSession = true): Request {
  const cookie = avecSession
    ? signPatientSession({ idPatient: patient.idPatient, email: patient.email })
    : null;
  return new Request('http://localhost/api/portail/trust/lecture', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { cookie: `wn_portail=${encodeURIComponent(cookie)}` } : {}),
      [EN_TETE_DOSSIER_PAGE]: patient.idPatient,
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/portail/trust/lecture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    prisma.patient.findUnique.mockResolvedValue(patient);
    prisma.trustAcknowledgement.create.mockResolvedValue({});
  });

  afterEach(() => {
    delete process.env.WN_PORTAIL_CONDITIONS;
  });

  // La garde du dossier de la page ([[D-481]], DOC-14).
  it('page ouverte sous un autre dossier, ou sans segment : 409 (T-51), rien d’écrit', async () => {
    for (const segment of ['PAT_AUTRE', null]) {
      const res = await POST(sousSegment(request({ documentKey: 'cadre_accompagnement', type: 'pris_connaissance' }), segment));
      expect(res.status).toBe(409);
      expect(await res.json()).toEqual({ ok: false, reason: 'autre_dossier', error: MESSAGE_AUTRE_DOSSIER });
    }
    expect(prisma.trustAcknowledgement.create).not.toHaveBeenCalled();
  });

  it('sans session, le 401 passe avant la garde du dossier de la page', async () => {
    const res = await POST(sousSegment(request({ documentKey: 'cadre_accompagnement', type: 'pris_connaissance' }), 'PAT_AUTRE', { sansCookie: true }));
    expect(res.status).toBe(401);
  });

  it('compte refusé (introuvable ou révoqué) : le 403 passe avant la garde du dossier de la page', async () => {
    prisma.patient.findUnique.mockReset();
    prisma.patient.findUnique.mockResolvedValue(null);
    const res = await POST(sousSegment(request({ documentKey: 'cadre_accompagnement', type: 'pris_connaissance' }), 'PAT_AUTRE'));
    expect(res.status).toBe(403);
  });

  it('enregistre un accusé avec version et hash résolus côté serveur', async () => {
    const response = await POST(
      request({ documentKey: 'cadre_accompagnement', type: 'pris_connaissance' }),
    );
    expect(response.status).toBe(200);
    const attendu = getDocumentCourant('cadre_accompagnement');
    expect(prisma.trustAcknowledgement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        idPatient: patient.idPatient,
        documentKey: 'cadre_accompagnement',
        documentVersion: attendu.version,
        contentHash: attendu.hash,
        type: 'pris_connaissance',
      }),
    });
  });

  it('est idempotent : un accusé déjà présent (P2002) répond ok sans erreur', async () => {
    prisma.trustAcknowledgement.create.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }));
    const response = await POST(
      request({ documentKey: 'cadre_accompagnement', type: 'pris_connaissance' }),
    );
    expect(response.status).toBe(200);
    expect(((await response.json()) as { ok: boolean }).ok).toBe(true);
  });

  it('refuse un document ou type inconnu et une session absente', async () => {
    expect((await POST(request({ documentKey: 'x', type: 'pris_connaissance' }))).status).toBe(400);
    expect((await POST(request({ documentKey: 'usage_ia', type: 'signe' }))).status).toBe(400);
    expect(
      (await POST(request({ documentKey: 'usage_ia', type: 'presente' }, false))).status,
    ).toBe(401);
  });

  it('les conditions d’utilisation ne s’accusent que servies : 400 drapeau fermé, accusé de leur version ouvert (D-292)', async () => {
    const corps = { documentKey: 'conditions_utilisation', type: 'pris_connaissance' };
    expect((await POST(request(corps))).status).toBe(400);
    expect(prisma.trustAcknowledgement.create).not.toHaveBeenCalled();

    process.env.WN_PORTAIL_CONDITIONS = 'true';
    expect((await POST(request(corps))).status).toBe(200);
    const attendu = getDocumentCourant('conditions_utilisation');
    expect(prisma.trustAcknowledgement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        documentKey: 'conditions_utilisation',
        documentVersion: attendu.version,
        contentHash: attendu.hash,
        type: 'pris_connaissance',
      }),
    });
  });

  it('hors dossier majeur, les conditions ne s’accusent pas, drapeau ouvert (409)', async () => {
    process.env.WN_PORTAIL_CONDITIONS = 'true';
    for (const dateNaissance of [null, '2012-03-04']) {
      prisma.patient.findUnique.mockResolvedValue({ ...patient, dateNaissance });
      const res = await POST(request({ documentKey: 'conditions_utilisation', type: 'pris_connaissance' }));
      expect(res.status, String(dateNaissance)).toBe(409);
    }
    expect(prisma.trustAcknowledgement.create).not.toHaveBeenCalled();
  });
});
