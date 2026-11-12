import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sendMail, prisma } = vi.hoisted(() => ({
  sendMail: vi.fn(),
  prisma: {
    patient: { findFirst: vi.fn() },
    envoiBrouillon: { findFirst: vi.fn() },
    // idsAssignablesPour / resolveDefinition : aucun instrument du cabinet ici.
    cabinetInstrument: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn() },
    correspondancePatient: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

const tx = {
  assignation: { create: vi.fn(), findMany: vi.fn() },
  // NF-7 : la copie de la déclaration se lit dans la transaction.
  cabinetInstrument: { findUnique: vi.fn() },
  envoiBrouillon: { updateMany: vi.fn() },
  $queryRaw: vi.fn(),
};

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('next-auth', () => ({
  getServerSession: vi.fn().mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } }),
}));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/ids', () => ({ createPublicId: (prefix: string) => `${prefix}_TEST_12345678` }));
vi.mock('nodemailer', () => ({ default: { createTransport: () => ({ sendMail }) } }));

import nodemailer from 'nodemailer';
import { POST } from './route';
import { MESSAGE_DOSSIER_DESACTIVE } from '@/lib/patient/cycleDeVie';
import { logger } from '@/lib/observability/logger';

const BROUILLON = {
  idBrouillon: 'ENV_1',
  idPatient: 'PAT001',
  qids: ['Q_STR_02', 'Q_SOM_02'],
  dateLimite: '2026-08-01',
  notes: null,
  statut: 'brouillon',
};

const PATIENT = {
  idPatient: 'PAT001',
  email: 'sophie.nicola@example.com',
  actif: true,
  accessTokenRevoked: false,
  suiviClotureLe: null,
};

