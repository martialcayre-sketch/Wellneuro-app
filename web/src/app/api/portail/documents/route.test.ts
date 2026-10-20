import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    patient: { findUnique: vi.fn() },
    documentDeposePatient: { count: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
    $transaction: vi.fn(),
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { signPatientSession } from '@/lib/patient-session';
import { GET, POST } from './route';

// Le dépôt d'un document par le patient ([[D-330]]). Ce banc tient l'ORDRE
// des gardes — drapeau, session, dossier, âge, plafonds, puis seulement le
// corps —, que le dossier vienne de la session et jamais du client, les bornes
// du compte rendu, et qu'aucun message d'erreur ne soit journalisé tel quel.

const PDF = Buffer.from('%PDF-1.7\n% fixture Sophie Nicola\n%%EOF');

const patient = {
  idPatient: 'PAT_SOPHIE',
  email: 'sophie.nicola@example.test',
  prenom: 'Sophie',
  nom: 'Nicola',
  actif: true,
  suiviClotureLe: null as Date | null,
  accessTokenRevoked: false,
  praticienEmail: 'praticien@wellneuro.fr',
  dateNaissance: '1985-03-14' as string | null,
};

function cookie(avecSession: boolean): Record<string, string> {
  if (!avecSession) return {};
  const jeton = signPatientSession({ idPatient: patient.idPatient, email: patient.email });
  return { cookie: `wn_portail=${encodeURIComponent(jeton)}` };
}

async function requete(
  opts: { session?: boolean; longueur?: string | null; type?: string; octets?: Buffer; categorie?: string | null; nom?: string } = {},
) {
  const form = new FormData();
  if (opts.categorie !== null) form.set('categorie', opts.categorie ?? 'courrier');
  // Un dossier désigné par le client : la route doit l'ignorer.
  form.set('idPatient', 'PAT_AUTRE');
  form.set(
    'fichier',
    new File([new Uint8Array(opts.octets ?? PDF)], opts.nom ?? 'document.pdf', { type: opts.type ?? 'application/pdf' }),
  );
  const enveloppe = new Response(form);
  const corps = new Uint8Array(await enveloppe.arrayBuffer());
  const headers = new Headers({ 'content-type': enveloppe.headers.get('content-type') ?? '', ...cookie(opts.session ?? true) });
  const longueur = opts.longueur === undefined ? String(corps.length) : opts.longueur;
  if (longueur !== null) headers.set('content-length', longueur);
  const req = new Request('http://localhost/api/portail/documents', { method: 'POST', body: corps, headers });
  const lecture = vi.spyOn(req, 'formData');
  return { req, lecture };
}

const getReq = (suffixe = '', session = true) =>
  new Request(`http://localhost/api/portail/documents${suffixe}`, { headers: cookie(session) });

let erreurs: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
  vi.stubEnv('WN_PORTAIL_DEPOT_DOCUMENTS', 'true');
  prisma.patient.findUnique.mockResolvedValue({ ...patient });
  prisma.documentDeposePatient.count.mockResolvedValue(0);
  prisma.documentDeposePatient.findMany.mockResolvedValue([]);
  prisma.documentDeposePatient.create.mockResolvedValue({ id: 'doc_neuf' });
  prisma.$queryRaw.mockImplementation(async (sql: TemplateStringsArray) =>
    sql.join('?').includes('FROM patients')
      ? [{ actif: patient.actif, suivi_cloture_le: patient.suiviClotureLe }]
      : [{ n: 0 }],
  );
  prisma.$executeRaw.mockResolvedValue(1);
  prisma.$transaction.mockImplementation(async (cb: (tx: typeof prisma) => unknown) => cb(prisma));
  erreurs = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  erreurs.mockRestore();
});

