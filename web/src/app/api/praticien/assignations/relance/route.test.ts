import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getServerSession,
  verifierAppartenancePatient,
  journaliserCorrespondancePatient,
  rendreGabarit,
  sendMail,
  prisma,
} = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  verifierAppartenancePatient: vi.fn(),
  journaliserCorrespondancePatient: vi.fn(),
  rendreGabarit: vi.fn(),
  sendMail: vi.fn(),
  prisma: {
    $transaction: vi.fn(),
    $executeRaw: vi.fn(),
    assignation: { findUnique: vi.fn(), findMany: vi.fn() },
    patient: { findUnique: vi.fn() },
    correspondancePatient: { findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/praticien/appartenance', () => ({
  verifierAppartenancePatient,
  emailPraticien: () => 'praticien@wellneuro.fr',
}));
vi.mock('@/lib/email/transportSmtp', () => ({ creerTransportSmtp: () => ({ sendMail }) }));
vi.mock('@/lib/correspondance/patient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/correspondance/patient')>()),
  journaliserCorrespondancePatient,
}));
// Le rendu RÉEL, observable : seul le banc de [[D-398]] (Q4) le fait lever.
vi.mock('@/lib/correspondance/registreGabarits', async (importOriginal) => {
  const reel = await importOriginal<typeof import('@/lib/correspondance/registreGabarits')>();
  rendreGabarit.mockImplementation(reel.rendreGabarit);
  return { ...reel, rendreGabarit };
});

import { POST } from './route';
import { MARQUE_ENVOI_EN_COURS } from '@/lib/correspondance/reservation';

function requete(corps: unknown): Request {
  return new Request('http://localhost/api/praticien/assignations/relance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
  });
}

const DEMAIN_DU_RETARD = '2026-01-01';

