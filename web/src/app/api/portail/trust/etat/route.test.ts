import { beforeEach, describe, expect, it, vi } from 'vitest';

// LA DÉSIGNATION SERVIE AU FORMULAIRE ([[D-281]] §2, étape 3) : la liste et sa
// version, ou `null` — jamais l'espace TRUST fermé sur une lecture en échec.

const { prisma, designationPour } = vi.hoisted(() => ({
  prisma: {
    patient: { findUnique: vi.fn() },
    trustAcknowledgement: { findMany: vi.fn() },
    trustChoiceEvent: { findMany: vi.fn() },
    trustAdverseEffectReport: { findMany: vi.fn() },
    trustPrivacyIncident: { findMany: vi.fn() },
    trustRightsRequest: { findMany: vi.fn() },
  },
  designationPour: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/trust/pauseEffetIndesirableServeur', () => ({ designationPour }));

import { signPatientSession } from '@/lib/patient-session';
import { GET } from './route';

const patient = {
  idPatient: 'PAT_TEST',
  email: 'jennifer.martin@example.test',
  prenom: 'Jennifer',
  nom: 'Martin',
  actif: true,
  accessTokenRevoked: false,
  praticienEmail: 'praticien@wellneuro.fr',
};

function request(): Request {
  const cookie = signPatientSession({ idPatient: patient.idPatient, email: patient.email });
  return new Request('http://localhost/api/portail/trust/etat', {
    headers: { cookie: `wn_portail=${encodeURIComponent(cookie)}` },
  });
}

describe('GET /api/portail/trust/etat — désignation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    prisma.patient.findUnique.mockResolvedValue(patient);
    for (const table of ['trustAcknowledgement', 'trustChoiceEvent', 'trustAdverseEffectReport', 'trustPrivacyIncident', 'trustRightsRequest'] as const) {
      prisma[table].findMany.mockResolvedValue([]);
    }
  });

  it('sert les éléments désignables et la version du programme', async () => {
    designationPour.mockResolvedValue({ version: 'v-courante', elements: [{ actionId: 'a-magnesium', title: 'Magnésium le soir' }] });
    const json = await (await GET(request())).json();
    expect(json).toMatchObject({
      ok: true,
      elementsProgramme: [{ actionId: 'a-magnesium', title: 'Magnésium le soir' }],
      versionProgramme: 'v-courante',
    });
  });

  it('désignation fermée : null, le formulaire d’avant', async () => {
    designationPour.mockResolvedValue(null);
    const json = await (await GET(request())).json();
    expect(json).toMatchObject({ ok: true, elementsProgramme: null, versionProgramme: null });
  });

  it('une lecture en échec rend null, et l’espace TRUST reste servi', async () => {
    designationPour.mockRejectedValue(new Error('base indisponible'));
    const res = await GET(request());
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, elementsProgramme: null, versionProgramme: null });
  });
});
