import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sendMail, prisma } = vi.hoisted(() => ({
  sendMail: vi.fn(),
  prisma: {
    patient: { findFirst: vi.fn() },
    pack: { findUnique: vi.fn() },
    assignation: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('next-auth', () => ({ getServerSession: vi.fn().mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } }) }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/ids', () => ({ createPublicId: (prefix: string) => `${prefix}_TEST_12345678` }));
vi.mock('@/lib/consultation/packRegistry', () => ({
  resolvePackQuestionnaireIds: vi.fn().mockResolvedValue({ qids: ['Q_NEU_03'], source: 'legacy', raison: 'registre_absent', registryCount: 0 }),
}));
vi.mock('nodemailer', () => ({ default: { createTransport: () => ({ sendMail }) } }));
vi.mock('@/lib/observability/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), security: vi.fn(), error: vi.fn() },
}));

import { POST } from './route';
import { resolvePackQuestionnaireIds } from '@/lib/consultation/packRegistry';
import { logger } from '@/lib/observability/logger';
import { EVENT_CODES } from '@/lib/observability/eventCodes';

const patient = {
  idPatient: 'PAT_TEST',
  email: 'sophie.nicola@example.test',
  actif: true,
  accessTokenRevoked: false,
};

function request(): Request {
  return new Request('http://localhost/api/praticien/packs/assign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailPatient: patient.email, idPack: 'PACK_TEST' }),
  });
}

