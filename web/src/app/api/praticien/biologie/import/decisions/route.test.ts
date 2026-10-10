import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// BANC DE LA ROUTE DES DÉCISIONS (contre-revue adverse du 2026-10-10, M18) :
// la seule route d'un import vers `resultats_biologiques` n'avait pas de banc,
// et la garde retirée (drapeau, session, appartenance) ne faisait rougir aucun
// test. Le métier (`deciderLignes`) a le sien ; ici, seul l'ordre compte : la
// garde, puis le dossier ouvert, AVANT toute décision.

const { getServerSession, prisma, deciderLignes } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: { patient: { findUnique: vi.fn() } },
  deciderLignes: vi.fn(),
}));
vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/biology-library/import/decisions', () => ({ deciderLignes }));

import { POST } from './route';

const DRAPEAUX = ['WN_CB_ENABLED', 'WN_CB_RESULTS_ENABLED', 'WN_BIO_INGEST_ENABLED'];
const avant: Record<string, string | undefined> = {};
const CORPS = { idPatient: 'pat_jennifer', idImport: 'imp_1', decisions: [{ idLigne: 'l_1', acte: 'ecarter', motif: 'illisible' }] };

const requete = (body: unknown) =>
  new Request('http://localhost/api/praticien/biologie/import/decisions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
  for (const nom of DRAPEAUX) {
    avant[nom] = process.env[nom];
    process.env[nom] = 'true';
  }
  getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
  prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'praticien@wellneuro.fr', actif: true, suiviClotureLe: null });
  deciderLignes.mockResolvedValue({ ok: true, validees: 0, ecartees: 1, documentPurge: false });
});

afterEach(() => {
  for (const nom of DRAPEAUX) {
    if (avant[nom] === undefined) delete process.env[nom];
    else process.env[nom] = avant[nom];
  }
});

describe('POST /api/praticien/biologie/import/decisions (D-256 A3/A5)', () => {
  it('décide avec l’e-mail de la SESSION, jamais celui du corps', async () => {
    const res = await POST(requete({ ...CORPS, traitePar: 'autre@wellneuro.fr' }));
    expect(res.status).toBe(201);
    expect(deciderLignes).toHaveBeenCalledWith({
      idPatient: 'pat_jennifer', idImport: 'imp_1', traitePar: 'praticien@wellneuro.fr', decisions: CORPS.decisions,
    });
  });

  it.each(DRAPEAUX)('drapeau %s éteint : 503, aucune décision', async nom => {
    delete process.env[nom];
    expect((await POST(requete(CORPS))).status).toBe(503);
    expect(deciderLignes).not.toHaveBeenCalled();
  });

  it('sans session : 401, aucune décision', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await POST(requete(CORPS))).status).toBe(401);
    expect(deciderLignes).not.toHaveBeenCalled();
  });

  it('dossier d’un autre praticien : 403, aucune décision', async () => {
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'autre@wellneuro.fr', actif: true, suiviClotureLe: null });
    expect((await POST(requete(CORPS))).status).toBe(403);
    expect(deciderLignes).not.toHaveBeenCalled();
  });

  it('dossier introuvable : 404, aucune décision', async () => {
    prisma.patient.findUnique.mockResolvedValue(null);
    expect((await POST(requete(CORPS))).status).toBe(404);
    expect(deciderLignes).not.toHaveBeenCalled();
  });

  it.each([
    ['clos', { actif: true, suiviClotureLe: new Date('2026-10-01T00:00:00Z') }],
    ['désactivé', { actif: false, suiviClotureLe: null }],
  ])('dossier %s : 409, aucune décision', async (_cas, etat) => {
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'praticien@wellneuro.fr', ...etat });
    expect((await POST(requete(CORPS))).status).toBe(409);
    expect(deciderLignes).not.toHaveBeenCalled();
  });

  it('extraction mal désignée ou corps illisible : 400, aucune décision', async () => {
    expect((await POST(requete({ ...CORPS, idImport: 'imp 1;' }))).status).toBe(400);
    expect((await POST(requete([CORPS]))).status).toBe(400);
    expect(deciderLignes).not.toHaveBeenCalled();
  });

  it('un refus métier rend son statut et ses lignes ; une exception, un 500 sans détail', async () => {
    deciderLignes.mockResolvedValueOnce({ ok: false, reason: 'refus', error: 'Refusé.', status: 422, lignes: [{ idLigne: 'l_1' }] });
    let res = await POST(requete(CORPS));
    expect(res.status).toBe(422);
    expect((await res.json()).lignes).toEqual([{ idLigne: 'l_1' }]);
    deciderLignes.mockRejectedValueOnce(new Error('valeur 12,4 du dossier pat_jennifer'));
    res = await POST(requete(CORPS));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, reason: 'server_error', error: 'Erreur technique.' });
  });
});