describe('drapeau fermé : la surface n’existe pas', () => {
  it('GET et POST : 404, sans lire la session ni le corps', async () => {
    vi.stubEnv('WN_PORTAIL_DEPOT_DOCUMENTS', '');
    const { req, lecture } = await requete();
    expect((await POST(req)).status).toBe(404);
    expect((await GET(getReq())).status).toBe(404);
    expect((await GET(getReq('?interrupteur=1'))).status).toBe(404);
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
    expect(lecture).not.toHaveBeenCalled();
  });

  it('seule la valeur exacte `true` ouvre', async () => {
    vi.stubEnv('WN_PORTAIL_DEPOT_DOCUMENTS', '1');
    expect((await GET(getReq())).status).toBe(404);
  });
});

describe('POST /api/portail/documents — l’ordre des gardes', () => {
  it('sans session : 401, corps non lu', async () => {
    const { req, lecture } = await requete({ session: false });
    expect((await POST(req)).status).toBe(401);
    expect(lecture).not.toHaveBeenCalled();
  });

  it('dossier clos : 409, corps non lu', async () => {
    prisma.patient.findUnique.mockResolvedValueOnce({ ...patient, suiviClotureLe: new Date('2026-10-01T00:00:00Z') });
    const { req, lecture } = await requete();
    const res = await POST(req);
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('dossier_cloture');
    expect(lecture).not.toHaveBeenCalled();
  });

  it('dossier mineur : 409 `circuit_mineur_requis`, corps non lu', async () => {
    prisma.patient.findUnique.mockResolvedValueOnce({ ...patient, dateNaissance: '2015-01-01' });
    const { req, lecture } = await requete();
    const res = await POST(req);
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('circuit_mineur_requis');
    expect(lecture).not.toHaveBeenCalled();
  });

  it('date de naissance manquante : 409 `date_naissance_requise`, corps non lu', async () => {
    prisma.patient.findUnique.mockResolvedValueOnce({ ...patient, dateNaissance: null });
    const { req, lecture } = await requete();
    const res = await POST(req);
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('date_naissance_requise');
    expect(lecture).not.toHaveBeenCalled();
  });

  it('trois documents non consultés : 429, corps non lu', async () => {
    prisma.documentDeposePatient.count.mockResolvedValueOnce(3);
    const { req, lecture } = await requete();
    const res = await POST(req);
    expect(res.status).toBe(429);
    expect((await res.json()).reason).toBe('plafond_non_consultes');
    expect(lecture).not.toHaveBeenCalled();
  });

  it('sans longueur annoncée : 411 ; au-delà de 10 Mio et de la marge : 413 — corps non lu', async () => {
    const sans = await requete({ longueur: null });
    expect((await POST(sans.req)).status).toBe(411);
    expect(sans.lecture).not.toHaveBeenCalled();
    const lourd = await requete({ longueur: String(11 * 1024 * 1024) });
    expect((await POST(lourd.req)).status).toBe(413);
    expect(lourd.lecture).not.toHaveBeenCalled();
  });
});