describe('POST /api/praticien/packs/assign — lien portail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // `clearAllMocks` efface les appels, PAS les implémentations : un
    // `mockResolvedValue` posé dans un test fuiterait sur les suivants. On
    // repose donc la valeur de la fabrique à chaque cas.
    vi.mocked(resolvePackQuestionnaireIds).mockResolvedValue({ qids: ['Q_NEU_03'], source: 'legacy', raison: 'registre_absent', registryCount: 0 });
    process.env.SMTP_URL = 'smtp://test';
    process.env.NEXTAUTH_URL = 'https://app.wellneuro.fr';
    prisma.patient.findFirst.mockResolvedValue(patient);
    prisma.pack.findUnique.mockResolvedValue({ idPack: 'PACK_TEST', nom: 'Pack test', actif: true, qids: ['Q_NEU_03'] });
    prisma.assignation.create.mockResolvedValue({});
    // LOT-04 : plus de withActivePortalAccess ; les créations passent par un
    // $transaction(array) qui se contente d'exécuter les promesses.
    prisma.$transaction.mockResolvedValue([]);
    sendMail.mockResolvedValue(undefined);
  });

  it('envoie un seul lien vers la page de connexion, jamais un jeton permanent', async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(prisma.assignation.create).toHaveBeenCalledOnce();
    expect(sendMail).toHaveBeenCalledOnce();
    const message = sendMail.mock.calls[0][0] as { text: string };
    expect(message.text).toContain('https://app.wellneuro.fr/portail/connexion');
    expect(message.text).not.toContain('/portail/TOK');
    expect(message.text).not.toContain('/patient/ASS_');
  });

  // Cas réel : un pack enregistré en base contient un instrument depuis
  // suspendu. Rien ne retire le qid de `pack.qids` — le filtre doit donc agir
  // à l'envoi. Le pack part amputé plutôt que d'échouer en bloc.
  it('écarte un questionnaire suspendu du pack sans faire échouer l’envoi', async () => {
    vi.mocked(resolvePackQuestionnaireIds).mockResolvedValue({
      qids: ['Q_NEU_03', 'Q_FIB_03'],
      source: 'legacy',
      raison: 'registre_absent',
      registryCount: 0,
    });
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(prisma.assignation.create).toHaveBeenCalledOnce();
    const cree = prisma.assignation.create.mock.calls[0][0] as { data: { idQuestionnaire: string } };
    expect(cree.data.idQuestionnaire).toBe('Q_NEU_03');

    // Le filtrage sans la trace serait le pire des deux : le praticien lit
    // « pack envoyé » et rien ne dit qu'il manque une ligne. Le code est
    // asserté nommément — sous RESOLUTION_FAILED, cet envoi nominal se
    // confondrait avec l'échec dur émis 20 lignes plus bas dans la route.
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: EVENT_CODES.ASSIGNATION_PACK_INSTRUMENT_SUSPENDU,
        message: expect.stringContaining('Q_FIB_03'),
      })
    );
  });

  it('ne journalise aucune suspension quand le pack est entièrement actif', async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(logger.warn).not.toHaveBeenCalledWith(
      expect.objectContaining({ event: EVENT_CODES.ASSIGNATION_PACK_INSTRUMENT_SUSPENDU })
    );
  });

  it('ne crée aucune assignation lorsque le portail est révoqué', async () => {
    prisma.patient.findFirst.mockResolvedValue({ ...patient, accessTokenRevoked: true });
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ reason: 'portal_revoked' });
    expect(prisma.assignation.create).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  // --- Dérive du registre de packs (LOT-03) ---
  //
  // Le repli sur `packs.qids` reste le comportement de sécurité : il n'échoue
  // jamais. Ce qui change, c'est qu'une VRAIE divergence se voit — et qu'un
  // registre simplement absent ne déclenche rien, sans quoi l'alarme serait
  // allumée en permanence et ne distinguerait plus rien.

  function replisEmis() {
    return vi.mocked(logger.warn).mock.calls
      .filter(([payload]) => payload.event === EVENT_CODES.PACK_REGISTRE_REPLI_LEGACY);
  }

  // LOT-02 : les deux cas bénins (registre absent/vide) restent muets côté
  // WARN mais deviennent observables en INFO — même event code, niveau qui ne
  // déclenche pas d'alerte.
  function replisInfoEmis() {
    return vi.mocked(logger.info).mock.calls
      .filter(([payload]) => payload.event === EVENT_CODES.PACK_REGISTRE_REPLI_LEGACY);
  }

  it('journalise une divergence réelle entre le registre et packs.qids', async () => {
    vi.mocked(resolvePackQuestionnaireIds).mockResolvedValue({
      qids: ['Q_NEU_03'], source: 'legacy', raison: 'ensembles_divergents', registryCount: 4,
    });
    await POST(request());
    const emis = replisEmis();
    expect(emis).toHaveLength(1);
    expect(emis[0][0].message).toContain('4');
    // Le WARN existant reste seul à alerter sur une vraie divergence : l'INFO
    // ne se déclenche pas en plus.
    expect(replisInfoEmis()).toEqual([]);
  });

  it('journalise en info (pas en warn) quand le registre est simplement absent', async () => {
    vi.mocked(resolvePackQuestionnaireIds).mockResolvedValue({
      qids: ['Q_NEU_03'], source: 'legacy', raison: 'registre_absent', registryCount: 0,
    });
    await POST(request());
    expect(replisEmis()).toEqual([]);
    const emisInfo = replisInfoEmis();
    expect(emisInfo).toHaveLength(1);
    expect(emisInfo[0][0]).toMatchObject({ metadata: { raison: 'registre_absent', registryCount: 0 } });
  });

  it('journalise en info (pas en warn) quand le registre est simplement vide', async () => {
    vi.mocked(resolvePackQuestionnaireIds).mockResolvedValue({
      qids: ['Q_NEU_03'], source: 'legacy', raison: 'registre_vide', registryCount: 0,
    });
    await POST(request());
    expect(replisEmis()).toEqual([]);
    const emisInfo = replisInfoEmis();
    expect(emisInfo).toHaveLength(1);
    expect(emisInfo[0][0]).toMatchObject({ metadata: { raison: 'registre_vide', registryCount: 0 } });
  });

  it('ne journalise rien quand le registre concorde', async () => {
    vi.mocked(resolvePackQuestionnaireIds).mockResolvedValue({
      qids: ['Q_NEU_03'], source: 'registry', raison: null, registryCount: 1,
    });
    await POST(request());
    expect(replisEmis()).toEqual([]);
    expect(replisInfoEmis()).toEqual([]);
  });
});
