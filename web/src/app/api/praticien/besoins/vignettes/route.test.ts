import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Banc de la route de la vignette du constat sur un besoin ([[D-551]], J3-12f).
// La route ne rend que le verdict et « à relire » : ni le motif, ni la note, ni
// une pièce, ni l'e-mail du praticien. Elle passe par la garde du panneau du
// constat (drapeau avant session, puis session, identifiant, appartenance et
// journal d'accès). Le module `besoins` est simulé, comme au banc voisin : on ne
// lit pas ici le référentiel des sources.

const { getServerSession, prisma, avecScore } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    resultatBiologique: { findMany: vi.fn() },
    annulationResultatBiologique: { findMany: vi.fn() },
    biologyAnalyte: { findMany: vi.fn() },
    questionnaireReponse: { findMany: vi.fn() },
    constatBesoinPraticien: { findMany: vi.fn() },
    journalAccesDossier: { create: vi.fn(), deleteMany: vi.fn() },
  },
  avecScore: new Set<number>(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/dateParis', () => ({ dateJourParis: () => '2026-11-25' }));
vi.mock('@/lib/constats-besoin/besoins', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/constats-besoin/besoins')>()),
  besoinsConstatablesAvecScore: () => new Set(avecScore),
}));

import { GET } from './route';

const PRATICIEN = 'praticien@wellneuro.fr';
const NOTE_SENTINELLE = 'NOTE-SENTINELLE-NE-DOIT-PAS-SORTIR';
const lecture = (idPatient = 'PAT1') =>
  GET(new Request(`http://localhost/api/praticien/besoins/vignettes?idPatient=${idPatient}`));

const acteLu = (surcharge: Record<string, unknown> = {}) => ({
  id: 'c1',
  ordre: BigInt(1),
  acte: 'pose',
  besoin: 6,
  verdict: 'non_evaluable',
  motif: 'non_aborde',
  note: NOTE_SENTINELLE,
  aRevoirLe: null,
  idConstatRemplace: null,
  praticienEmail: PRATICIEN,
  acteLe: new Date('2026-11-10T09:00:00.000Z'),
  pieces: [],
  ...surcharge,
});

beforeEach(() => {
  vi.clearAllMocks();
  avecScore.clear();
  process.env.WN_CONSTAT_BESOIN = 'true';
  getServerSession.mockResolvedValue({ user: { email: PRATICIEN } });
  prisma.patient.findUnique.mockResolvedValue({ praticienEmail: PRATICIEN, actif: true, suiviClotureLe: null });
  prisma.resultatBiologique.findMany.mockResolvedValue([]);
  prisma.annulationResultatBiologique.findMany.mockResolvedValue([]);
  prisma.biologyAnalyte.findMany.mockResolvedValue([]);
  prisma.questionnaireReponse.findMany.mockResolvedValue([]);
  prisma.constatBesoinPraticien.findMany.mockResolvedValue([]);
  prisma.journalAccesDossier.create.mockResolvedValue({});
  prisma.journalAccesDossier.deleteMany.mockResolvedValue({ count: 0 });
});

afterEach(() => {
  delete process.env.WN_CONSTAT_BESOIN;
  vi.restoreAllMocks();
});

describe('GET /api/praticien/besoins/vignettes — les refus, dans l’ordre', () => {
  it('drapeau éteint (ou absent) : 503 avant toute lecture, même sans session', async () => {
    delete process.env.WN_CONSTAT_BESOIN;
    expect((await lecture()).status).toBe(503);
    process.env.WN_CONSTAT_BESOIN = 'false';
    expect((await lecture()).status).toBe(503);
    expect(getServerSession).not.toHaveBeenCalled();
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
    expect(prisma.constatBesoinPraticien.findMany).not.toHaveBeenCalled();
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });

  it('sans session : 401, rien lu, rien journalisé', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await lecture()).status).toBe(401);
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });

  it('identifiant absent ou invalide : 400, rien lu', async () => {
    expect((await lecture('')).status).toBe(400);
    expect((await lecture('PAT 1;DROP')).status).toBe(400);
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
    expect(prisma.constatBesoinPraticien.findMany).not.toHaveBeenCalled();
  });

  it('dossier introuvable : 404 ; dossier d’un autre praticien : 403 ; rien lu, rien journalisé', async () => {
    prisma.patient.findUnique.mockResolvedValue(null);
    expect((await lecture()).status).toBe(404);
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'autre@wellneuro.fr', actif: true, suiviClotureLe: null });
    expect((await lecture()).status).toBe(403);
    expect(prisma.constatBesoinPraticien.findMany).not.toHaveBeenCalled();
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });
});

describe('GET /api/praticien/besoins/vignettes — ce que la route rend', () => {
  it('l’accès se journalise après la garde, et la lecture suit', async () => {
    const response = await lecture();
    expect(response.status).toBe(200);
    expect(prisma.journalAccesDossier.create).toHaveBeenCalled();
    expect(prisma.constatBesoinPraticien.findMany).toHaveBeenCalled();
  });

  it('projection stricte : le verdict et « à relire », sans motif, note, pièce ni e-mail du praticien', async () => {
    prisma.constatBesoinPraticien.findMany.mockResolvedValue([acteLu()]);
    const response = await lecture();
    const corps = await response.json();
    expect(corps).toEqual({ ok: true, vignettes: { 6: { verdict: 'non_evaluable', aRelire: false } } });
    const brut = JSON.stringify(corps);
    expect(brut).not.toContain(NOTE_SENTINELLE);
    expect(brut).not.toContain('non_aborde');
    expect(brut).not.toContain(PRATICIEN);
    expect(brut).not.toContain('pieces');
  });

  it('un besoin sans constat n’a pas de clé ; un retrait vide la tête', async () => {
    prisma.constatBesoinPraticien.findMany.mockResolvedValue([
      acteLu({ id: 'c1', ordre: BigInt(1), besoin: 7, verdict: 'a_soutenir', motif: null }),
      acteLu({ id: 'c2', ordre: BigInt(2), acte: 'retrait', besoin: 7, verdict: null, motif: null, note: null, idConstatRemplace: 'c1' }),
    ]);
    const corps = await (await lecture()).json();
    expect(corps).toEqual({ ok: true, vignettes: {} });
  });

  it('un besoin qui porte une source de score n’a plus de vignette (D-551 §3)', async () => {
    avecScore.add(6);
    prisma.constatBesoinPraticien.findMany.mockResolvedValue([acteLu()]);
    const corps = await (await lecture()).json();
    expect(corps).toEqual({ ok: true, vignettes: {} });
  });

  it('une erreur de lecture : 500 sans le message de l’erreur, ni dans la réponse ni au journal', async () => {
    const sentinelle = 'MESSAGE-DE-LERREUR-A-NE-PAS-RECOPIER';
    const erreur = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    prisma.constatBesoinPraticien.findMany.mockRejectedValue(new Error(sentinelle));
    const response = await lecture();
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain(sentinelle);
    expect(JSON.stringify(erreur.mock.calls)).not.toContain(sentinelle);
  });
});
