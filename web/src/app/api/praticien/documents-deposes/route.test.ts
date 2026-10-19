import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    journalAccesDossier: { create: vi.fn() },
    documentDeposePatient: { findMany: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn(), count: vi.fn() },
    classementDocumentDepose: { create: vi.fn() },
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { GET, POST } from './route';
import { GET as GET_CONTENU } from './contenu/route';

// L'écran praticien de la collecte ([[D-330]]) : seul le praticien du dossier
// lit, classe, consulte et retire ; une liste ne porte jamais le document ; la
// première consultation se trace avant de servir ; une erreur ne se journalise
// que par sa classe.

const PDF = Buffer.from('%PDF-1.7\n% fixture Jennifer Martin\n%%EOF');
const liste = (q = 'idPatient=PAT_JENNIFER') => new Request(`http://localhost/api/praticien/documents-deposes?${q}`);
const geste = (corps: unknown) =>
  new Request('http://localhost/api/praticien/documents-deposes', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(corps),
  });
const contenu = (q = 'idPatient=PAT_JENNIFER&idDocument=doc_1') =>
  new Request(`http://localhost/api/praticien/documents-deposes/contenu?${q}`);

let erreurs: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('WN_PORTAIL_DEPOT_DOCUMENTS', '');
  // La casse de la session diffère de celle du dossier : la garde l'ignore.
  getServerSession.mockResolvedValue({ user: { email: 'Praticien@wellneuro.fr' } });
  prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'praticien@wellneuro.fr' });
  prisma.journalAccesDossier.create.mockResolvedValue({});
  prisma.documentDeposePatient.findMany.mockResolvedValue([]);
  erreurs = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  erreurs.mockRestore();
});

describe('GET /api/praticien/documents-deposes', () => {
  it('exige une session, sans rien lire ni journaliser', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await GET(liste())).status).toBe(401);
    expect(prisma.documentDeposePatient.findMany).not.toHaveBeenCalled();
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });

  it('refuse un identifiant mal formé, puis le dossier d’un autre praticien — sans rien lire', async () => {
    expect((await GET(liste('idPatient=a%20b'))).status).toBe(400);
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'autre@wellneuro.fr' });
    expect((await GET(liste())).status).toBe(403);
    prisma.patient.findUnique.mockResolvedValue(null);
    expect((await GET(liste())).status).toBe(404);
    expect(prisma.documentDeposePatient.findMany).not.toHaveBeenCalled();
  });

  it('lit la liste sans le document, journalise l’accès, dit si la surface patient est ouverte', async () => {
    const res = await GET(liste());
    expect(await res.json()).toEqual({ ok: true, ouvert: false, documents: [] });
    expect(prisma.documentDeposePatient.findMany.mock.calls[0][0].select).not.toHaveProperty('contenu');
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(prisma.journalAccesDossier.create.mock.calls[0][0])).toContain('/api/praticien/documents-deposes');
    vi.stubEnv('WN_PORTAIL_DEPOT_DOCUMENTS', 'true');
    expect((await (await GET(liste())).json()).ouvert).toBe(true);
  });

  it('une panne : 500, sans journaliser le message', async () => {
    prisma.documentDeposePatient.findMany.mockRejectedValueOnce(new Error('PAT_JENNIFER fixture Jennifer Martin'));
    expect((await GET(liste())).status).toBe(500);
    expect(JSON.stringify(erreurs.mock.calls)).not.toContain('Jennifer');
  });
});