describe('POST — le fichier et la catégorie', () => {
  it('sans catégorie, ou hors liste : 400, rien n’est écrit', async () => {
    for (const categorie of [null, 'ordonnance']) {
      const { req } = await requete({ categorie });
      const res = await POST(req);
      expect(res.status).toBe(400);
      expect((await res.json()).reason).toBe('categorie_absente');
    }
    expect(prisma.documentDeposePatient.create).not.toHaveBeenCalled();
  });

  it('signature des octets discordante avec le type déclaré : 415', async () => {
    const { req } = await requete({ type: 'application/pdf', octets: Buffer.from('<html>pas un PDF</html>') });
    expect((await POST(req)).status).toBe(415);
    expect(prisma.documentDeposePatient.create).not.toHaveBeenCalled();
  });

  it('un PDF valide : 201, écrit pour le dossier de la SESSION, sans nom de fichier', async () => {
    const { req } = await requete({ nom: 'Sophie Nicola — courrier.pdf', categorie: 'compte_rendu_consultation' });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const { data } = prisma.documentDeposePatient.create.mock.calls[0][0];
    expect(data.idPatient).toBe('PAT_SOPHIE');
    expect(data.categorieProposee).toBe('compte_rendu_consultation');
    expect(JSON.stringify(data)).not.toContain('Sophie Nicola');
    expect(Object.keys(data)).not.toContain('nom');
    expect(prisma.$transaction.mock.calls[0][1]).toMatchObject({ isolationLevel: 'ReadCommitted' });
  });

  it('une image : réencodée, sans ses métadonnées', async () => {
    const photo = await sharp({ create: { width: 4, height: 4, channels: 3, background: '#7a9' } })
      .jpeg()
      .withExif({ IFD0: { ImageDescription: 'fixture Sophie Nicola' } })
      .toBuffer();
    expect(photo.includes(Buffer.from('fixture Sophie Nicola'))).toBe(true);
    const { req } = await requete({ type: 'image/jpeg', octets: photo, nom: 'photo.jpg' });
    expect((await POST(req)).status).toBe(201);
    const { data } = prisma.documentDeposePatient.create.mock.calls[0][0];
    expect(data.typeMime).toBe('image/jpeg');
    expect(Buffer.from(data.contenu).includes(Buffer.from('fixture Sophie Nicola'))).toBe(false);
  });

  it('même fichier déjà déposé : 409 « déjà déposé »', async () => {
    prisma.documentDeposePatient.count
      .mockResolvedValueOnce(0) // plafond, avant le corps
      .mockResolvedValueOnce(0) // plafond, sous le verrou
      .mockResolvedValueOnce(1); // doublon
    const { req } = await requete();
    const res = await POST(req);
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ reason: 'document_deja_depose', error: 'Ce document est déjà déposé dans votre dossier.' });
  });

  it('une contrainte refusée par la base : 500, et son message n’est pas journalisé', async () => {
    prisma.documentDeposePatient.create.mockRejectedValueOnce(
      Object.assign(new Error('dépôt refusé : PAT_SOPHIE %PDF-1.7 fixture Sophie Nicola'), { code: 'P2010' }),
    );
    const { req } = await requete();
    const res = await POST(req);
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ reason: 'server_error', error: 'Erreur technique.' });
    const journalise = JSON.stringify(erreurs.mock.calls);
    expect(journalise).not.toContain('PAT_SOPHIE');
    expect(journalise).not.toContain('Sophie Nicola');
    expect(journalise).not.toContain('dépôt refusé');
  });
});

describe('GET /api/portail/documents', () => {
  it('ses dépôts et ce qui conditionne un dépôt', async () => {
    prisma.documentDeposePatient.findMany.mockResolvedValueOnce([
      { deposeLe: new Date('2026-10-08T08:00:00Z'), categorieProposee: 'courrier', retireLe: null },
    ]);
    const res = await GET(getReq());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      documents: [{ deposeLe: '2026-10-08T08:00:00.000Z', categorie: 'courrier', retireLe: null }],
      dossierOuvert: true,
      statutAge: 'majeur',
      plafond: null,
    });
    expect(prisma.documentDeposePatient.findMany.mock.calls[0][0].where).toEqual({ idPatient: 'PAT_SOPHIE' });
  });

  it('interrupteur : « ouvert » au dossier majeur, sans rien lire du dossier', async () => {
    const res = await GET(getReq('?interrupteur=1'));
    expect(await res.json()).toEqual({ ok: true, ouvert: true });
    expect(prisma.documentDeposePatient.findMany).not.toHaveBeenCalled();
    expect(prisma.documentDeposePatient.count).not.toHaveBeenCalled();
  });

  it('interrupteur : pas de lien pour un dossier mineur ou sans date', async () => {
    prisma.patient.findUnique.mockResolvedValueOnce({ ...patient, dateNaissance: '2015-01-01' });
    expect((await GET(getReq('?interrupteur=1'))).status).toBe(409);
    prisma.patient.findUnique.mockResolvedValueOnce({ ...patient, dateNaissance: null });
    expect((await GET(getReq('?interrupteur=1'))).status).toBe(409);
  });

  it('sans session : 401', async () => {
    expect((await GET(getReq('', false))).status).toBe(401);
  });
});
