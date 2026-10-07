import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Banc de la saisie GROUPÉE (BIO-INGEST LOT-01, A3 de D-256). Le cas qui
// fonde le lot : 9 lignes valides et une 10e refusée ⇒ RIEN n'est écrit, et
// le refus nomme la ligne. Une transaction qui ne partirait jamais est
// prouvée par `$transaction` non appelé — pas par une table vide, que les
// mocks rendraient vide de toute façon.

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    biologyAnalyte: { findMany: vi.fn() },
    resultatBiologique: { findMany: vi.fn(), create: vi.fn() },
    journalAccesDossier: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { Prisma } from '@/generated/prisma';
import { POST } from './route';

const URL_BILAN = 'http://localhost/api/praticien/biologie/resultats/bilan';
const PRATICIEN = 'praticien@wellneuro.fr';
const PRELEVE_LE = '2026-09-01T08:00:00.000Z';

function postRequest(body: unknown): Request {
  return new Request(URL_BILAN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** Dix analytes actifs au catalogue, chacun avec son unité. */
const CATALOGUE = Array.from({ length: 10 }, (_, i) => ({
  code: `BIO_A${i}`,
  unite: `u${i}`,
  actif: true,
}));

function bilan(lignes: unknown[], extra: Record<string, unknown> = {}) {
  return { idPatient: 'PAT1', preleveLe: PRELEVE_LE, lignes, ...extra };
}

const DEUX_LIGNES = [
  { analyteCode: 'BIO_A0', valeur: '42,5' },
  { analyteCode: 'BIO_A1', valeur: '7' },
];

beforeEach(() => {
  vi.clearAllMocks();
  process.env.WN_CB_ENABLED = 'true';
  process.env.WN_CB_RESULTS_ENABLED = 'true';
  getServerSession.mockResolvedValue({ user: { email: PRATICIEN } });
  prisma.patient.findUnique.mockResolvedValue({
    praticienEmail: PRATICIEN,
    actif: true,
    suiviClotureLe: null,
  });
  prisma.biologyAnalyte.findMany.mockImplementation(
    async ({ where }: { where: { code: { in: string[] } } }) =>
      CATALOGUE.filter(a => where.code.in.includes(a.code)),
  );
  // Par défaut : aucune mesure déjà consignée à cet horodatage.
  prisma.resultatBiologique.findMany.mockResolvedValue([]);
  // `create` rend une promesse-témoin : la transaction tableau les reçoit.
  prisma.resultatBiologique.create.mockImplementation((args: unknown) => ({ args }));
  prisma.$transaction.mockImplementation(async (ops: unknown[]) => ops.map((_, i) => ({ id: `r${i}` })));
});

afterEach(() => {
  delete process.env.WN_CB_ENABLED;
  delete process.env.WN_CB_RESULTS_ENABLED;
});

/** Les `data` passées à `create`, dans l'ordre du bilan. */
function donneesEcrites() {
  return prisma.resultatBiologique.create.mock.calls.map(c => (c[0] as { data: Record<string, unknown> }).data);
}

describe('bilan — tout ou rien (A3)', () => {
  it('9 lignes valides + 1 invalide ⇒ RIEN n’est écrit, la 10e ligne est nommée', async () => {
    const lignes = CATALOGUE.map((a, i) => ({ analyteCode: a.code, valeur: i === 9 ? 'abc' : String(i + 1) }));
    const response = await POST(postRequest(bilan(lignes)));
    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.reason).toBe('lignes_invalides');
    expect(payload.error).toMatch(/Rien n’a été enregistré/);
    expect(payload.lignes).toEqual([
      { index: 9, reason: 'valeur_invalide', error: 'La valeur mesurée doit être un nombre.' },
    ]);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.resultatBiologique.create).not.toHaveBeenCalled();
  });

  it('10 lignes valides ⇒ UNE transaction de 10 créations, 201', async () => {
    const lignes = CATALOGUE.map((a, i) => ({ analyteCode: a.code, valeur: String(i + 1) }));
    const response = await POST(postRequest(bilan(lignes)));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true, nombre: 10 });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect((prisma.$transaction.mock.calls[0][0] as unknown[]).length).toBe(10);
  });

  it('TOUS les refus sont collectés — pas d’arrêt à la première ligne', async () => {
    const response = await POST(
      postRequest(
        bilan([
          { analyteCode: 'BIO_A0', valeur: 'x' },
          { analyteCode: 'BIO_A1', valeur: '1' },
          { analyteCode: 'BIO_INCONNU', valeur: '2' },
        ]),
      ),
    );
    const payload = await response.json();
    expect(payload.lignes.map((l: { index: number; reason: string }) => [l.index, l.reason])).toEqual([
      [0, 'valeur_invalide'],
      [2, 'analyte_inconnu'],
    ]);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('les refus sont rendus dans l’ordre du bilan, quel que soit l’étage qui les a posés', async () => {
    const response = await POST(
      postRequest(
        bilan([
          { analyteCode: 'BIO_INCONNU', valeur: '1' },
          { analyteCode: 'BIO_A1', valeur: 'x' },
        ]),
      ),
    );
    const payload = await response.json();
    expect(payload.lignes.map((l: { index: number }) => l.index)).toEqual([0, 1]);
  });

  it('un P2002 DANS la transaction (course) : 409, et c’est la transaction entière qui tombe', async () => {
    prisma.$transaction.mockRejectedValueOnce(Object.assign(new Error('unique'), { code: 'P2002' }));
    const response = await POST(postRequest(bilan(DEUX_LIGNES)));
    expect(response.status).toBe(409);
    expect((await response.json()).reason).toBe('doublon_mesure');
  });
});

