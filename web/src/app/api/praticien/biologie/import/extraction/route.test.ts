import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { after, garderImport, ouvrirExtraction, poursuivreExtraction, prisma } = vi.hoisted(() => ({
  after: vi.fn(),
  garderImport: vi.fn(),
  ouvrirExtraction: vi.fn(),
  poursuivreExtraction: vi.fn(),
  prisma: { patient: { findUnique: vi.fn() } },
}));
vi.mock('next/server', async importOriginal => ({ ...(await importOriginal<typeof import('next/server')>()), after }));
vi.mock('@/lib/biology-library/import/garde', () => ({ garderImport }));
vi.mock('@/lib/biology-library/import/lancerExtraction', () => ({ ouvrirExtraction, poursuivreExtraction }));
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
  ouvrirExtraction.mockResolvedValue({ ok: true, idImport: 'imp_1' });
  poursuivreExtraction.mockResolvedValue({ ok: true, idImport: 'imp_1', statut: 'extrait', lignes: 3 });
});

afterEach(() => vi.clearAllMocks());

describe('POST /api/praticien/biologie/import/extraction — asynchrone', () => {
  it('rend 202 avec l’import ouvert, sans attendre l’appel au fournisseur', async () => {
    const res = await POST(requete(CORPS));
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ ok: true, idImport: 'imp_1', statut: 'en_cours' });
    expect(ouvrirExtraction).toHaveBeenCalledWith({ idPatient: 'pat_sophie', idCompteRendu: 'cr_1', lancePar: 'praticien@wellneuro.fr' });
    // La suite est confiée à after(), pas jouée dans la requête.
    expect(poursuivreExtraction).not.toHaveBeenCalled();
    expect(after).toHaveBeenCalledTimes(1);
    await after.mock.calls[0][0]();
    expect(poursuivreExtraction).toHaveBeenCalledWith({ idPatient: 'pat_sophie', idCompteRendu: 'cr_1', idImport: 'imp_1' });
  });

  it('une suite qui lève est journalisée par sa classe, jamais par son message', async () => {
    const erreur = vi.spyOn(console, 'error').mockImplementation(() => {});
    poursuivreExtraction.mockRejectedValueOnce(new Error('Ferritine 48 ng/mL'));
    await POST(requete(CORPS));
    await expect(after.mock.calls[0][0]()).resolves.toBeUndefined();
    expect(JSON.stringify(erreur.mock.calls)).not.toContain('Ferritine');
    erreur.mockRestore();
  });

  it('une extraction déjà en cours rend 409, sans rien confier à after()', async () => {
    ouvrirExtraction.mockResolvedValueOnce({ ok: false, reason: 'extraction_en_cours' });
    const res = await POST(requete(CORPS));
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('extraction_en_cours');
    expect(after).not.toHaveBeenCalled();
  });

  it('une ouverture qui lève rend 500, sans rien confier à after()', async () => {
    const erreur = vi.spyOn(console, 'error').mockImplementation(() => {});
    ouvrirExtraction.mockRejectedValueOnce(Object.assign(new Error('pat_sophie'), { code: 'P1001' }));
    const res = await POST(requete(CORPS));
    expect(res.status).toBe(500);
    expect(after).not.toHaveBeenCalled();
    expect(JSON.stringify(erreur.mock.calls)).not.toContain('pat_sophie');
    erreur.mockRestore();
  });

  it('un compte rendu d’un autre dossier rend 404', async () => {
    ouvrirExtraction.mockResolvedValueOnce({ ok: false, reason: 'compte_rendu_introuvable' });
    expect((await POST(requete(CORPS))).status).toBe(404);
  });

  it('un dossier clos rend 409 avant toute ouverture', async () => {
    prisma.patient.findUnique.mockResolvedValueOnce({ actif: false, suiviClotureLe: new Date('2026-09-01T00:00:00Z') });
    const res = await POST(requete(CORPS));
    expect(res.status).toBe(409);
    expect(ouvrirExtraction).not.toHaveBeenCalled();
  });

  it('le drapeau éteint (garde) rend 503 avant toute ouverture', async () => {
    garderImport.mockResolvedValueOnce({ ok: false, reason: 'bio_ingest_desactive', error: 'x', status: 503 });
    expect((await POST(requete(CORPS))).status).toBe(503);
    expect(ouvrirExtraction).not.toHaveBeenCalled();
  });
});
