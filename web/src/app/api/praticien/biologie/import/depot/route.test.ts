import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    journalAccesDossier: { create: vi.fn() },
    compteRenduBiologique: { create: vi.fn(), findUnique: vi.fn() },
  },
}));
vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { POST } from './route';
import { empreinteSha256, jugerFichier, TAILLE_MAX_OCTETS } from '@/lib/biology-library/import/depot';

const PDF = Buffer.from('%PDF-1.7\n% fixture Sophie Nicola\n%%EOF');

/** Une requête multipart réelle, avec la longueur qu'un navigateur annonce (ou une autre). */
async function requete(fichier: Blob | null, opts: { longueur?: string | null; idPatient?: string } = {}) {
  const form = new FormData();
  if (fichier) form.set('fichier', fichier);
  const enveloppe = new Response(form);
  const corps = new Uint8Array(await enveloppe.arrayBuffer());
  const headers = new Headers({ 'content-type': enveloppe.headers.get('content-type') ?? '' });
  const longueur = opts.longueur === undefined ? String(corps.length) : opts.longueur;
  if (longueur !== null) headers.set('content-length', longueur);
  const url = `http://localhost/api/praticien/biologie/import/depot?idPatient=${opts.idPatient ?? 'pat_sophie'}`;
  return new Request(url, { method: 'POST', body: corps, headers });
}

const pdf = (octets: Buffer = PDF, type = 'application/pdf') => new Blob([new Uint8Array(octets)], { type });

beforeEach(() => {
  process.env.WN_CB_ENABLED = 'true';
  process.env.WN_CB_RESULTS_ENABLED = 'true';
  process.env.WN_BIO_INGEST_ENABLED = 'true';
  getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
  prisma.patient.findUnique.mockResolvedValue({
    praticienEmail: 'praticien@wellneuro.fr', actif: true, suiviClotureLe: null,
  });
  prisma.compteRenduBiologique.create.mockResolvedValue({ id: 'cr_1' });
});

afterEach(() => {
  delete process.env.WN_CB_ENABLED;
  delete process.env.WN_CB_RESULTS_ENABLED;
  delete process.env.WN_BIO_INGEST_ENABLED;
  vi.clearAllMocks();
});

describe('jugerFichier', () => {
  it('admet un PDF à sa signature, refuse le reste', () => {
    expect(jugerFichier(PDF, 'application/pdf')).toEqual({ ok: true, typeMime: 'application/pdf' });
    expect(jugerFichier(Buffer.alloc(0), 'application/pdf')).toMatchObject({ reason: 'fichier_vide', status: 400 });
    expect(jugerFichier(Buffer.from('pas un pdf'), 'application/pdf')).toMatchObject({ reason: 'format_non_admis', status: 415 });
    expect(jugerFichier(PDF, 'image/png')).toMatchObject({ reason: 'format_non_admis', status: 415 });
    expect(jugerFichier(Buffer.alloc(TAILLE_MAX_OCTETS + 1), 'application/pdf'))
      .toMatchObject({ reason: 'fichier_trop_lourd', status: 413 });
  });
});

describe('POST /api/praticien/biologie/import/depot', () => {
  it('drapeau éteint : 503, sans session ni lecture', async () => {
    delete process.env.WN_BIO_INGEST_ENABLED;
    const res = await POST(await requete(pdf()));
    expect(res.status).toBe(503);
    expect(getServerSession).not.toHaveBeenCalled();
    expect(prisma.compteRenduBiologique.create).not.toHaveBeenCalled();
  });

  it('dépose le PDF entier avec son empreinte, sans nom de fichier', async () => {
    const res = await POST(await requete(new File([new Uint8Array(PDF)], 'Nicola_Sophie.pdf', { type: 'application/pdf' })));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true, idCompteRendu: 'cr_1' });
    const { data } = prisma.compteRenduBiologique.create.mock.calls[0][0];
    expect(Buffer.from(data.contenu).equals(PDF)).toBe(true);
    expect(data).toMatchObject({
      idPatient: 'pat_sophie', typeMime: 'application/pdf',
      empreinteSha256: empreinteSha256(PDF), deposePar: 'praticien@wellneuro.fr',
    });
    expect(JSON.stringify(Object.keys(data))).not.toMatch(/nom|fichier|name/i);
  });

  it('au-delà de 10 Mo : 413, sans écriture', async () => {
    const lourd = Buffer.concat([PDF, Buffer.alloc(TAILLE_MAX_OCTETS)]);
    const res = await POST(await requete(pdf(lourd)));
    expect(res.status).toBe(413);
    expect(prisma.compteRenduBiologique.create).not.toHaveBeenCalled();
  });

  it('une image ou un faux PDF : 415 (l’image relève du LOT-03)', async () => {
    expect((await POST(await requete(pdf(Buffer.from([0xff, 0xd8, 0xff]), 'image/jpeg')))).status).toBe(415);
    expect((await POST(await requete(pdf(Buffer.from('<html>'), 'application/pdf')))).status).toBe(415);
    expect(prisma.compteRenduBiologique.create).not.toHaveBeenCalled();
  });

  it('LE MÊME DOCUMENT DEUX FOIS : 409, et le premier dépôt est désigné', async () => {
    prisma.compteRenduBiologique.create.mockRejectedValueOnce(Object.assign(new Error('unique'), { code: 'P2002' }));
    prisma.compteRenduBiologique.findUnique.mockResolvedValueOnce({ id: 'cr_premier' });
    const res = await POST(await requete(pdf()));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ ok: false, reason: 'document_deja_depose', idCompteRendu: 'cr_premier' });
    expect(prisma.compteRenduBiologique.findUnique).toHaveBeenCalledWith({
      where: { idPatient_empreinteSha256: { idPatient: 'pat_sophie', empreinteSha256: empreinteSha256(PDF) } },
      select: { id: true },
    });
  });

  it('un dossier d’un autre praticien : refusé, sans écriture', async () => {
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'autre@wellneuro.fr', actif: true, suiviClotureLe: null });
    const res = await POST(await requete(pdf()));
    expect([403, 404]).toContain(res.status);
    expect(prisma.compteRenduBiologique.create).not.toHaveBeenCalled();
  });

  it('SANS LONGUEUR ANNONCÉE : 411, le corps n’est jamais lu (revue, P1-1)', async () => {
    const req = await requete(pdf(), { longueur: null });
    const lecture = vi.spyOn(req, 'formData');
    const res = await POST(req);
    expect(res.status).toBe(411);
    expect(lecture).not.toHaveBeenCalled();
    expect(prisma.compteRenduBiologique.create).not.toHaveBeenCalled();
  });

  it('une longueur annoncée au-delà de la borne : 413 sans lire le corps', async () => {
    const req = await requete(pdf(), { longueur: String(TAILLE_MAX_OCTETS * 2) });
    const lecture = vi.spyOn(req, 'formData');
    expect((await POST(req)).status).toBe(413);
    expect(lecture).not.toHaveBeenCalled();
  });

  it('sans session : 401 avant toute lecture du corps', async () => {
    getServerSession.mockResolvedValueOnce(null);
    const req = await requete(pdf());
    const lecture = vi.spyOn(req, 'formData');
    expect((await POST(req)).status).toBe(401);
    expect(lecture).not.toHaveBeenCalled();
  });

  it('sans fichier : 400', async () => {
    expect((await POST(await requete(null))).status).toBe(400);
  });
});