describe('POST /api/praticien/documents-deposes — classer et retirer', () => {
  it('exige une session et le dossier du praticien, sans écrire', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await POST(geste({ idPatient: 'PAT_JENNIFER', idDocument: 'doc_1', geste: 'retirer', motif: 'demande_droit' }))).status).toBe(401);
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'autre@wellneuro.fr' });
    expect((await POST(geste({ idPatient: 'PAT_JENNIFER', idDocument: 'doc_1', geste: 'retirer', motif: 'demande_droit' }))).status).toBe(403);
    expect(prisma.documentDeposePatient.updateMany).not.toHaveBeenCalled();
  });

  it('refuse un corps illisible, un geste, une catégorie ou un motif inconnus', async () => {
    const mal = new Request('http://localhost/api/praticien/documents-deposes', { method: 'POST', body: 'pas du json' });
    expect((await POST(mal)).status).toBe(400);
    for (const corps of [
      { idPatient: 'PAT_JENNIFER', idDocument: 'doc_1', geste: 'supprimer' },
      { idPatient: 'PAT_JENNIFER', idDocument: 'doc_1', geste: 'classer', categorie: 'ordonnance' },
      { idPatient: 'PAT_JENNIFER', idDocument: 'doc_1', geste: 'retirer', motif: 'autre' },
      { idPatient: 'PAT_JENNIFER', idDocument: 'doc 1', geste: 'retirer', motif: 'demande_droit' },
    ]) {
      expect((await POST(geste(corps))).status).toBe(400);
    }
    expect(prisma.documentDeposePatient.updateMany).not.toHaveBeenCalled();
    expect(prisma.classementDocumentDepose.create).not.toHaveBeenCalled();
  });

  it('classer : une ligne, au nom du praticien de la session (en minuscules)', async () => {
    prisma.documentDeposePatient.findFirst.mockResolvedValueOnce({ retireLe: null, categorieProposee: 'autre', classements: [] });
    const res = await POST(geste({ idPatient: 'PAT_JENNIFER', idDocument: 'doc_1', geste: 'classer', categorie: 'courrier' }));
    expect(await res.json()).toEqual({ ok: true, modifie: true });
    expect(prisma.classementDocumentDepose.create.mock.calls[0][0].data.classePar).toBe('praticien@wellneuro.fr');
    // Une écriture n'est pas une lecture du dossier.
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });

  it('retirer : contenu effacé, motif gardé ; un second retrait est dit', async () => {
    prisma.documentDeposePatient.updateMany.mockResolvedValueOnce({ count: 1 });
    const res = await POST(geste({ idPatient: 'PAT_JENNIFER', idDocument: 'doc_1', geste: 'retirer', motif: 'depot_par_erreur' }));
    expect(await res.json()).toEqual({ ok: true });
    expect(prisma.documentDeposePatient.updateMany.mock.calls[0][0].data).toEqual({
      contenu: null,
      retirePar: 'praticien@wellneuro.fr',
      motifRetrait: 'depot_par_erreur',
    });
    prisma.documentDeposePatient.updateMany.mockResolvedValueOnce({ count: 0 });
    prisma.documentDeposePatient.count.mockResolvedValueOnce(1);
    const encore = await POST(geste({ idPatient: 'PAT_JENNIFER', idDocument: 'doc_1', geste: 'retirer', motif: 'depot_par_erreur' }));
    expect(encore.status).toBe(409);
    expect((await encore.json()).reason).toBe('document_deja_retire');
  });

  it('une contrainte refusée : 500, et son message n’est pas journalisé', async () => {
    prisma.documentDeposePatient.updateMany.mockRejectedValueOnce(new Error('retrait refusé : PAT_JENNIFER fixture Jennifer Martin'));
    const res = await POST(geste({ idPatient: 'PAT_JENNIFER', idDocument: 'doc_1', geste: 'retirer', motif: 'demande_droit' }));
    expect(res.status).toBe(500);
    expect(JSON.stringify(erreurs.mock.calls)).not.toContain('Jennifer');
  });
});

describe('GET /api/praticien/documents-deposes/contenu — ouvrir un document', () => {
  it('exige session et dossier du praticien, sans rien tracer ni servir', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await GET_CONTENU(contenu())).status).toBe(401);
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'autre@wellneuro.fr' });
    expect((await GET_CONTENU(contenu())).status).toBe(403);
    expect((await GET_CONTENU(contenu('idPatient=PAT_JENNIFER&idDocument=../x'))).status).toBe(400);
    expect(prisma.documentDeposePatient.updateMany).not.toHaveBeenCalled();
    expect(prisma.documentDeposePatient.findFirst).not.toHaveBeenCalled();
  });

  it('trace la première ouverture, journalise l’accès, sert le PDF sous ses en-têtes', async () => {
    prisma.documentDeposePatient.updateMany.mockResolvedValueOnce({ count: 1 });
    prisma.documentDeposePatient.findFirst.mockResolvedValueOnce({ contenu: new Uint8Array(PDF), typeMime: 'application/pdf' });
    const res = await GET_CONTENU(contenu());
    expect(res.status).toBe(200);
    expect(prisma.documentDeposePatient.updateMany).toHaveBeenCalledWith({
      where: { id: 'doc_1', idPatient: 'PAT_JENNIFER', consultePar: null, retireLe: null },
      data: { consultePar: 'praticien@wellneuro.fr' },
    });
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledTimes(1);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('cache-control')).toBe('no-store, private');
    expect(res.headers.get('content-disposition')).toBe('inline');
    expect(res.headers.get('content-security-policy')).toBeNull();
    expect(Buffer.from(await res.arrayBuffer()).equals(PDF)).toBe(true);
  });

  it('une image est servie sous `sandbox`', async () => {
    prisma.documentDeposePatient.updateMany.mockResolvedValueOnce({ count: 0 });
    prisma.documentDeposePatient.findFirst.mockResolvedValueOnce({ contenu: new Uint8Array([0xff, 0xd8, 0xff]), typeMime: 'image/jpeg' });
    const res = await GET_CONTENU(contenu());
    expect(res.headers.get('content-security-policy')).toBe('sandbox');
  });

  it('document retiré : 410 ; introuvable : 404', async () => {
    prisma.documentDeposePatient.updateMany.mockResolvedValue({ count: 0 });
    prisma.documentDeposePatient.findFirst.mockResolvedValueOnce({ contenu: null, typeMime: 'application/pdf' });
    expect((await GET_CONTENU(contenu())).status).toBe(410);
    prisma.documentDeposePatient.findFirst.mockResolvedValueOnce(null);
    expect((await GET_CONTENU(contenu())).status).toBe(404);
  });

  it('si la trace échoue : 500, rien n’est servi, le message n’est pas journalisé', async () => {
    prisma.documentDeposePatient.updateMany.mockRejectedValueOnce(new Error('consultation refusée : PAT_JENNIFER'));
    const res = await GET_CONTENU(contenu());
    expect(res.status).toBe(500);
    expect(prisma.documentDeposePatient.findFirst).not.toHaveBeenCalled();
    expect(JSON.stringify(erreurs.mock.calls)).not.toContain('PAT_JENNIFER');
  });
});
