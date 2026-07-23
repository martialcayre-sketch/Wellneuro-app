import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    patient: { findFirst: vi.fn() },
    envoiBrouillon: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('next-auth', () => ({
  getServerSession: vi.fn().mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } }),
}));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/ids', () => ({ createPublicId: (prefix: string) => `${prefix}_TEST_12345678` }));

import { DELETE, GET, POST } from './route';

const PATIENT = {
  idPatient: 'PAT001',
  email: 'sophie.nicola@example.com',
  actif: true,
  suiviClotureLe: null,
};

function postRequest(body: unknown) {
  return new Request('http://localhost/api/praticien/file-envoi', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('file-envoi POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.patient.findFirst.mockResolvedValue(PATIENT);
    prisma.envoiBrouillon.findFirst.mockResolvedValue(null);
    prisma.envoiBrouillon.create.mockImplementation(({ data }: { data: { qids: string[] } }) =>
      Promise.resolve({ idBrouillon: 'ENV_TEST_12345678', qids: data.qids }),
    );
  });

  it('crée un brouillon en ne gardant que les ids assignables, dédupliqués', async () => {
    const res = await POST(
      postRequest({
        emailPatient: 'sophie.nicola@example.com',
        // Q_STR_02 valide (deux fois), Q_STR_07 alias historique, Q_GEO_04
        // passation praticien, Q_FAUX inconnu : seuls les assignables passent.
        qids: ['Q_STR_02', 'Q_STR_02', 'Q_STR_07', 'Q_GEO_04', 'Q_FAUX'],
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    const data = prisma.envoiBrouillon.create.mock.calls[0][0].data;
    expect(data.qids).toEqual(['Q_STR_02']);
    expect(data.praticienEmail).toBe('praticien@wellneuro.fr');
    expect(data.idPatient).toBe('PAT001');
  });

  it('fusionne dans le brouillon existant sans doublon', async () => {
    prisma.envoiBrouillon.findFirst.mockResolvedValue({
      idBrouillon: 'ENV_EXISTANT',
      qids: ['Q_STR_02'],
      dateLimite: null,
      notes: null,
    });
    prisma.envoiBrouillon.update.mockResolvedValue({
      idBrouillon: 'ENV_EXISTANT',
      qids: ['Q_STR_02', 'Q_SOM_02'],
    });
    const res = await POST(
      postRequest({
        emailPatient: 'sophie.nicola@example.com',
        qids: ['Q_SOM_02', 'Q_STR_02'],
      }),
    );
    expect(res.status).toBe(200);
    const args = prisma.envoiBrouillon.update.mock.calls[0][0];
    expect(args.where).toEqual({ idBrouillon: 'ENV_EXISTANT' });
    expect(args.data.qids).toEqual(['Q_STR_02', 'Q_SOM_02']);
  });

  it('refuse un payload sans questionnaire assignable', async () => {
    const res = await POST(
      postRequest({ emailPatient: 'sophie.nicola@example.com', qids: ['Q_STR_07', 'Q_GEO_04'] }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).reason).toBe('invalid_payload');
    expect(prisma.envoiBrouillon.create).not.toHaveBeenCalled();
  });

  it('refuse un dossier au suivi clôturé', async () => {
    prisma.patient.findFirst.mockResolvedValue({ ...PATIENT, suiviClotureLe: new Date() });
    const res = await POST(
      postRequest({ emailPatient: 'sophie.nicola@example.com', qids: ['Q_STR_02'] }),
    );
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('dossier_cloture');
  });
});

describe('file-envoi GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('liste les brouillons du praticien avec les titres du catalogue', async () => {
    prisma.envoiBrouillon.findMany.mockResolvedValue([
      {
        idBrouillon: 'ENV_1',
        idPatient: 'PAT001',
        qids: ['Q_STR_02'],
        dateLimite: null,
        notes: null,
        patient: { prenom: 'Sophie', nom: 'Nicola', email: 'sophie.nicola@example.com' },
      },
    ]);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.brouillons).toHaveLength(1);
    expect(json.brouillons[0].items[0].titre).toContain('PSS-10');
    const where = prisma.envoiBrouillon.findMany.mock.calls[0][0].where;
    expect(where.statut).toBe('brouillon');
    expect(where.praticienEmail.equals).toBe('praticien@wellneuro.fr');
  });
});

describe('file-envoi DELETE', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.envoiBrouillon.findFirst.mockResolvedValue({
      idBrouillon: 'ENV_1',
      qids: ['Q_STR_02', 'Q_SOM_02'],
    });
  });

  it('retire un questionnaire sans supprimer le brouillon', async () => {
    prisma.envoiBrouillon.update.mockResolvedValue({ idBrouillon: 'ENV_1', qids: ['Q_SOM_02'] });
    const res = await DELETE(
      new Request('http://localhost/api/praticien/file-envoi?idBrouillon=ENV_1&qid=Q_STR_02', {
        method: 'DELETE',
      }),
    );
    expect(res.status).toBe(200);
    expect(prisma.envoiBrouillon.update).toHaveBeenCalled();
    expect(prisma.envoiBrouillon.delete).not.toHaveBeenCalled();
  });

  it('supprime le brouillon quand le dernier questionnaire part', async () => {
    prisma.envoiBrouillon.findFirst.mockResolvedValue({ idBrouillon: 'ENV_1', qids: ['Q_STR_02'] });
    const res = await DELETE(
      new Request('http://localhost/api/praticien/file-envoi?idBrouillon=ENV_1&qid=Q_STR_02', {
        method: 'DELETE',
      }),
    );
    expect(res.status).toBe(200);
    expect(prisma.envoiBrouillon.delete).toHaveBeenCalledWith({ where: { idBrouillon: 'ENV_1' } });
  });
});
