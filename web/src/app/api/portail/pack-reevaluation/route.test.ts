import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    patient: { findUnique: vi.fn() },
    questionnaireReponse: { findFirst: vi.fn() },
    consultation: { findFirst: vi.fn() },
    pack: { findMany: vi.fn() },
    packProposition: { findFirst: vi.fn(), create: vi.fn() },
    assignation: { create: vi.fn(), createMany: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { signPatientSession } from '@/lib/patient-session';
import { GET, POST } from './route';

const PATIENT = { idPatient: 'PAT_SEED_03', email: 'michel.dogne@fictif.wellneuro.fr' };

const compte = {
  idPatient: PATIENT.idPatient,
  actif: true,
  email: PATIENT.email,
  accessToken: 'TOK',
  accessTokenRevoked: false,
  sessionsInvalidesAvant: null,
};

const PACK = {
  idPack: 'PACK_BASE',
  nom: 'Base de consultation',
  description: null,
  qids: ['Q1', 'Q2', 'Q3'],
  parDefaut: true,
};

function cookie(): string {
  return `wn_portail=${encodeURIComponent(signPatientSession(PATIENT))}`;
}

function get(avecCookie = true): Request {
  return new Request('http://localhost/api/portail/pack-reevaluation', {
    headers: avecCookie ? { cookie: cookie() } : {},
  });
}

function post(body: unknown, avecCookie = true): Request {
  return new Request('http://localhost/api/portail/pack-reevaluation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(avecCookie ? { cookie: cookie() } : {}) },
    body: JSON.stringify(body),
  });
}

/** Dernière réponse transmise il y a N mois. */
function transmisIlYa(mois: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - mois);
  return { dateReponse: d };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
  prisma.patient.findUnique.mockResolvedValue(compte);
  prisma.questionnaireReponse.findFirst.mockResolvedValue(transmisIlYa(9));
  prisma.consultation.findFirst.mockResolvedValue({ idPackAssigne: PACK.idPack });
  prisma.pack.findMany.mockResolvedValue([PACK]);
  prisma.packProposition.findFirst.mockResolvedValue(null);
  prisma.packProposition.create.mockResolvedValue({});
});

describe('GET /api/portail/pack-reevaluation', () => {
  it('sans session portail, 404 et aucune lecture métier', async () => {
    const res = await GET(get(false));
    expect(res.status).toBe(404);
    expect(prisma.pack.findMany).not.toHaveBeenCalled();
  });

  it('propose le pack au patient qui revient après une longue absence', async () => {
    const res = await GET(get());
    const corps = await res.json();
    expect(corps.proposition).toMatchObject({ idPack: PACK.idPack });
    expect(corps.proposition.corps).toMatch(/Rien ne vous est assigné/i);
  });

  it('ne propose rien à un patient actif — il n’a rien interrompu', async () => {
    prisma.questionnaireReponse.findFirst.mockResolvedValue(transmisIlYa(1));
    expect((await (await GET(get())).json()).proposition).toBeNull();
  });

  it('ne propose rien à un patient qui n’a jamais répondu', async () => {
    prisma.questionnaireReponse.findFirst.mockResolvedValue(null);
    expect((await (await GET(get())).json()).proposition).toBeNull();
  });

  // LE point de la réserve : une proposition qui revient est une relance.
  it('ne repose pas la question après un refus', async () => {
    prisma.packProposition.findFirst.mockResolvedValue({ idPack: PACK.idPack, statut: 'declinee' });
    expect((await (await GET(get())).json()).proposition).toBeNull();
  });

  it('ne repose pas la question après une acceptation non plus', async () => {
    prisma.packProposition.findFirst.mockResolvedValue({ idPack: PACK.idPack, statut: 'acceptee' });
    expect((await (await GET(get())).json()).proposition).toBeNull();
  });

  // Un GET qui écrirait se déclencherait au moindre préchargement du navigateur.
  it('n’écrit jamais rien', async () => {
    await GET(get());
    expect(prisma.packProposition.create).not.toHaveBeenCalled();
  });
});

describe('POST /api/portail/pack-reevaluation', () => {
  it('sans session portail, 404 et aucune écriture', async () => {
    expect((await POST(post({ idPack: PACK.idPack, reponse: 'declinee' }, false))).status).toBe(404);
    expect(prisma.packProposition.create).not.toHaveBeenCalled();
  });

  it('enregistre un refus, et l’accusé promet que la question ne reviendra pas', async () => {
    const res = await POST(post({ idPack: PACK.idPack, reponse: 'declinee' }));
    expect(res.status).toBe(200);
    expect((await res.json()).accuse).toMatch(/ne vous sera pas reposée/i);

    expect(prisma.packProposition.create).toHaveBeenCalledTimes(1);
    expect(prisma.packProposition.create.mock.calls[0][0].data).toMatchObject({
      idPatient: PATIENT.idPatient,
      idPack: PACK.idPack,
      statut: 'declinee',
      acteurRole: 'patient',
    });
  });

  // Invariant non négociable de la campagne : proposé, jamais assigné.
  it('n’assigne rien, même quand le patient accepte', async () => {
    await POST(post({ idPack: PACK.idPack, reponse: 'acceptee' }));
    expect(prisma.assignation.create).not.toHaveBeenCalled();
    expect(prisma.assignation.createMany).not.toHaveBeenCalled();
  });

  it('chaîne la réponse sur la précédente plutôt que de la réécrire', async () => {
    prisma.packProposition.findFirst.mockResolvedValue({ id: 'PROP_1' });
    await POST(post({ idPack: PACK.idPack, reponse: 'acceptee' }));
    expect(prisma.packProposition.create.mock.calls[0][0].data.supersedesPropositionId).toBe('PROP_1');
  });

  it('refuse un statut inventé', async () => {
    expect((await POST(post({ idPack: PACK.idPack, reponse: 'peut_etre' }))).status).toBe(400);
    expect(prisma.packProposition.create).not.toHaveBeenCalled();
  });

  it('refuse une requête sans pack', async () => {
    expect((await POST(post({ reponse: 'declinee' }))).status).toBe(400);
    expect(prisma.packProposition.create).not.toHaveBeenCalled();
  });
});
