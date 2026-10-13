import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { after, garderImport, demanderExtraction, prisma } = vi.hoisted(() => ({
  after: vi.fn(),
  garderImport: vi.fn(),
  demanderExtraction: vi.fn(),
  prisma: { patient: { findUnique: vi.fn() } },
}));
vi.mock('next/server', async importOriginal => ({ ...(await importOriginal<typeof import('next/server')>()), after }));
vi.mock('@/lib/biology-library/import/garde', () => ({ garderImport }));
vi.mock('@/lib/biology-library/import/fileExtraction', () => ({ demanderExtraction }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { POST } from './route';

function requete(corps: unknown) {
  return new Request('http://localhost/api/praticien/biologie/import/extraction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
  });
}

const CORPS = { idPatient: 'pat_sophie', idCompteRendu: 'cr_1' };

beforeEach(() => {
  garderImport.mockResolvedValue({ ok: true, email: 'praticien@wellneuro.fr' });
  prisma.patient.findUnique.mockResolvedValue({ actif: true, suiviClotureLe: null });
  demanderExtraction.mockResolvedValue({ ok: true, idTravail: 'trv_1' });
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe('POST /api/praticien/biologie/import/extraction — file durable (D-282)', () => {
  it('demande la lecture à la file et rend 202 — ni import ouvert, ni after()', async () => {
    const res = await POST(requete(CORPS));
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ ok: true, idTravail: 'trv_1', statut: 'en_attente' });
    expect(demanderExtraction).toHaveBeenCalledWith({
      idPatient: 'pat_sophie', idCompteRendu: 'cr_1', demandePar: 'praticien@wellneuro.fr',
    });
    expect(after).not.toHaveBeenCalled();
  });

  it('l’ancien drapeau de bascule n’est plus lu : éteint, la route demande quand même (lot 5)', async () => {
    vi.stubEnv('WN_BIO_EXTRACTION_ASYNC', 'false');
    expect((await POST(requete(CORPS))).status).toBe(202);
    expect(demanderExtraction).toHaveBeenCalledTimes(1);
    expect(after).not.toHaveBeenCalled();
  });

  it('un document purgé (D-258) rend 409 `document_purge`', async () => {
    demanderExtraction.mockResolvedValueOnce({ ok: false, reason: 'document_purge' });
    const res = await POST(requete(CORPS));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      ok: false, reason: 'document_purge', error: 'Le document de ce compte rendu a été effacé : il ne peut plus être relu.',
    });
  });

  it('une ligne validée (LOT-09) rend 409 `ligne_validee`', async () => {
    demanderExtraction.mockResolvedValueOnce({ ok: false, reason: 'ligne_validee' });
    const res = await POST(requete(CORPS));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      ok: false,
      reason: 'ligne_validee',
      error: 'Une ligne de ce compte rendu a déjà été validée : il ne peut plus être relu, rien de ce qui est enregistré n’est remplacé.',
    });
  });

  it('une lecture déjà demandée rend 409 `lecture_demandee`, et le dit', async () => {
    demanderExtraction.mockResolvedValueOnce({ ok: false, reason: 'lecture_demandee' });
    const res = await POST(requete(CORPS));
    expect(res.status).toBe(409);
    const corps = await res.json();
    expect(corps.reason).toBe('lecture_demandee');
    expect(corps.error).toContain('déjà demandée');
  });

  it('une extraction déjà en cours rend 409 `extraction_en_cours`', async () => {
    demanderExtraction.mockResolvedValueOnce({ ok: false, reason: 'extraction_en_cours' });
    const res = await POST(requete(CORPS));
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('extraction_en_cours');
  });

  it('un dossier clos entre la lecture du dossier et la demande rend le refus du dossier clos (D-282 §9)', async () => {
    demanderExtraction.mockResolvedValueOnce({ ok: false, reason: 'dossier_clos' });
    const res = await POST(requete(CORPS));
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('dossier_cloture');
  });

  it('un compte rendu d’un autre dossier rend 404', async () => {
    demanderExtraction.mockResolvedValueOnce({ ok: false, reason: 'compte_rendu_introuvable' });
    expect((await POST(requete(CORPS))).status).toBe(404);
  });

  it('une demande qui lève rend 500, journalisée par sa classe, jamais par son message', async () => {
    const erreur = vi.spyOn(console, 'error').mockImplementation(() => {});
    demanderExtraction.mockRejectedValueOnce(Object.assign(new Error('pat_sophie'), { code: 'P1001' }));
    const res = await POST(requete(CORPS));
    expect(res.status).toBe(500);
    expect(JSON.stringify(erreur.mock.calls)).not.toContain('pat_sophie');
    erreur.mockRestore();
  });

  it('un dossier clos rend 409 avant toute demande', async () => {
    prisma.patient.findUnique.mockResolvedValueOnce({ actif: false, suiviClotureLe: new Date('2026-09-01T00:00:00Z') });
    const res = await POST(requete(CORPS));
    expect(res.status).toBe(409);
    expect(demanderExtraction).not.toHaveBeenCalled();
  });

  it('le drapeau éteint (garde) rend 503 avant toute demande', async () => {
    garderImport.mockResolvedValueOnce({ ok: false, reason: 'bio_ingest_desactive', error: 'x', status: 503 });
    expect((await POST(requete(CORPS))).status).toBe(503);
    expect(demanderExtraction).not.toHaveBeenCalled();
  });
});