function postRequest(body: unknown) {
  return new Request('http://localhost/api/praticien/file-envoi/envoyer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('file-envoi/envoyer POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SMTP_URL = 'smtp://test';
    process.env.NEXTAUTH_URL = 'https://app.wellneuro.fr';
    prisma.envoiBrouillon.findFirst.mockResolvedValue(BROUILLON);
    prisma.patient.findFirst.mockResolvedValue(PATIENT);
    prisma.$transaction.mockImplementation((op: (t: typeof tx) => unknown) => op(tx));
    tx.envoiBrouillon.updateMany.mockResolvedValue({ count: 1 });
    // Dédup : aucune assignation ouverte par défaut.
    tx.assignation.findMany.mockResolvedValue([]);
    tx.$queryRaw.mockResolvedValue([{ id: 1 }]);
  });

  it('crée une assignation par questionnaire, passe le brouillon à parti, un seul mail portail', async () => {
    const res = await POST(postRequest({ idBrouillon: 'ENV_1' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ success: true, count: 2 });

    expect(tx.assignation.create).toHaveBeenCalledTimes(2);
    const premiere = tx.assignation.create.mock.calls[0][0].data;
    expect(premiere.statut).toBe('En attente');
    expect(premiere.emailPatient).toBe('sophie.nicola@example.com');
    expect(premiere.dateLimite).toBe('2026-08-01');
    // D/52 : sans note, rien — l'ancien défaut s'affichait comme une note du praticien.
    expect(premiere.notes).toBeNull();

    expect(tx.envoiBrouillon.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { idBrouillon: 'ENV_1', statut: 'brouillon' },
        data: expect.objectContaining({ statut: 'parti' }),
      }),
    );

    expect(sendMail).toHaveBeenCalledTimes(1);
    const message = sendMail.mock.calls[0][0];
    expect(message.text).toContain('https://app.wellneuro.fr/portail/connexion');
    expect(message.text).not.toContain('/portail/TOK');
    expect(message.text).not.toContain('/patient/ASS_');
    // file_envoi@2 (2026-10-23) : ni titre d'instrument ni note dans l'e-mail.
    expect(message.text).not.toContain('PSS-10');
    expect(message.text).not.toContain('Note de votre praticien');
  });

  // [[D-398]] §1 (Q4) : une exception à la PRÉPARATION du transport s'écrit
  // « Erreur » avec son motif, comme un refus SMTP — elle ne laissait aucune trace.
  it('un transport qui lève à sa préparation : trace « Erreur » avec son motif, le brouillon reste parti', async () => {
    vi.spyOn(nodemailer, 'createTransport').mockImplementationOnce(() => {
      throw new Error('transport indisponible');
    });
    const response = await POST(postRequest({ idBrouillon: 'ENV_1' }));
    expect(response.status).toBe(200);
    expect(sendMail).not.toHaveBeenCalled();
    expect(prisma.correspondancePatient.create).toHaveBeenCalledTimes(1);
    expect(prisma.correspondancePatient.create.mock.calls[0][0].data).toMatchObject({
      type: 'questionnaires',
      statut: 'Erreur',
      erreurCourte: expect.stringContaining('transport indisponible'),
      sourceType: 'envoi_brouillon',
      sourceId: 'ENV_1',
    });
  });

  it('révocation portail : 409, aucune assignation, brouillon intact', async () => {
    prisma.patient.findFirst.mockResolvedValue({ ...PATIENT, accessTokenRevoked: true });
    const res = await POST(postRequest({ idBrouillon: 'ENV_1' }));
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('portal_revoked');
    expect(tx.assignation.create).not.toHaveBeenCalled();
    expect(tx.envoiBrouillon.updateMany).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('envoi concurrent : le second claim trouve count=0 → 409, aucune assignation, aucun mail', async () => {
    tx.envoiBrouillon.updateMany.mockResolvedValue({ count: 0 });
    const res = await POST(postRequest({ idBrouillon: 'ENV_1' }));
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('deja_envoye');
    expect(tx.assignation.create).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('brouillon d’un autre praticien : introuvable (cloisonnement), 404', async () => {
    prisma.envoiBrouillon.findFirst.mockResolvedValue(null);
    const res = await POST(postRequest({ idBrouillon: 'ENV_AUTRE_PRATICIEN' }));
    expect(res.status).toBe(404);
    const where = prisma.envoiBrouillon.findFirst.mock.calls[0][0].where;
    expect(where.praticienEmail.equals).toBe('praticien@wellneuro.fr');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('dossier au suivi clôturé : 409, rien ne part', async () => {
    prisma.patient.findFirst.mockResolvedValue({ ...PATIENT, suiviClotureLe: new Date() });
    const res = await POST(postRequest({ idBrouillon: 'ENV_1' }));
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('dossier_cloture');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  // [[D-432]] : un dossier désactivé a son propre refus, plus « introuvable ».
  it('dossier désactivé : 409 dossier_desactive, rien ne part', async () => {
    prisma.patient.findFirst.mockResolvedValue({ ...PATIENT, actif: false });
    const res = await POST(postRequest({ idBrouillon: 'ENV_1' }));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({
      reason: 'dossier_desactive',
      error: MESSAGE_DOSSIER_DESACTIVE,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('dossier désactivé et clôturé : la clôture prime', async () => {
    prisma.patient.findFirst.mockResolvedValue({ ...PATIENT, actif: false, suiviClotureLe: new Date() });
    const res = await POST(postRequest({ idBrouillon: 'ENV_1' }));
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('dossier_cloture');
  });

  it('dossier absent : toujours introuvable', async () => {
    prisma.patient.findFirst.mockResolvedValue(null);
    const res = await POST(postRequest({ idBrouillon: 'ENV_1' }));
    expect(res.status).toBe(404);
    expect((await res.json()).reason).toBe('patient_not_found');
  });

  // Dédup : un qid déjà porté par une assignation ouverte est écarté ; si tout
  // le brouillon l'est, la transaction est annulée (le brouillon reste
  // éditable) et aucun mail ne part.
  it('écarte un questionnaire déjà assigné (ouvert), le reste part avec le bon compte', async () => {
    tx.assignation.findMany.mockResolvedValue([{ idQuestionnaire: 'Q_STR_02' }]);
    const res = await POST(postRequest({ idBrouillon: 'ENV_1' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true, count: 1 });
    expect(tx.assignation.create).toHaveBeenCalledOnce();
    const cree = tx.assignation.create.mock.calls[0][0].data as { idQuestionnaire: string };
    expect(cree.idQuestionnaire).toBe('Q_SOM_02');
    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  it('refuse en 409 deja_assigne quand tout le brouillon est déjà ouvert, sans mail', async () => {
    tx.assignation.findMany.mockResolvedValue([
      { idQuestionnaire: 'Q_STR_02' },
      { idQuestionnaire: 'Q_SOM_02' },
    ]);
    const res = await POST(postRequest({ idBrouillon: 'ENV_1' }));
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('deja_assigne');
    expect(tx.assignation.create).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('brouillon inconnu : 404', async () => {
    prisma.envoiBrouillon.findFirst.mockResolvedValue(null);
    const res = await POST(postRequest({ idBrouillon: 'ENV_INCONNU' }));
    expect(res.status).toBe(404);
    expect((await res.json()).reason).toBe('not_found');
  });
});

// NF-7 ([[D-303]] §3, réponse 20261111-0027-a) : la déclaration « question sur
// le suicide » d'un instrument du cabinet est COPIÉE sur l'assignation à
// l'envoi. Drapeau éteint, rien n'est écrit : l'envoi d'avant NF-7.
describe('file-envoi/envoyer — copie de la déclaration NF-7', () => {
  const INSTRUMENT_PUBLIE = {
    idInstrument: 'CAB_1',
    praticienEmail: 'praticien@wellneuro.fr',
    titre: 'Humeur cabinet',
    definitionJson: { sections: [] },
    scoringJson: null,
    statutRelecture: 'valide',
    actif: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.WN_ENABLE_DECLARATION_SUICIDE_CAB;
    process.env.SMTP_URL = 'smtp://test';
    process.env.NEXTAUTH_URL = 'https://app.wellneuro.fr';
    prisma.envoiBrouillon.findFirst.mockResolvedValue({ ...BROUILLON, qids: ['CAB_1', 'Q_STR_02'] });
    prisma.patient.findFirst.mockResolvedValue(PATIENT);
    prisma.cabinetInstrument.findMany.mockResolvedValue([{ idInstrument: 'CAB_1' }]);
    prisma.cabinetInstrument.findUnique.mockResolvedValue(INSTRUMENT_PUBLIE);
    prisma.$transaction.mockImplementation((op: (t: typeof tx) => unknown) => op(tx));
    tx.envoiBrouillon.updateMany.mockResolvedValue({ count: 1 });
    tx.assignation.findMany.mockResolvedValue([]);
    lignesVerrouillees([{ id_instrument: 'CAB_1', actif: true, statut_relecture: 'valide', pose_question_suicide: true }]);
  });

  type LigneVerrou = { id_instrument: string; actif: boolean; statut_relecture: string; pose_question_suicide: boolean | null };

  /** `$queryRaw` sert deux verrous : la ligne patient, puis (drapeau allumé) celles des instruments. */
  function lignesVerrouillees(lignes: LigneVerrou[]) {
    tx.$queryRaw.mockImplementation((sql: TemplateStringsArray) =>
      Promise.resolve(sql.join('?').includes('cabinet_instruments') ? lignes : [{ id: 1 }]),
    );
  }

  function requetesInstruments(): string[] {
    return tx.$queryRaw.mock.calls
      .map(c => (c[0] as TemplateStringsArray).join('?'))
      .filter(sql => sql.includes('cabinet_instruments'));
  }

  function donneesCreees(idQuestionnaire: string) {
    const appel = tx.assignation.create.mock.calls.find(c => c[0].data.idQuestionnaire === idQuestionnaire);
    expect(appel, idQuestionnaire).toBeDefined();
    return appel![0].data as Record<string, unknown>;
  }

  it('drapeau éteint : aucune copie, aucun verrou d’instrument, l’envoi d’avant NF-7', async () => {
    lignesVerrouillees([{ id_instrument: 'CAB_1', actif: false, statut_relecture: 'brouillon', pose_question_suicide: null }]);
    const res = await POST(postRequest({ idBrouillon: 'ENV_1' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true, count: 2 });
    expect('poseQuestionSuicide' in donneesCreees('CAB_1')).toBe(false);
    expect('poseQuestionSuicide' in donneesCreees('Q_STR_02')).toBe(false);
    expect(requetesInstruments()).toEqual([]);
    expect(tx.cabinetInstrument.findUnique).not.toHaveBeenCalled();
  });

  it('drapeau allumé : le CAB_ porte la copie lue SOUS VERROU ; le catalogue reste sans copie', async () => {
    process.env.WN_ENABLE_DECLARATION_SUICIDE_CAB = 'true';
    const res = await POST(postRequest({ idBrouillon: 'ENV_1' }));
    expect(res.status).toBe(200);
    expect(donneesCreees('CAB_1').poseQuestionSuicide).toBe(true);
    expect('poseQuestionSuicide' in donneesCreees('Q_STR_02')).toBe(false);
    // P2-3 : une seule lecture des instruments, verrouillée jusqu'au commit,
    // en ordre fixe, bornée au cabinet du praticien.
    const [sql] = requetesInstruments();
    expect(requetesInstruments()).toHaveLength(1);
    expect(sql).toMatch(/FOR SHARE/);
    expect(sql).toMatch(/ORDER BY id_instrument/);
    expect(sql).toMatch(/lower\(praticien_email\)/);
    const appel = tx.$queryRaw.mock.calls.find(c => (c[0] as TemplateStringsArray).join('?').includes('cabinet_instruments'))!;
    expect(appel.slice(1)).toEqual([['CAB_1'], 'praticien@wellneuro.fr']);
  });

  it('drapeau allumé : « non » se copie « non » ; jamais de NULL copié (0028-a)', async () => {
    process.env.WN_ENABLE_DECLARATION_SUICIDE_CAB = 'true';
    lignesVerrouillees([{ id_instrument: 'CAB_1', actif: true, statut_relecture: 'valide', pose_question_suicide: false }]);
    await POST(postRequest({ idBrouillon: 'ENV_1' }));
    expect(donneesCreees('CAB_1').poseQuestionSuicide).toBe(false);
  });

  // P2-3 (arbitrage du 2026-11-12) : l'instrument a changé entre la lecture
  // d'`idsAssignablesPour` et la transaction. Sous verrou, il est écarté avec
  // sa trace ; le reste du brouillon part.
  for (const [cas, ligne] of [
    ['dépublié', { statut_relecture: 'brouillon', pose_question_suicide: null }],
    ['désactivé', { actif: false }],
    ['déclaration effacée (non déclaré)', { pose_question_suicide: null }],
  ] as const) {
    it(`drapeau allumé, instrument ${cas} sous verrou : écarté avec sa trace, le reste part`, async () => {
      process.env.WN_ENABLE_DECLARATION_SUICIDE_CAB = 'true';
      const publieDeclare: LigneVerrou = { id_instrument: 'CAB_1', actif: true, statut_relecture: 'valide', pose_question_suicide: true };
      lignesVerrouillees([{ ...publieDeclare, ...ligne }]);
      const warn = vi.spyOn(logger, 'warn');
      const res = await POST(postRequest({ idBrouillon: 'ENV_1' }));
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ success: true, count: 1 });
      expect(tx.assignation.create).toHaveBeenCalledTimes(1);
      expect(tx.assignation.create.mock.calls[0][0].data.idQuestionnaire).toBe('Q_STR_02');
      expect(warn).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'ASSIGNATION.INSTRUMENT_INELIGIBLE.ECARTE', message: expect.stringContaining('CAB_1') }),
      );
      warn.mockRestore();
    });
  }

  it('drapeau allumé, instrument d’un autre cabinet ou disparu : aucune ligne sous verrou, écarté', async () => {
    process.env.WN_ENABLE_DECLARATION_SUICIDE_CAB = 'true';
    lignesVerrouillees([]);
    const res = await POST(postRequest({ idBrouillon: 'ENV_1' }));
    expect(await res.json()).toMatchObject({ success: true, count: 1 });
  });

  it('drapeau allumé, plus rien d’envoyable sous verrou : 400, tout est annulé, aucun mail', async () => {
    process.env.WN_ENABLE_DECLARATION_SUICIDE_CAB = 'true';
    prisma.envoiBrouillon.findFirst.mockResolvedValue({ ...BROUILLON, qids: ['CAB_1'] });
    lignesVerrouillees([{ id_instrument: 'CAB_1', actif: true, statut_relecture: 'valide', pose_question_suicide: null }]);
    const res = await POST(postRequest({ idBrouillon: 'ENV_1' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ success: false, error: 'Aucun questionnaire valide dans ce brouillon.' });
    expect(tx.assignation.create).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('valeur autre que « true » : le drapeau reste éteint', async () => {
    process.env.WN_ENABLE_DECLARATION_SUICIDE_CAB = '1';
    await POST(postRequest({ idBrouillon: 'ENV_1' }));
    expect('poseQuestionSuicide' in donneesCreees('CAB_1')).toBe(false);
    delete process.env.WN_ENABLE_DECLARATION_SUICIDE_CAB;
  });
});
