import { beforeEach, describe, expect, it, vi } from 'vitest';

// L'ÉTAT DE LA PHASE 3 N'AVAIT AUCUN BANC (constaté le 2026-09-11 par une
// mutation qui a SURVÉCU : « la route compte TOUTES les demandes, closes
// comprises »). Le rail sert de feu pour passer à la prise de décision
// (`D-161` §10) ; une route qui le nourrit sans banc est un feu sans ampoule
// testée.
//
// Style « signature réelle » : seuls Prisma et la session sont moqués.

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    objectifNegocie: { findMany: vi.fn() },
    finObjectif: { findMany: vi.fn() },
    syntheseComprehension: { findMany: vi.fn() },
    // LECTURE SEULE : aucun verbe d'écriture n'est moqué. Une route de RAIL qui
    // écrirait une demande de patient lèverait ici, bruyamment.
    demandeCorrectionObjectif: { findMany: vi.fn() },
    // `deleteMany` compris : la journalisation PURGE aussi (`G-TRUST-04`), et
    // son absence faisait tomber la trace dans son propre `catch` — vert au
    // banc, muet sur le vrai défaut.
    journalAccesDossier: { create: vi.fn(), deleteMany: vi.fn() },
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { GET } from './route';

const URL_BASE = 'http://localhost/api/praticien/objectifs/etat-phase';
const requete = (query = 'idPatient=PAT_TEST') => new Request(`${URL_BASE}?${query}`);

const objectif = (id: string, supersedes: string | null = null) => ({
  id,
  supersedesObjectifId: supersedes,
  creeLe: new Date('2026-09-01T10:00:00.000Z'),
});

const abandon = (racine: string) => ({
  id: `FIN_${racine}`,
  racineObjectifId: racine,
  motif: 'abandonne',
  voix: 'praticien',
  consigneePar: 'praticien@wellneuro.fr',
  sens: 'declare',
  creeLe: new Date('2026-09-05T10:00:00.000Z'),
});

const demande = (id: string, idObjectif: string) => ({
  id,
  idObjectif,
  creeLe: new Date('2026-09-11T18:20:00.000Z'),
});

async function lireEtat(): Promise<Record<string, unknown>> {
  const reponse = await GET(requete());
  const corps = (await reponse.json()) as { ok: boolean; etat: Record<string, unknown> };
  expect(corps.ok).toBe(true);
  return corps.etat;
}

describe('GET /api/praticien/objectifs/etat-phase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({
      praticienEmail: 'praticien@wellneuro.fr',
      actif: true,
    });
    prisma.objectifNegocie.findMany.mockResolvedValue([objectif('OBJ_1')]);
    prisma.finObjectif.findMany.mockResolvedValue([]);
    prisma.syntheseComprehension.findMany.mockResolvedValue([
      { id: 'SYN_1', publieeLe: new Date('2026-09-02T10:00:00.000Z'), supersedesSyntheseId: null, creeLe: new Date('2026-09-02T09:00:00.000Z') },
    ]);
    prisma.demandeCorrectionObjectif.findMany.mockResolvedValue([]);
  });

  it('un dossier complet sans demande : objectif actif, synthèse publiée, zéro demande', async () => {
    expect(await lireEtat()).toEqual({
      objectifsActifs: 1,
      synthesePubliee: true,
      demandesCorrectionEnAttente: 0,
    });
  });

  it('UNE DEMANDE SUR LA TÊTE COURANTE est en attente', async () => {
    prisma.demandeCorrectionObjectif.findMany.mockResolvedValue([demande('DEM_1', 'OBJ_1')]);
    expect((await lireEtat()).demandesCorrectionEnAttente).toBe(1);
  });

  it('LA REFORMULATION LA REFERME — la v1 n’est plus une tête', async () => {
    // C'est l'invariant du chantier : le praticien répond en reformulant, et
    // rien ne se coche. Compter `demandes.length` ferait réclamer indéfiniment
    // une reprise déjà faite.
    prisma.objectifNegocie.findMany.mockResolvedValue([objectif('OBJ_1'), objectif('OBJ_2', 'OBJ_1')]);
    prisma.demandeCorrectionObjectif.findMany.mockResolvedValue([demande('DEM_1', 'OBJ_1')]);
    expect((await lireEtat()).demandesCorrectionEnAttente).toBe(0);
  });

  it('UNE CHAÎNE CLOSE NE LAISSE RIEN EN ATTENTE — on ne réclame pas de reformuler un objectif abandonné', async () => {
    prisma.finObjectif.findMany.mockResolvedValue([abandon('OBJ_1')]);
    prisma.demandeCorrectionObjectif.findMany.mockResolvedValue([demande('DEM_1', 'OBJ_1')]);
    expect(await lireEtat()).toMatchObject({
      objectifsActifs: 0,
      demandesCorrectionEnAttente: 0,
    });
  });

  it('deux demandes sur la même tête comptent pour deux — le rail lit « y en a-t-il »', async () => {
    prisma.demandeCorrectionObjectif.findMany.mockResolvedValue([
      demande('DEM_1', 'OBJ_1'),
      demande('DEM_2', 'OBJ_1'),
    ]);
    expect((await lireEtat()).demandesCorrectionEnAttente).toBe(2);
  });

  it('AUCUN TEXTE NE SORT D’ICI — la lecture ne sélectionne pas `texte`', async () => {
    // Le rail dit qu'une demande attend, il ne raconte pas ce qu'elle dit. Une
    // seconde surface de lecture de la prose du dossier s'ouvrirait pour rien.
    await GET(requete());
    const select = prisma.demandeCorrectionObjectif.findMany.mock.calls[0][0].select;
    expect(select).not.toHaveProperty('texte');
  });

  it('la lecture est SCOPÉE au dossier demandé', async () => {
    await GET(requete());
    const where = prisma.demandeCorrectionObjectif.findMany.mock.calls[0][0].where;
    expect(where).toEqual({ idPatient: 'PAT_TEST' });
  });

  it('sans session, rien n’est lu', async () => {
    getServerSession.mockResolvedValue(null);
    const reponse = await GET(requete());
    expect(reponse.status).toBe(401);
    expect(prisma.demandeCorrectionObjectif.findMany).not.toHaveBeenCalled();
  });

  it('sur un dossier d’un AUTRE praticien, rien n’est lu', async () => {
    prisma.patient.findUnique.mockResolvedValue({
      praticienEmail: 'quelquun.dautre@wellneuro.fr',
      actif: true,
    });
    const reponse = await GET(requete());
    expect(reponse.status).toBe(403);
    expect(prisma.demandeCorrectionObjectif.findMany).not.toHaveBeenCalled();
  });
});
