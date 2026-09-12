import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    filCardLecture: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { POST } from './route';

// Bancs de la route qui consigne une LECTURE de carte du Fil.
//
// Deux invariants portent tout le reste, et ils sont contre-intuitifs :
//
//  1. UNE LECTURE N'EST PAS IDEMPOTENTE. Le refus est un état ; la lecture est
//     un INSTANT, et c'est l'instant qui déplace la coupure. Relire un dossier
//     après un geste neuf DOIT écrire une ligne, sinon ce geste resterait à
//     l'écran pour toujours.
//  2. LA LISTE ÉTROITE EST TENUE AU SERVEUR. Un écran qui n'offre pas un geste
//     ne l'interdit pas ; une requête forgée acquitterait un signalement.

function postRequest(body: unknown): Request {
  return new Request('http://localhost/api/praticien/fil/lecture', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const corps = (partiel: Record<string, unknown> = {}) => ({
  idPatient: 'PAT_SEED_01',
  typeCarte: 'geste_objectif',
  lue: true,
  ...partiel,
});

describe('POST /api/praticien/fil/lecture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'praticien@wellneuro.fr' });
    prisma.filCardLecture.findMany.mockResolvedValue([]);
    prisma.filCardLecture.create.mockResolvedValue({ id: 'l1' });
  });

  it('exige une session', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await POST(postRequest(corps()))).status).toBe(401);
    expect(prisma.filCardLecture.create).not.toHaveBeenCalled();
  });

  it('la lecture est portée par le praticien propriétaire du dossier', async () => {
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'autre@wellneuro.fr' });
    expect((await POST(postRequest(corps()))).status).toBe(403);

    prisma.patient.findUnique.mockResolvedValue(null);
    expect((await POST(postRequest(corps()))).status).toBe(404);
    expect(prisma.filCardLecture.create).not.toHaveBeenCalled();
  });

  it('UNE SESSION SANS E-MAIL est refusée AVANT l’écriture, et non par la base', async () => {
    // `fil_lecture_lecteur_nomme` rendrait un 23514, donc un 500, pour une
    // situation parfaitement identifiable ici. Une trace d'audit anonyme ne se
    // conteste pas — elle ne vaut donc pas d'être écrite.
    getServerSession.mockResolvedValue({ user: {} });
    const reponse = await POST(postRequest(corps()));
    expect(reponse.status).toBe(401);
    expect((await reponse.json()).reason).toBe('lecteur_inconnu');
    expect(prisma.filCardLecture.create).not.toHaveBeenCalled();
  });

  it('consigne une lecture, en nommant son lecteur', async () => {
    const reponse = await POST(postRequest(corps()));
    expect(reponse.status).toBe(201);
    expect(prisma.filCardLecture.create).toHaveBeenCalledTimes(1);
    const { data } = prisma.filCardLecture.create.mock.calls[0][0];
    expect(data).toMatchObject({
      idPatient: 'PAT_SEED_01',
      typeCarte: 'geste_objectif',
      lue: true,
      luePar: 'praticien@wellneuro.fr',
      supersedesLectureId: null,
    });
  });

  it('UNE SECONDE LECTURE S’ÉCRIT — elle n’est pas idempotente, et c’est le point', async () => {
    // Le dossier a déjà été lu à 9 h. Un geste est arrivé depuis, la carte est
    // revenue, le praticien rouvre la fiche. Ne rien écrire laisserait ce geste
    // à l'écran pour toujours : « déjà lu » est vrai de 9 h, faux de maintenant.
    prisma.filCardLecture.findMany.mockResolvedValue([
      { id: 'l0', idPatient: 'PAT_SEED_01', typeCarte: 'geste_objectif', lue: true, lueLe: new Date('2026-09-12T09:00:00.000Z') },
    ]);
    const reponse = await POST(postRequest(corps()));
    expect(reponse.status).toBe(201);
    expect((await reponse.json()).inchange).toBe(false);
    expect(prisma.filCardLecture.create.mock.calls[0][0].data.supersedesLectureId).toBe('l0');
  });

  it('« Remettre » chaîne une ligne d’annulation sur la lecture courante', async () => {
    prisma.filCardLecture.findMany.mockResolvedValue([
      { id: 'l0', idPatient: 'PAT_SEED_01', typeCarte: 'geste_objectif', lue: true, lueLe: new Date('2026-09-12T09:00:00.000Z') },
    ]);
    const reponse = await POST(postRequest(corps({ lue: false })));
    expect(reponse.status).toBe(201);
    expect(prisma.filCardLecture.create.mock.calls[0][0].data).toMatchObject({
      lue: false,
      supersedesLectureId: 'l0',
    });
  });

  it('« Remettre » sur un dossier qu’aucune lecture ne couvre n’écrit RIEN', async () => {
    prisma.filCardLecture.findMany.mockResolvedValue([]);
    const reponse = await POST(postRequest(corps({ lue: false })));
    expect(reponse.status).toBe(200);
    expect((await reponse.json()).inchange).toBe(true);
    expect(prisma.filCardLecture.create).not.toHaveBeenCalled();
  });

  it('« Remettre » sur une lecture DÉJÀ annulée n’écrit rien non plus', async () => {
    // Ordre DESC, comme la route le demande à la base : la ligne courante est
    // la première. Un mock trié à l'envers ferait passer un banc que la
    // production ferait échouer.
    prisma.filCardLecture.findMany.mockResolvedValue([
      { id: 'l1', idPatient: 'PAT_SEED_01', typeCarte: 'geste_objectif', lue: false, lueLe: new Date('2026-09-12T09:05:00.000Z') },
      { id: 'l0', idPatient: 'PAT_SEED_01', typeCarte: 'geste_objectif', lue: true, lueLe: new Date('2026-09-12T09:00:00.000Z') },
    ]);
    const reponse = await POST(postRequest(corps({ lue: false })));
    expect((await reponse.json()).inchange).toBe(true);
    expect(prisma.filCardLecture.create).not.toHaveBeenCalled();
  });

  it('UN TYPE QUI APPELLE UN GESTE AILLEURS est refusé PAR LE SERVEUR', async () => {
    for (const type of ['signalement_trust', 'biologie_arbitree', 'assignation_en_retard', 'synthese_a_valider']) {
      const reponse = await POST(postRequest(corps({ typeCarte: type })));
      expect(reponse.status, type).toBe(400);
      expect((await reponse.json()).reason, type).toBe('type_non_acquittable');
    }
    expect(prisma.filCardLecture.create).not.toHaveBeenCalled();
  });

  it('un type inventé est refusé, et un type vide aussi', async () => {
    expect((await POST(postRequest(corps({ typeCarte: 'inventé' })))).status).toBe(400);
    expect((await POST(postRequest(corps({ typeCarte: '   ' })))).status).toBe(400);
    expect((await POST(postRequest(corps({ typeCarte: undefined })))).status).toBe(400);
    expect(prisma.filCardLecture.create).not.toHaveBeenCalled();
  });

  it('une décision de lecture absente ou non booléenne est refusée', async () => {
    expect((await POST(postRequest(corps({ lue: undefined })))).status).toBe(400);
    expect((await POST(postRequest(corps({ lue: 'oui' })))).status).toBe(400);
    expect(prisma.filCardLecture.create).not.toHaveBeenCalled();
  });

  it('un identifiant patient hors forme est refusé sans toucher la base', async () => {
    expect((await POST(postRequest(corps({ idPatient: '' })))).status).toBe(400);
    expect((await POST(postRequest(corps({ idPatient: 'PAT 01' })))).status).toBe(400);
    expect((await POST(postRequest(corps({ idPatient: 'x'.repeat(65) })))).status).toBe(400);
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
  });

  it('un corps illisible rend 400, pas 500', async () => {
    const requete = new Request('http://localhost/api/praticien/fil/lecture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'pas du json',
    });
    expect((await POST(requete)).status).toBe(400);
  });

  it('une panne d’écriture rend 500 sans détail technique', async () => {
    prisma.filCardLecture.create.mockRejectedValue(new Error('connexion perdue'));
    const reponse = await POST(postRequest(corps()));
    expect(reponse.status).toBe(500);
    const payload = await reponse.json();
    expect(payload.error).toBe('Erreur technique.');
    expect(JSON.stringify(payload)).not.toMatch(/connexion perdue/);
  });
});
