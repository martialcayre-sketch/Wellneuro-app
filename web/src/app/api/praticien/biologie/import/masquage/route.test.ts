import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma, enregistrer } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    journalAccesDossier: { create: vi.fn() },
  },
  enregistrer: vi.fn(),
}));
vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/biology-library/import/enregistrerMasquage', () => ({ enregistrerMasquage: enregistrer }));

import { POST } from './route';
import { TOTAL_MAX_OCTETS } from '@/lib/biology-library/import/masquage';

const PAGE = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);

/** Une requête multipart réelle, avec la longueur qu'un navigateur annonce (ou une autre). */
async function requete(
  champs: { idCompteRendu?: string; zones?: string; aucuneIdentite?: string; pages?: number },
  opts: { longueur?: string | null } = {},
) {
  const form = new FormData();
  if (champs.idCompteRendu !== undefined) form.set('idCompteRendu', champs.idCompteRendu);
  if (champs.zones !== undefined) form.set('zones', champs.zones);
  if (champs.aucuneIdentite !== undefined) form.set('aucuneIdentite', champs.aucuneIdentite);
  for (let i = 0; i < (champs.pages ?? 0); i++) form.append('page', new Blob([PAGE], { type: 'image/jpeg' }), `page-${i + 1}.jpg`);
  const enveloppe = new Response(form);
  const corps = new Uint8Array(await enveloppe.arrayBuffer());
  const headers = new Headers({ 'content-type': enveloppe.headers.get('content-type') ?? '' });
  const longueur = opts.longueur === undefined ? String(corps.length) : opts.longueur;
  if (longueur !== null) headers.set('content-length', longueur);
  return new Request('http://localhost/api/praticien/biologie/import/masquage?idPatient=pat_sophie', {
    method: 'POST', body: corps, headers,
  });
}

const VALIDE = { idCompteRendu: 'cr_1', zones: '3', pages: 2 };

beforeEach(() => {
  process.env.WN_CB_ENABLED = 'true';
  process.env.WN_CB_RESULTS_ENABLED = 'true';
  process.env.WN_BIO_INGEST_ENABLED = 'true';
  getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
  prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'praticien@wellneuro.fr', actif: true, suiviClotureLe: null });
  enregistrer.mockResolvedValue({ ok: true, idMasquage: 'mq_1' });
});

afterEach(() => {
  delete process.env.WN_CB_ENABLED;
  delete process.env.WN_CB_RESULTS_ENABLED;
  delete process.env.WN_BIO_INGEST_ENABLED;
  vi.clearAllMocks();
});

describe('POST /api/praticien/biologie/import/masquage (D-284 §5)', () => {
  it('transmet les pages dans l’ordre, la déclaration et l’auteur de la SESSION', async () => {
    const r = await POST(await requete(VALIDE));
    expect(r.status).toBe(201);
    expect(await r.json()).toEqual({ ok: true, idMasquage: 'mq_1' });
    const params = enregistrer.mock.calls[0][0];
    expect(params).toMatchObject({
      idPatient: 'pat_sophie', idCompteRendu: 'cr_1', posePar: 'praticien@wellneuro.fr', zonesMasquees: 3, aucuneIdentite: false,
    });
    expect(params.pages).toHaveLength(2);
    expect([...params.pages[0]]).toEqual([...PAGE]);
  });

  it('« aucune identité » se transmet, sans zone', async () => {
    await POST(await requete({ idCompteRendu: 'cr_1', zones: '0', aucuneIdentite: '1', pages: 1 }));
    expect(enregistrer.mock.calls[0][0]).toMatchObject({ zonesMasquees: 0, aucuneIdentite: true });
  });

  it('drapeau éteint : 503, rien n’est lu', async () => {
    delete process.env.WN_BIO_INGEST_ENABLED;
    expect((await POST(await requete(VALIDE))).status).toBe(503);
    expect(enregistrer).not.toHaveBeenCalled();
  });

  it('sans session, ou un dossier d’un autre praticien : refusé avant tout', async () => {
    getServerSession.mockResolvedValueOnce(null);
    expect((await POST(await requete(VALIDE))).status).toBe(401);
    prisma.patient.findUnique.mockResolvedValueOnce({ praticienEmail: 'autre@wellneuro.fr', actif: true, suiviClotureLe: null });
    expect([403, 404]).toContain((await POST(await requete(VALIDE))).status);
    expect(enregistrer).not.toHaveBeenCalled();
  });

  it('la longueur est exigée (411) et bornée (413)', async () => {
    expect((await POST(await requete(VALIDE, { longueur: null }))).status).toBe(411);
    expect((await POST(await requete(VALIDE, { longueur: String(TOTAL_MAX_OCTETS + 70_000) }))).status).toBe(413);
    expect(enregistrer).not.toHaveBeenCalled();
  });

  it('un dossier clos refuse (409)', async () => {
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'praticien@wellneuro.fr', actif: true, suiviClotureLe: new Date() });
    expect((await POST(await requete(VALIDE))).status).toBe(409);
    expect(enregistrer).not.toHaveBeenCalled();
  });

  it.each([
    ['identifiant mal formé', { ...VALIDE, idCompteRendu: 'cr 1;' }],
    ['zones absentes', { idCompteRendu: 'cr_1', pages: 1 }],
    ['zones non entières', { ...VALIDE, zones: '2.5' }],
    ['case autre que « 1 »', { ...VALIDE, aucuneIdentite: 'oui' }],
  ])('%s : 400', async (_cas, champs) => {
    expect((await POST(await requete(champs))).status).toBe(400);
    expect(enregistrer).not.toHaveBeenCalled();
  });

  it('aucune page : 400 ; plus de 20 : 413', async () => {
    expect((await POST(await requete({ ...VALIDE, pages: 0 }))).status).toBe(400);
    expect((await POST(await requete({ ...VALIDE, pages: 21 }))).status).toBe(413);
    expect(enregistrer).not.toHaveBeenCalled();
  });

  it('un refus de l’enregistrement se dit en français, sous son motif', async () => {
    enregistrer.mockResolvedValueOnce({ ok: false, reason: 'lecture_demandee', status: 409 });
    const r = await POST(await requete(VALIDE));
    expect(r.status).toBe(409);
    expect(await r.json()).toEqual({
      ok: false, reason: 'lecture_demandee',
      error: 'Une lecture de ce compte rendu est demandée ou en cours : attendez son issue.',
    });
  });

  it('une panne ne journalise ni message ni contenu', async () => {
    const erreur = vi.spyOn(console, 'error').mockImplementation(() => {});
    enregistrer.mockRejectedValueOnce(new Error('Sophie Nicola, née le…'));
    const r = await POST(await requete(VALIDE));
    expect(r.status).toBe(500);
    expect(JSON.stringify(erreur.mock.calls)).not.toContain('Sophie');
    erreur.mockRestore();
  });
});
