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

import { randomBytes } from 'node:crypto';
import sharp from 'sharp';
import { POST } from './route';
import {
  COTE_MAX_IMAGE_PX,
  empreinteSha256,
  jugerFichier,
  preparerImage,
  TAILLE_MAX_IMAGE_OCTETS,
  TAILLE_MAX_OCTETS,
} from '@/lib/biology-library/import/depot';

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

/**
 * Un WebP animé de deux trames, assemblé à la main (sharp n'en écrit pas
 * depuis une image créée) : VP8X drapeau animation, ANIM, deux ANMF.
 */
async function webpAnime() {
  const bloc = (id: string, data: Buffer) => {
    const entete = Buffer.alloc(8);
    entete.write(id, 0, 'ascii');
    entete.writeUInt32LE(data.length, 4);
    return Buffer.concat([entete, data, Buffer.alloc(data.length % 2)]);
  };
  const u24 = (n: number) => { const b = Buffer.alloc(3); b.writeUIntLE(n, 0, 3); return b; };
  const trame = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#ffffff' } })
    .webp({ lossless: true }).toBuffer();
  const vp8l = trame.subarray(12);
  const anmf = bloc('ANMF', Buffer.concat([u24(0), u24(0), u24(9), u24(9), u24(100), Buffer.from([0]), vp8l]));
  const corps = Buffer.concat([
    Buffer.from('WEBP'),
    bloc('VP8X', Buffer.concat([Buffer.from([0x02, 0, 0, 0]), u24(9), u24(9)])),
    bloc('ANIM', Buffer.alloc(6)),
    anmf,
    anmf,
  ]);
  const riff = Buffer.alloc(8);
  riff.write('RIFF', 0, 'ascii');
  riff.writeUInt32LE(corps.length, 4);
  return Buffer.concat([riff, corps]);
}

/** Une photo de téléphone : 40 × 20, tournée par son EXIF, avec une position GPS. */
const photo = () =>
  sharp({ create: { width: 40, height: 20, channels: 3, background: '#ffffff' } })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .withExif({ IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '48/1 51/1 0/1' } })
    .toBuffer();

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
  it('admet JPEG, PNG et WebP à leur signature, si le type déclaré concorde (LOT-03)', () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 ')]);
    expect(jugerFichier(jpeg, 'image/jpeg')).toEqual({ ok: true, typeMime: 'image/jpeg' });
    expect(jugerFichier(png, 'image/png')).toEqual({ ok: true, typeMime: 'image/png' });
    expect(jugerFichier(webp, 'image/webp')).toEqual({ ok: true, typeMime: 'image/webp' });
    expect(jugerFichier(jpeg, 'image/png')).toMatchObject({ reason: 'format_non_admis', status: 415 });
    expect(jugerFichier(jpeg, 'application/pdf')).toMatchObject({ reason: 'format_non_admis', status: 415 });
    // HEIC (iPhone), GIF : refusés.
    expect(jugerFichier(Buffer.from('\0\0\0\x18ftypheic'), 'image/heic')).toMatchObject({ reason: 'format_non_admis' });
    expect(jugerFichier(Buffer.from('GIF89a'), 'image/gif')).toMatchObject({ reason: 'format_non_admis' });
  });

  it('admet un PDF à sa signature, refuse le reste', () => {
    expect(jugerFichier(PDF, 'application/pdf')).toEqual({ ok: true, typeMime: 'application/pdf' });
    expect(jugerFichier(Buffer.alloc(0), 'application/pdf')).toMatchObject({ reason: 'fichier_vide', status: 400 });
    expect(jugerFichier(Buffer.from('pas un pdf'), 'application/pdf')).toMatchObject({ reason: 'format_non_admis', status: 415 });
    expect(jugerFichier(PDF, 'image/png')).toMatchObject({ reason: 'format_non_admis', status: 415 });
    expect(jugerFichier(Buffer.alloc(TAILLE_MAX_OCTETS + 1), 'application/pdf'))
      .toMatchObject({ reason: 'fichier_trop_lourd', status: 413 });
  });
});