describe('bilan — ce que le serveur pose, et lui seul', () => {
  it('unité DE L’ANALYTE, source et auteur posés serveur ; la date est commune', async () => {
    const response = await POST(
      postRequest(
        bilan([
          { analyteCode: 'BIO_A0', valeur: '42,5', unite: 'mg/L', source: 'import_labo', saisiPar: 'x@y.fr' },
          { analyteCode: 'BIO_A1', valeur: '7' },
        ]),
      ),
    );
    expect(response.status).toBe(201);
    expect(donneesEcrites()).toEqual([
      {
        idPatient: 'PAT1',
        analyteCode: 'BIO_A0',
        valeur: new Prisma.Decimal('42.5'),
        unite: 'u0',
        preleveLe: new Date(PRELEVE_LE),
        source: 'saisie_praticien',
        saisiPar: PRATICIEN,
        supersedesResultatId: null,
      },
      {
        idPatient: 'PAT1',
        analyteCode: 'BIO_A1',
        valeur: new Prisma.Decimal('7'),
        unite: 'u1',
        preleveLe: new Date(PRELEVE_LE),
        source: 'saisie_praticien',
        saisiPar: PRATICIEN,
        supersedesResultatId: null,
      },
    ]);
  });

  it('un analyte sans unité au catalogue se consigne SANS unité — jamais une unité inventée', async () => {
    prisma.biologyAnalyte.findMany.mockResolvedValueOnce([{ code: 'BIO_A0', unite: null, actif: true }]);
    await POST(postRequest(bilan([{ analyteCode: 'BIO_A0', valeur: '3', unite: 'mg/L' }])));
    expect(donneesEcrites()[0].unite).toBeNull();
  });

  it('une ligne qui porte `supersedesResultatId` est REFUSÉE — un bilan ne corrige rien', async () => {
    const response = await POST(
      postRequest(bilan([{ analyteCode: 'BIO_A0', valeur: '1', supersedesResultatId: 'res1' }, DEUX_LIGNES[1]])),
    );
    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.lignes).toEqual([
      expect.objectContaining({ index: 0, reason: 'correction_hors_bilan' }),
    ]);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('`supersedesResultatId: null` vaut absence de chaîne : la ligne passe', async () => {
    const response = await POST(
      postRequest(bilan([{ analyteCode: 'BIO_A0', valeur: '1', supersedesResultatId: null }])),
    );
    expect(response.status).toBe(201);
  });
});

describe('bilan — refus par ligne', () => {
  it('doublon EN BASE (même analyte, même horodatage) : 409, la ligne est nommée', async () => {
    prisma.resultatBiologique.findMany.mockResolvedValueOnce([{ analyteCode: 'BIO_A1' }]);
    const response = await POST(postRequest(bilan(DEUX_LIGNES)));
    expect(response.status).toBe(409);
    const payload = await response.json();
    expect(payload.lignes).toEqual([
      expect.objectContaining({ index: 1, reason: 'doublon_mesure', error: expect.stringMatching(/horodatage exact/) }),
    ]);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('la recherche de doublon vise la clé de l’unicité partielle — et le seul dossier', async () => {
    await POST(postRequest(bilan(DEUX_LIGNES)));
    expect(prisma.resultatBiologique.findMany).toHaveBeenCalledWith({
      where: {
        idPatient: 'PAT1',
        preleveLe: new Date(PRELEVE_LE),
        analyteCode: { in: ['BIO_A0', 'BIO_A1'] },
        supersedesResultatId: null,
      },
      select: { analyteCode: true },
    });
  });

  it('le même analyte deux fois dans le bilan : la SECONDE ligne est refusée, 400', async () => {
    const response = await POST(
      postRequest(bilan([{ analyteCode: 'BIO_A0', valeur: '1' }, { analyteCode: ' BIO_A0 ', valeur: '2' }])),
    );
    expect(response.status).toBe(400);
    expect((await response.json()).lignes).toEqual([
      expect.objectContaining({ index: 1, reason: 'analyte_en_double' }),
    ]);
  });

  it('le doublon interne se voit MÊME si la première ligne a une valeur invalide — un seul passage', async () => {
    const response = await POST(
      postRequest(bilan([{ analyteCode: 'BIO_A0', valeur: 'abc' }, { analyteCode: 'BIO_A0', valeur: '2' }])),
    );
    expect((await response.json()).lignes.map((l: { index: number; reason: string }) => [l.index, l.reason])).toEqual([
      [0, 'valeur_invalide'],
      [1, 'analyte_en_double'],
    ]);
  });

  it('analyte inconnu : 409 nommé', async () => {
    const response = await POST(postRequest(bilan([{ analyteCode: 'BIO_ZZZ', valeur: '1' }])));
    expect(response.status).toBe(409);
    expect((await response.json()).lignes[0].reason).toBe('analyte_inconnu');
  });

  it('analyte inactif : pas de nouvelle mesure sur une fiche retirée', async () => {
    prisma.biologyAnalyte.findMany.mockResolvedValueOnce([{ code: 'BIO_A0', unite: 'u0', actif: false }]);
    const response = await POST(postRequest(bilan([{ analyteCode: 'BIO_A0', valeur: '1' }])));
    expect(response.status).toBe(409);
    expect((await response.json()).lignes[0].reason).toBe('analyte_inactif');
  });

  it('ligne sans analyte, ou ligne qui n’est pas un objet : refus de forme nommé', async () => {
    const response = await POST(postRequest(bilan([{ valeur: '1' }, null, DEUX_LIGNES[0]])));
    expect(response.status).toBe(400);
    expect((await response.json()).lignes.map((l: { index: number; reason: string }) => [l.index, l.reason])).toEqual([
      [0, 'analyte_absent'],
      [1, 'analyte_absent'],
    ]);
  });

  it('une valeur en NOMBRE JSON (42.5) est refusée, comme en unitaire — l’exactitude est déjà perdue', async () => {
    const response = await POST(postRequest(bilan([{ analyteCode: 'BIO_A0', valeur: 42.5 }])));
    expect((await response.json()).lignes[0].reason).toBe('valeur_invalide');
  });

  it('chaque ligne s’écrit en `Decimal` EXACT : aucun flottant entre la saisie et la colonne (LOT-10)', async () => {
    const response = await POST(
      postRequest(
        bilan([
          { analyteCode: 'BIO_A0', valeur: '0,30000000000000004' },
          { analyteCode: 'BIO_A1', valeur: '007,500' },
          { analyteCode: 'BIO_A2', valeur: `${'9'.repeat(35)},${'9'.repeat(30)}` },
        ]),
      ),
    );
    expect(response.status).toBe(201);
    const valeurs = donneesEcrites().map(d => {
      expect(d.valeur).toBeInstanceOf(Prisma.Decimal);
      return (d.valeur as InstanceType<typeof Prisma.Decimal>).toFixed();
    });
    expect(valeurs).toEqual(['0.30000000000000004', '7.5', `${'9'.repeat(35)}.${'9'.repeat(30)}`]);
  });

  it('une valeur au-delà de la capacité DECIMAL(65,30) : refus motivé, jamais un 500', async () => {
    const response = await POST(postRequest(bilan([{ analyteCode: 'BIO_A0', valeur: `1${'0'.repeat(35)}` }])));
    expect(response.status).toBe(400);
    expect((await response.json()).lignes[0].reason).toBe('valeur_hors_capacite');
  });

  it('refus d’état et de forme mêlés : 400 — la faute est d’abord au corps', async () => {
    const response = await POST(
      postRequest(bilan([{ analyteCode: 'BIO_ZZZ', valeur: '1' }, { analyteCode: 'BIO_A1', valeur: 'x' }])),
    );
    expect(response.status).toBe(400);
  });
});

describe('bilan — refus du bilan entier', () => {
  it('date future (au-delà de 24 h) : refus GLOBAL, sans ligne', async () => {
    const futur = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const response = await POST(postRequest(bilan(DEUX_LIGNES, { preleveLe: futur })));
    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.reason).toBe('date_future');
    expect(payload.lignes).toBeUndefined();
    expect(prisma.biologyAnalyte.findMany).not.toHaveBeenCalled();
  });

  it('date illisible ou absente : refus global', async () => {
    for (const preleveLe of ['pas une date', undefined, '']) {
      const response = await POST(postRequest(bilan(DEUX_LIGNES, { preleveLe })));
      expect((await response.json()).reason).toBe('date_invalide');
    }
  });

  it('bilan vide : 400', async () => {
    const response = await POST(postRequest(bilan([])));
    expect(response.status).toBe(400);
    expect((await response.json()).reason).toBe('bilan_vide');
  });

  it('bilan au-delà de la borne technique : 400, aucune lecture', async () => {
    const lignes = Array.from({ length: 101 }, (_, i) => ({ analyteCode: `BIO_${i}`, valeur: '1' }));
    const response = await POST(postRequest(bilan(lignes)));
    expect(response.status).toBe(400);
    expect((await response.json()).reason).toBe('bilan_trop_long');
    expect(prisma.patient.findUnique).toHaveBeenCalledTimes(1); // la seule lecture : l'appartenance
    expect(prisma.biologyAnalyte.findMany).not.toHaveBeenCalled();
  });

  it('`lignes` absent ou non tableau : 400', async () => {
    for (const lignes of [undefined, 'x', { a: 1 }]) {
      const response = await POST(postRequest({ idPatient: 'PAT1', preleveLe: PRELEVE_LE, lignes }));
      expect(response.status).toBe(400);
    }
  });

  it('un corps JSON `null` est un 400, jamais un 500 pré-auth', async () => {
    const response = await POST(postRequest(null));
    expect(response.status).toBe(400);
    expect(getServerSession).not.toHaveBeenCalled();
  });

  it('dossier clos : 409, rien n’est lu du catalogue ni écrit', async () => {
    prisma.patient.findUnique.mockResolvedValue({
      praticienEmail: PRATICIEN,
      actif: true,
      suiviClotureLe: new Date('2026-08-01T00:00:00.000Z'),
    });
    const response = await POST(postRequest(bilan(DEUX_LIGNES)));
    expect(response.status).toBe(409);
    expect(prisma.biologyAnalyte.findMany).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('bilan — gardes fail-closed', () => {
  it('drapeau résultats absent : 503, rien n’est lu', async () => {
    delete process.env.WN_CB_RESULTS_ENABLED;
    const response = await POST(postRequest(bilan(DEUX_LIGNES)));
    expect(response.status).toBe(503);
    expect(getServerSession).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('le drapeau résultats sans le rayon ne suffit pas : 503', async () => {
    delete process.env.WN_CB_ENABLED;
    const response = await POST(postRequest(bilan(DEUX_LIGNES)));
    expect(response.status).toBe(503);
  });

  it('sans session : 401', async () => {
    getServerSession.mockResolvedValue(null);
    const response = await POST(postRequest(bilan(DEUX_LIGNES)));
    expect(response.status).toBe(401);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('patient d’un autre praticien : 403, le catalogue n’est même pas lu', async () => {
    prisma.patient.findUnique.mockResolvedValue({
      praticienEmail: 'autre@wellneuro.fr',
      actif: true,
      suiviClotureLe: null,
    });
    const response = await POST(postRequest(bilan(DEUX_LIGNES)));
    expect(response.status).toBe(403);
    expect(prisma.biologyAnalyte.findMany).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('identifiant patient invalide : 400 avant toute lecture', async () => {
    const response = await POST(postRequest(bilan(DEUX_LIGNES, { idPatient: '../x' })));
    expect(response.status).toBe(400);
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
  });

  it('écrire un bilan ne journalise PAS un accès (dispense d’écriture GD-1)', async () => {
    await POST(postRequest(bilan(DEUX_LIGNES)));
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });

  it('une transaction qui lève ne journalise JAMAIS les valeurs mesurées', async () => {
    const erreur = spyErreur();
    prisma.$transaction.mockRejectedValueOnce(
      Object.assign(new Error('Argument valeur: 42.5 invalide pour PAT1'), { name: 'PrismaClientValidationError' }),
    );
    const response = await POST(postRequest(bilan(DEUX_LIGNES)));
    expect(response.status).toBe(500);
    const journal = JSON.stringify(erreur.mock.calls);
    expect(journal).not.toContain('42.5');
    expect(journal).not.toContain('PAT1');
    expect(journal).toContain('PrismaClientValidationError');
    erreur.mockRestore();
  });

  it('une lecture qui lève (hors transaction) : 500 sans détail, `throw null` compris', async () => {
    const erreur = spyErreur();
    prisma.biologyAnalyte.findMany.mockRejectedValueOnce(null);
    const response = await POST(postRequest(bilan(DEUX_LIGNES)));
    expect(response.status).toBe(500);
    expect((await response.json()).reason).toBe('server_error');
    erreur.mockRestore();
  });
});

function spyErreur() {
  return vi.spyOn(console, 'error').mockImplementation(() => {});
}
