import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    assignation: { findFirst: vi.fn(), updateMany: vi.fn() },
    questionnaireReponse: { count: vi.fn() },
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/praticien/appartenance', () => ({
  emailPraticien: (s: { user?: { email?: string } } | null) => s?.user?.email?.toLowerCase() ?? null,
  filtrePatientsDuPraticien: (email: string) => ({ praticienEmail: { equals: email, mode: 'insensitive' } }),
}));

import { POST } from './route';

const req = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) });

describe('POST /api/praticien/assignations/annulation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    // Assignation ouverte du praticien de session par défaut.
    prisma.assignation.findFirst.mockResolvedValue({ statut: 'En attente', statutReponses: 'non_rempli' });
    prisma.assignation.updateMany.mockResolvedValue({ count: 1 });
    // Défaut à 0 : sans lui, les 7 tests préexistants (qui ignorent le
    // comptage) tomberaient sur `undefined` — `estAnnulable` recevrait
    // `aPassation: NaN > 0` et le comportement deviendrait imprévisible.
    prisma.questionnaireReponse.count.mockResolvedValue(0);
  });

  it('sans session : 401, aucune écriture', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await POST(req({ idAssignation: 'ASS_1' }))).status).toBe(401);
    expect(prisma.assignation.updateMany).not.toHaveBeenCalled();
  });

  it('identifiant absent : 400, aucune écriture', async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
    expect(prisma.assignation.updateMany).not.toHaveBeenCalled();
  });

  it('assignation d’un autre praticien : 404, aucune écriture', async () => {
    // La garde d'appartenance (findFirst scopé) ne la trouve pas.
    prisma.assignation.findFirst.mockResolvedValue(null);
    const res = await POST(req({ idAssignation: 'ASS_1' }));
    expect(res.status).toBe(404);
    expect(prisma.assignation.updateMany).not.toHaveBeenCalled();
  });

  it('annule une ouverte en posant statut = Annulée (un updateMany, jamais un delete)', async () => {
    const res = await POST(req({ idAssignation: 'ASS_1' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    const appel = prisma.assignation.updateMany.mock.calls[0][0];
    expect(appel.data.statut).toBe('Annulée');
    // La garde d'état est répétée dans le `where` de l'écriture, pas
    // seulement lue en amont — c'est elle qui rétrécit la course avec `submit`.
    expect(appel.where).toEqual({
      idAssignation: 'ASS_1',
      statut: { not: 'Complété' },
      statutReponses: { in: ['non_rempli', 'deverrouille'] },
    });
    // Le mock n'expose PAS de méthode `delete` : une suppression casserait la
    // suite, ce que la route ne fait jamais (statut daté, patron rendez-vous).
    expect('delete' in prisma.assignation).toBe(false);
  });

  it('refuse une assignation soumise (verrouille) : 409, statut inchangé', async () => {
    prisma.assignation.findFirst.mockResolvedValue({ statut: 'Complété', statutReponses: 'verrouille' });
    const res = await POST(req({ idAssignation: 'ASS_1' }));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ ok: false, reason: 'already_filled' });
    expect(prisma.assignation.updateMany).not.toHaveBeenCalled();
  });

  it('refuse une correction en cours (modification_demandee) : 409', async () => {
    prisma.assignation.findFirst.mockResolvedValue({ statut: 'Complété', statutReponses: 'modification_demandee' });
    expect((await POST(req({ idAssignation: 'ASS_1' }))).status).toBe(409);
    expect(prisma.assignation.updateMany).not.toHaveBeenCalled();
  });

  it('refuse une incohérence statut=Complété malgré non_rempli : 409', async () => {
    // Isole la clause `|| statut === 'Complété'` du garde de portée : sans elle,
    // cette incohérence passerait (statutReponses vaut bien 'non_rempli').
    prisma.assignation.findFirst.mockResolvedValue({ statut: 'Complété', statutReponses: 'non_rempli' });
    expect((await POST(req({ idAssignation: 'ASS_1' }))).status).toBe(409);
    expect(prisma.assignation.updateMany).not.toHaveBeenCalled();
  });

  it('idempotent : une assignation déjà annulée n’est pas ré-écrite', async () => {
    prisma.assignation.findFirst.mockResolvedValue({ statut: 'Annulée', statutReponses: 'non_rempli' });
    const res = await POST(req({ idAssignation: 'ASS_1' }));
    expect(res.status).toBe(200);
    expect(prisma.assignation.updateMany).not.toHaveBeenCalled();
  });

  // Le court-circuit d'état refuse AVANT toute lecture des réponses : le
  // comptage serait une requête inutile pour le refus le plus fréquent.
  it('le comptage n’est pas émis quand la clause d’état refuse déjà', async () => {
    prisma.assignation.findFirst.mockResolvedValue({ statut: 'Complété', statutReponses: 'verrouille' });
    await POST(req({ idAssignation: 'ASS_1' }));
    expect(prisma.questionnaireReponse.count).not.toHaveBeenCalled();
  });

  // Contrôle négatif du test précédent : sur le cas qui passe le
  // court-circuit, le comptage EST émis.
  it('le comptage est émis quand la clause d’état laisse passer', async () => {
    await POST(req({ idAssignation: 'ASS_1' }));
    expect(prisma.questionnaireReponse.count).toHaveBeenCalledWith({ where: { idAssignation: 'ASS_1' } });
  });

  it('deverrouille sans réponse : 200, Annulée écrit — une réouverture n’atteste rien', async () => {
    prisma.assignation.findFirst.mockResolvedValue({ statut: 'En attente', statutReponses: 'deverrouille' });
    prisma.questionnaireReponse.count.mockResolvedValue(0);
    const res = await POST(req({ idAssignation: 'ASS_1' }));
    expect(res.status).toBe(200);
    expect(prisma.assignation.updateMany).toHaveBeenCalledOnce();
  });

  it('deverrouille avec une réponse existante : 409, aucune écriture — la course avec submit', async () => {
    prisma.assignation.findFirst.mockResolvedValue({ statut: 'En attente', statutReponses: 'deverrouille' });
    prisma.questionnaireReponse.count.mockResolvedValue(1);
    const res = await POST(req({ idAssignation: 'ASS_1' }));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ ok: false, reason: 'already_filled' });
    expect(prisma.assignation.updateMany).not.toHaveBeenCalled();
  });

  // Non-régression : le cas d'un agenda alimentaire (Q_ALI_09) portant des
  // journées notées. Noter une journée n'écrit que `AgendaAlimentaireJour`,
  // jamais `statutReponses` : le statut reste `non_rempli` et le comptage de
  // `QuestionnaireReponse` reste à 0, donc annulable — c'est l'intention
  // (arrêter un recueil en cours), pas un oubli.
  it('non_rempli, aucune réponse (agenda en cours de recueil) : 200', async () => {
    prisma.assignation.findFirst.mockResolvedValue({ statut: 'En attente', statutReponses: 'non_rempli' });
    prisma.questionnaireReponse.count.mockResolvedValue(0);
    const res = await POST(req({ idAssignation: 'ASS_1' }));
    expect(res.status).toBe(200);
    expect(prisma.assignation.updateMany).toHaveBeenCalledOnce();
  });

  // Le cas qui motive tout le lot : `submit` crée la réponse PUIS marque
  // l'assignation, hors transaction. Entre les deux, l'état lu est encore
  // `non_rempli` — seul le comptage voit la passation. Ce test échoue sur le
  // code d'avant, qui acceptait (200) et écrivait une annulation que
  // `submit` réécrasait aussitôt.
  it('non_rempli mais une réponse existe (course avec submit) : 409, aucune écriture', async () => {
    prisma.assignation.findFirst.mockResolvedValue({ statut: 'En attente', statutReponses: 'non_rempli' });
    prisma.questionnaireReponse.count.mockResolvedValue(1);
    const res = await POST(req({ idAssignation: 'ASS_1' }));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ ok: false, reason: 'already_filled' });
    expect(prisma.assignation.updateMany).not.toHaveBeenCalled();
  });

  // Zéro ligne touchée : l'état a bougé entre le comptage et l'écriture. La
  // garde répétée dans le `where` de l'`updateMany` a donc joué son rôle — et
  // rendre `ok: true` referait le défaut sous un autre nom.
  it('écriture sans effet (l’état a bougé entre le comptage et l’updateMany) : 409, jamais ok', async () => {
    prisma.assignation.findFirst.mockResolvedValue({ statut: 'En attente', statutReponses: 'non_rempli' });
    prisma.questionnaireReponse.count.mockResolvedValue(0);
    prisma.assignation.updateMany.mockResolvedValue({ count: 0 });
    const res = await POST(req({ idAssignation: 'ASS_1' }));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ ok: false, reason: 'already_filled' });
  });

  // Contrôle négatif du précédent : la même séquence avec une ligne touchée
  // rend bien 200 — sinon le test ci-dessus serait vert par construction.
  it('contrôle négatif — une ligne touchée rend bien 200', async () => {
    prisma.assignation.updateMany.mockResolvedValue({ count: 1 });
    const res = await POST(req({ idAssignation: 'ASS_1' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