describe('/api/praticien/assignations/relance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('WN_RELANCE_QUESTIONNAIRE', 'true');
    // Sans SMTP, la réservation se SOLDE quand même : c'est cette ligne que la
    // cadence relira — et, « Non envoyé », elle ne la bloque pas ([[D-399]]).
    vi.stubEnv('SMTP_URL', '');
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    verifierAppartenancePatient.mockResolvedValue('ok');
    prisma.assignation.findUnique.mockResolvedValue({
      idPatient: 'PAT_TEST', statut: 'En attente', statutReponses: 'deverrouille', dateLimite: DEMAIN_DU_RETARD,
    });
    prisma.patient.findUnique.mockResolvedValue({
      actif: true, suiviClotureLe: null, email: 'patient@example.test',
    });
    prisma.assignation.findMany.mockResolvedValue([
      { idAssignation: 'ASS_1', statut: 'En attente', statutReponses: 'deverrouille', dateLimite: DEMAIN_DU_RETARD },
    ]);
    prisma.correspondancePatient.findMany.mockResolvedValue([]);
    // La transaction joue son corps sur le même client : le verrou, la
    // lecture et la réservation y sont observables dans l'ordre. Le vrai
    // croisement de deux requêtes est éprouvé sur base réelle
    // (`correspondance/reservation.pg.test.ts`).
    prisma.$transaction.mockImplementation(async (corps: (tx: typeof prisma) => unknown) => corps(prisma));
    prisma.$executeRaw.mockResolvedValue(1);
    prisma.correspondancePatient.create.mockResolvedValue({ id: 'RES_1' });
    prisma.correspondancePatient.update.mockResolvedValue({});
    sendMail.mockResolvedValue({});
  });

  // DRAPEAU D'ABORD, et AVANT toute lecture : ce qui s'ouvre est un courrier de
  // plus vers le patient. Refuser après avoir lu le dossier laisserait une
  // trace d'accès pour un geste qui ne peut pas aboutir.
  it('refuse 503 drapeau éteint, sans rien lire du dossier', async () => {
    vi.stubEnv('WN_RELANCE_QUESTIONNAIRE', '');
    const res = await POST(requete({ idAssignation: 'ASS_1' }));

    expect(res.status).toBe(503);
    expect(prisma.assignation.findUnique).not.toHaveBeenCalled();
  });

  it('exige une session et un identifiant recevable', async () => {
    getServerSession.mockResolvedValueOnce(null);
    expect((await POST(requete({ idAssignation: 'ASS_1' }))).status).toBe(401);
    expect((await POST(requete({ idAssignation: '' }))).status).toBe(400);
    expect((await POST(requete({ idAssignation: 'ASS 1 !' }))).status).toBe(400);
  });

  it('traite l’assignation d’un autre praticien comme inaccessible', async () => {
    verifierAppartenancePatient.mockResolvedValueOnce('autre_praticien');
    expect((await POST(requete({ idAssignation: 'ASS_1' }))).status).toBe(403);
  });

  it('réserve le rappel puis le solde, sans rien écrire dans le dossier', async () => {
    const res = await POST(requete({ idAssignation: 'ASS_1' }));

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, statut: 'Non_envoye', questionnaires: 1 });
    // LA LIGNE PORTE L'ASSIGNATION : c'est par elle que la cadence du prochain
    // appel distingue ce questionnaire des autres du même dossier. Elle naît
    // réservée ([[D-398]] §1, Q3), puis se solde — une seule ligne.
    expect(prisma.correspondancePatient.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        idPatient: 'PAT_TEST',
        type: 'relance_questionnaire',
        objet: 'Rappel — un questionnaire attend toujours',
        statut: 'Non_envoye',
        erreurCourte: MARQUE_ENVOI_EN_COURS,
        referenceType: 'assignation',
        referenceId: 'ASS_1',
      }),
      select: { id: true },
    });
    expect(prisma.correspondancePatient.update).toHaveBeenCalledWith({
      where: { id: 'RES_1' },
      data: { statut: 'Non_envoye', erreurCourte: null },
    });
    expect(journaliserCorrespondancePatient).not.toHaveBeenCalled();
  });

  it('le verrou du dossier est pris AVANT la lecture de la cadence', async () => {
    await POST(requete({ idAssignation: 'ASS_1' }));

    expect(prisma.$executeRaw.mock.calls[0].slice(1)).toEqual(['envoi_patient:relance_questionnaire:PAT_TEST']);
    expect(prisma.$executeRaw.mock.invocationCallOrder[0])
      .toBeLessThan(prisma.correspondancePatient.findMany.mock.invocationCallOrder[0]);
  });

  it('ne compte que les rappels partis ou en partance ([[D-399]])', async () => {
    await POST(requete({ idAssignation: 'ASS_1' }));

    expect(prisma.correspondancePatient.findMany.mock.calls[0][0].where).toMatchObject({
      OR: [{ statut: 'Envoye' }, { statut: 'Non_envoye', erreurCourte: MARQUE_ENVOI_EN_COURS }],
    });
  });

  it('un seul e-mail pour les questionnaires rappelables du dossier ([[D-399]])', async () => {
    vi.stubEnv('SMTP_URL', 'smtp://test');
    prisma.assignation.findMany.mockResolvedValueOnce([
      { idAssignation: 'ASS_1', statut: 'En attente', statutReponses: 'deverrouille', dateLimite: DEMAIN_DU_RETARD },
      { idAssignation: 'ASS_2', statut: 'En attente', statutReponses: 'deverrouille', dateLimite: DEMAIN_DU_RETARD },
      { idAssignation: 'ASS_3', statut: 'Complété', statutReponses: 'deverrouille', dateLimite: DEMAIN_DU_RETARD },
      { idAssignation: 'ASS_4', statut: 'En attente', statutReponses: 'deverrouille', dateLimite: DEMAIN_DU_RETARD },
      { idAssignation: 'ASS_5', statut: 'En attente', statutReponses: 'deverrouille', dateLimite: null },
    ]);
    // ASS_4 a été rappelée il y a une heure, par un rappel groupé.
    prisma.correspondancePatient.findMany.mockResolvedValueOnce([
      { enregistreLe: new Date(Date.now() - 3600_000), referenceId: 'ASS_9,ASS_4' },
    ]);
    const res = await POST(requete({ idAssignation: 'ASS_1' }));

    expect(await res.json()).toMatchObject({ ok: true, statut: 'Envoye', questionnaires: 2 });
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail.mock.calls[0][0].subject).toBe('Des questionnaires vous attendent toujours — Wellneuro');
    expect(prisma.correspondancePatient.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        objet: 'Rappel — des questionnaires attendent toujours',
        referenceType: 'assignations',
        referenceId: 'ASS_1,ASS_2',
      }),
      select: { id: true },
    });
    expect(prisma.correspondancePatient.update).toHaveBeenCalledWith({
      where: { id: 'RES_1' },
      data: { statut: 'Envoye', erreurCourte: null },
    });
  });

  it('un rappel seul garde son gabarit et son échéance', async () => {
    vi.stubEnv('SMTP_URL', 'smtp://test');
    await POST(requete({ idAssignation: 'ASS_1' }));

    expect(sendMail.mock.calls[0][0].subject).toBe('Un questionnaire vous attend toujours — Wellneuro');
    expect(sendMail.mock.calls[0][0].text).toContain('À compléter avant le : 2026-01-01');
  });

  // [[D-398]] §1 (Q4) : rendu hors du bloc, le gabarit qui lève remontait en
  // 500 sans trace — et la cadence, qui relit les traces, ne le voyait pas.
  it('un gabarit qui lève : la réservation est soldée « Erreur » avec son motif', async () => {
    vi.stubEnv('SMTP_URL', 'smtp://test');
    rendreGabarit.mockImplementationOnce(() => {
      throw new Error('gabarit introuvable');
    });
    const res = await POST(requete({ idAssignation: 'ASS_1' }));

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, statut: 'Erreur' });
    expect(sendMail).not.toHaveBeenCalled();
    expect(prisma.correspondancePatient.update).toHaveBeenCalledTimes(1);
    const { data } = prisma.correspondancePatient.update.mock.calls[0][0];
    expect(data.statut).toBe('Erreur');
    expect(String(data.erreurCourte)).toContain('gabarit introuvable');
  });

  it('refuse 409 une assignation sans échéance, en le disant', async () => {
    prisma.assignation.findUnique.mockResolvedValueOnce({
      idPatient: 'PAT_TEST', statut: 'En attente', statutReponses: 'deverrouille', dateLimite: null,
    });
    prisma.assignation.findMany.mockResolvedValueOnce([
      { idAssignation: 'ASS_1', statut: 'En attente', statutReponses: 'deverrouille', dateLimite: null },
    ]);
    const res = await POST(requete({ idAssignation: 'ASS_1' }));

    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ ok: false, reason: 'sans_echeance' });
    expect(prisma.correspondancePatient.create).not.toHaveBeenCalled();
  });

  // 429 ET NON 409 : ce n'est pas l'état du dossier qui refuse, c'est le
  // rythme — et l'écran peut dire quand ce sera possible.
  it('refuse 429 sur la cadence, et dit quand le prochain rappel sera possible', async () => {
    prisma.correspondancePatient.findMany.mockResolvedValueOnce([
      { enregistreLe: new Date(), referenceId: 'ASS_1' },
    ]);
    const res = await POST(requete({ idAssignation: 'ASS_1' }));

    expect(res.status).toBe(429);
    const charge = await res.json();
    expect(charge).toMatchObject({ ok: false, reason: 'cadence' });
    expect(typeof charge.possibleLe).toBe('string');
    expect(prisma.correspondancePatient.create).not.toHaveBeenCalled();
  });

  it('la carte cliquée est jugée sur sa lecture sous le verrou : rendue entre-temps, rien ne part', async () => {
    prisma.assignation.findMany.mockResolvedValueOnce([
      { idAssignation: 'ASS_1', statut: 'Complété', statutReponses: 'deverrouille', dateLimite: DEMAIN_DU_RETARD },
      { idAssignation: 'ASS_2', statut: 'En attente', statutReponses: 'deverrouille', dateLimite: DEMAIN_DU_RETARD },
    ]);
    const res = await POST(requete({ idAssignation: 'ASS_1' }));

    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ reason: 'assignation_rendue' });
    expect(prisma.correspondancePatient.create).not.toHaveBeenCalled();
  });

  // ÉCHUE ET NON DÉVERROUILLÉE ([[D-404]]) : le portail l'affiche « Expiré »
  // et la soumission rend 410. Le rappel est refusé, rien n'est réservé, rien
  // n'est écrit au dossier — et le rappel groupé laisse ces cartes de côté.
  it('refuse 409 le rappel d’un questionnaire échu non déverrouillé', async () => {
    prisma.assignation.findMany.mockResolvedValueOnce([
      { idAssignation: 'ASS_1', statut: 'En attente', statutReponses: 'non_rempli', dateLimite: DEMAIN_DU_RETARD },
    ]);
    const res = await POST(requete({ idAssignation: 'ASS_1' }));

    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({
      reason: 'echeance_expiree',
      error: 'Ce questionnaire a expiré : déverrouillez-le avant de le rappeler.',
    });
    expect(prisma.correspondancePatient.create).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('le rappel groupé ne couvre que les questionnaires déverrouillés ([[D-404]])', async () => {
    prisma.assignation.findMany.mockResolvedValueOnce([
      { idAssignation: 'ASS_1', statut: 'En attente', statutReponses: 'deverrouille', dateLimite: DEMAIN_DU_RETARD },
      { idAssignation: 'ASS_2', statut: 'En attente', statutReponses: 'non_rempli', dateLimite: DEMAIN_DU_RETARD },
      { idAssignation: 'ASS_3', statut: 'En attente', statutReponses: 'modification_demandee', dateLimite: DEMAIN_DU_RETARD },
      { idAssignation: 'ASS_4', statut: 'En attente', statutReponses: 'deverrouille', dateLimite: DEMAIN_DU_RETARD },
    ]);
    const res = await POST(requete({ idAssignation: 'ASS_1' }));

    expect(await res.json()).toMatchObject({ ok: true, questionnaires: 2 });
    expect(prisma.correspondancePatient.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ referenceId: 'ASS_1,ASS_4' }),
      select: { id: true },
    });
  });

  it('une carte déjà couverte par un rappel groupé reçoit le refus de cadence', async () => {
    prisma.correspondancePatient.findMany.mockResolvedValueOnce([
      { enregistreLe: new Date(), referenceId: 'ASS_0,ASS_1' },
    ]);
    const res = await POST(requete({ idAssignation: 'ASS_1' }));

    expect(res.status).toBe(429);
    expect(prisma.correspondancePatient.create).not.toHaveBeenCalled();
  });

  it('refuse 409 sur un dossier au suivi clôturé', async () => {
    prisma.patient.findUnique.mockResolvedValueOnce({
      actif: true, suiviClotureLe: new Date('2026-02-01'), email: 'patient@example.test',
    });
    const res = await POST(requete({ idAssignation: 'ASS_1' }));

    expect(res.status).toBe(409);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('refuse 409 un dossier sans adresse, sans rien réserver', async () => {
    prisma.patient.findUnique.mockResolvedValueOnce({ actif: true, suiviClotureLe: null, email: null });
    const res = await POST(requete({ idAssignation: 'ASS_1' }));

    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ reason: 'sans_email' });
    expect(prisma.correspondancePatient.create).not.toHaveBeenCalled();
  });
});
