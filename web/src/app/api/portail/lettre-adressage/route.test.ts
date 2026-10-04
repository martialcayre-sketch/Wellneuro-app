import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// La route du courrier remis ([[D-262]], LOT-03a). Style « signature réelle » :
// on ne simule que Prisma et le service, et on forge un vrai cookie.

const { prisma, lettreRemiseAuPatient, aUneLettreRemise } = vi.hoisted(() => ({
  prisma: { patient: { findUnique: vi.fn() } },
  lettreRemiseAuPatient: vi.fn(),
  aUneLettreRemise: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/correspondance/lettreServicePatient', () => ({ lettreRemiseAuPatient, aUneLettreRemise }));

import { signPatientSession } from '@/lib/patient-session';
import { GET } from './route';

const PATIENT = { idPatient: 'PAT_TEST', email: 'jennifer.martin@example.test' };
const LETTRE = { idRemise: 'lar_1', remiseLe: '2026-10-04T08:00:00.000Z', etat: 'servie', texte: 'Docteur, …' };

function requete(avecCookie = true, suffixe = ''): Request {
  const cookie = signPatientSession({ idPatient: PATIENT.idPatient, email: PATIENT.email });
  return new Request(`http://localhost/api/portail/lettre-adressage${suffixe}`, {
    headers: avecCookie ? { cookie: `wn_portail=${encodeURIComponent(cookie)}` } : {},
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NEXTAUTH_SECRET', 'secret-de-test-non-production');
  vi.stubEnv('WN_LETTRE_ADRESSAGE_PATIENT', 'true');
  prisma.patient.findUnique.mockResolvedValue({
    idPatient: PATIENT.idPatient, actif: true, accessTokenRevoked: false, email: PATIENT.email,
    sessionsInvalidesAvant: null, createdAt: new Date('2026-06-01T08:00:00.000Z'),
  });
  lettreRemiseAuPatient.mockResolvedValue(LETTRE);
  aUneLettreRemise.mockResolvedValue(true);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('GET /api/portail/lettre-adressage (D-262, LOT-03a)', () => {
  it.each(['', 'TRUE', '1', 'oui'])('drapeau « %s » : 503, ni session ni base lues', async valeur => {
    vi.stubEnv('WN_LETTRE_ADRESSAGE_PATIENT', valeur);
    const res = await GET(requete());
    expect(res.status).toBe(503);
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
    expect(lettreRemiseAuPatient).not.toHaveBeenCalled();
  });

  it('sans session : 401, rien n’est lu', async () => {
    const res = await GET(requete(false));
    expect(res.status).toBe(401);
    expect(lettreRemiseAuPatient).not.toHaveBeenCalled();
  });

  it('compte révoqué : 403, rien n’est lu', async () => {
    prisma.patient.findUnique.mockResolvedValue({
      idPatient: PATIENT.idPatient, actif: true, accessTokenRevoked: true, email: PATIENT.email,
      sessionsInvalidesAvant: null, createdAt: new Date('2026-06-01T08:00:00.000Z'),
    });
    const res = await GET(requete());
    expect(res.status).toBe(403);
    expect(lettreRemiseAuPatient).not.toHaveBeenCalled();
  });

  it('sert le courrier de CE patient', async () => {
    const res = await GET(requete());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, lettre: LETTRE });
    expect(lettreRemiseAuPatient).toHaveBeenCalledWith(PATIENT.idPatient);
  });

  it('`?interrupteur=1` : un booléen, aucun texte lu', async () => {
    const res = await GET(requete(true, '?interrupteur=1'));
    expect(await res.json()).toEqual({ ok: true, ouvert: true, lettreRemise: true });
    expect(lettreRemiseAuPatient).not.toHaveBeenCalled();
  });

  it('une panne : 500, et le journal ne porte que classe et code', async () => {
    const espion = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    lettreRemiseAuPatient.mockRejectedValue(Object.assign(new Error('texte de la lettre'), { code: 'P1001' }));
    const res = await GET(requete());
    expect(res.status).toBe(500);
    expect(espion).toHaveBeenCalledWith(expect.any(String), 'Error', 'P1001');
    espion.mockRestore();
  });
});