describe('preparerImage', () => {
  it('au-delà de 8 000 pixels de côté : refusée', async () => {
    const large = await sharp({ create: { width: COTE_MAX_IMAGE_PX + 1, height: 1, channels: 3, background: '#fff' } })
      .png().toBuffer();
    expect(await preparerImage(large, 'image/png')).toMatchObject({ ok: false, reason: 'image_trop_grande', status: 413 });
  });

  it('au-delà de 3,75 Mio une fois préparée : refusée', async () => {
    const bruit = await sharp(randomBytes(1200 * 1200 * 3), { raw: { width: 1200, height: 1200, channels: 3 } })
      .png().toBuffer();
    expect(bruit.length).toBeGreaterThan(TAILLE_MAX_IMAGE_OCTETS);
    expect(await preparerImage(bruit, 'image/png')).toMatchObject({ ok: false, reason: 'image_trop_lourde', status: 413 });
  });

  it('une image animée : refusée, aucune trame n’est perdue en silence', async () => {
    const animee = await webpAnime();
    expect((await sharp(animee).metadata()).pages).toBe(2);
    expect(await preparerImage(animee, 'image/webp')).toMatchObject({ ok: false, reason: 'image_animee', status: 415 });
  });

  it('un PNG animé (APNG) : refusé, bien que sharp n’en compte pas les trames', async () => {
    const png = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#ffffff' } }).png().toBuffer();
    // Bloc acTL (2 trames, boucle infinie) inséré après IHDR, avant le premier IDAT.
    const finIhdr = 8 + 12 + png.readUInt32BE(8);
    const donnees = Buffer.alloc(8);
    donnees.writeUInt32BE(2, 0);
    const actl = Buffer.concat([Buffer.from([0, 0, 0, 8]), Buffer.from('acTL'), donnees, Buffer.alloc(4)]);
    const apng = Buffer.concat([png.subarray(0, finIhdr), actl, png.subarray(finIhdr)]);
    expect(await preparerImage(apng, 'image/png')).toMatchObject({ ok: false, reason: 'image_animee', status: 415 });
    expect(await preparerImage(png, 'image/png')).toMatchObject({ ok: true });
  });

  it('le même fichier donne les mêmes octets (unicité par empreinte)', async () => {
    const source = await photo();
    const [a, b] = await Promise.all([preparerImage(source, 'image/jpeg'), preparerImage(source, 'image/jpeg')]);
    expect(a.ok && b.ok && a.octets.equals(b.octets)).toBe(true);
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

  it('une photo : consignée SANS ses métadonnées (GPS), orientation appliquée (LOT-03)', async () => {
    const source = await photo();
    expect((await sharp(source).metadata()).exif).toBeDefined();
    const res = await POST(await requete(new File([new Uint8Array(source)], 'IMG_0001.jpg', { type: 'image/jpeg' })));
    expect(res.status).toBe(201);
    const { data } = prisma.compteRenduBiologique.create.mock.calls[0][0];
    const consigne = Buffer.from(data.contenu);
    const lu = await sharp(consigne).metadata();
    expect(lu.exif).toBeUndefined();
    expect(lu.orientation).toBeUndefined();
    expect([lu.width, lu.height]).toEqual([20, 40]);
    expect(data).toMatchObject({ typeMime: 'image/jpeg', empreinteSha256: empreinteSha256(consigne) });
  });

  it('une image illisible, un faux PDF, un HEIC : 415, sans écriture', async () => {
    const tronquee = await POST(await requete(pdf(Buffer.from([0xff, 0xd8, 0xff]), 'image/jpeg')));
    expect(tronquee.status).toBe(415);
    expect(await tronquee.json()).toMatchObject({ reason: 'image_illisible' });
    expect((await POST(await requete(pdf(Buffer.from('<html>'), 'application/pdf')))).status).toBe(415);
    expect((await POST(await requete(pdf(Buffer.from('\0\0\0\x18ftypheic'), 'image/heic')))).status).toBe(415);
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
