import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    patient: { findUnique: vi.fn() },
    trustAcknowledgement: { count: vi.fn() },
    compteRenduBiologique: { count: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
    $transaction: vi.fn(),
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { signPatientSession } from '@/lib/patient-session';
import { GET, POST } from './route';

// La transmission du compte rendu par le patient ([[D-269]], LOT-04). Ce banc
// tient l'ORDRE de §5 — drapeau, session, accusé, dossier ouvert, plafonds,
// puis seulement le corps — et que le dossier vienne de la session, jamais du
// client.

const DRAPEAUX = ['WN_CB_ENABLED', 'WN_CB_RESULTS_ENABLED', 'WN_BIO_INGEST_ENABLED', 'WN_BIO_PORTAIL_ENABLED'];
const PDF = Buffer.from('%PDF-1.7\n% fixture Jennifer Martin\n%%EOF');

const patient = {
  idPatient: 'PAT_JENNIFER',
  email: 'jennifer.martin@example.test',
  prenom: 'Jennifer',
  nom: 'Martin',
  actif: true,
  suiviClotureLe: null as Date | null,
  accessTokenRevoked: false,
  praticienEmail: 'praticien@wellneuro.fr',
};

function cookie(avecSession: boolean): Record<string, string> {
  if (!avecSession) return {};
  const jeton = signPatientSession({ idPatient: patient.idPatient, email: patient.email });
  return { cookie: `wn_portail=${encodeURIComponent(jeton)}` };
}

async function requete(opts: { session?: boolean; longueur?: string | null; type?: string; octets?: Buffer; url?: string } = {}) {
  const form = new FormData();
  form.set('fichier', new Blob([new Uint8Array(opts.octets ?? PDF)], { type: opts.type ?? 'application/pdf' }));
  const enveloppe = new Response(form);
  const corps = new Uint8Array(await enveloppe.arrayBuffer());
  const headers = new Headers({ 'content-type': enveloppe.headers.get('content-type') ?? '', ...cookie(opts.session ?? true) });
  const longueur = opts.longueur === undefined ? String(corps.length) : opts.longueur;
  if (longueur !== null) headers.set('content-length', longueur);
  const req = new Request(opts.url ?? 'http://localhost/api/portail/comptes-rendus', { method: 'POST', body: corps, headers });
  const lecture = vi.spyOn(req, 'formData');
  return { req, lecture };
}

const avant: Record<string, string | undefined> = {};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
  for (const nom of DRAPEAUX) {
    avant[nom] = process.env[nom];
    process.env[nom] = 'true';
  }
  prisma.patient.findUnique.mockResolvedValue({ ...patient });
  prisma.trustAcknowledgement.count.mockResolvedValue(1);
  prisma.compteRenduBiologique.count.mockResolvedValue(0);
  prisma.compteRenduBiologique.findMany.mockResolvedValue([]);
  prisma.compteRenduBiologique.create.mockResolvedValue({ id: 'cr_neuf' });
  // La relecture du dossier sous le verrou du dépôt rend l'état de la fixture.
  prisma.$queryRaw.mockImplementation(async (sql: TemplateStringsArray) =>
    sql.join('?').includes('FROM patients')
      ? [{ actif: patient.actif, suivi_cloture_le: patient.suiviClotureLe }]
      : [{ n: 0 }],
  );
  prisma.$executeRaw.mockResolvedValue(1);
  prisma.$transaction.mockImplementation(async (cb: (tx: typeof prisma) => unknown) => cb(prisma));
});

afterEach(() => {
  for (const nom of DRAPEAUX) {
    if (avant[nom] === undefined) delete process.env[nom];
    else process.env[nom] = avant[nom];
  }
});

describe('POST /api/portail/comptes-rendus — l’ordre des gardes (D-269 §5)', () => {
  it('drapeau éteint : 503, sans lire la session ni le corps (comportement actuel)', async () => {
    delete process.env.WN_BIO_PORTAIL_ENABLED;
    const { req, lecture } = await requete();
    const res = await POST(req);
    expect(res.status).toBe(503);
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
    expect(lecture).not.toHaveBeenCalled();
  });

  it('le drapeau exige l’import : portail posé, import éteint ⇒ 503', async () => {
    delete process.env.WN_BIO_INGEST_ENABLED;
    const { req } = await requete();
    expect((await POST(req)).status).toBe(503);
  });

  it('sans session : 401, corps non lu', async () => {
    const { req, lecture } = await requete({ session: false });
    expect((await POST(req)).status).toBe(401);
    expect(lecture).not.toHaveBeenCalled();
  });

  it('session d’un accès révoqué : 403, corps non lu', async () => {
    prisma.patient.findUnique.mockResolvedValueOnce({ ...patient, accessTokenRevoked: true });
    const { req, lecture } = await requete();
    expect((await POST(req)).status).toBe(403);
    expect(lecture).not.toHaveBeenCalled();
  });

  it('sans accusé de la version courante d’`usage_ia` : 403 `accuse_requis`, corps non lu', async () => {
    prisma.trustAcknowledgement.count.mockResolvedValueOnce(0);
    const { req, lecture } = await requete();
    const res = await POST(req);
    expect(res.status).toBe(403);
    expect((await res.json()).reason).toBe('accuse_requis');
    expect(lecture).not.toHaveBeenCalled();
    expect(prisma.compteRenduBiologique.create).not.toHaveBeenCalled();
  });

  it('dossier clos : 409, message au patient, corps non lu', async () => {
    prisma.patient.findUnique.mockResolvedValueOnce({ ...patient, suiviClotureLe: new Date('2026-10-01T00:00:00Z') });
    const { req, lecture } = await requete();
    const res = await POST(req);
    expect(res.status).toBe(409);
    const corps = await res.json();
    expect(corps.reason).toBe('dossier_cloture');
    expect(corps.error).not.toContain('Rouvrez');
    expect(lecture).not.toHaveBeenCalled();
  });

  it('plafond de 3 en attente, ou de 10 en 24 h : 429, corps non lu', async () => {
    prisma.compteRenduBiologique.count.mockResolvedValueOnce(3);
    let { req, lecture } = await requete();
    let res = await POST(req);
    expect(res.status).toBe(429);
    expect((await res.json()).reason).toBe('plafond_en_attente');
    expect(lecture).not.toHaveBeenCalled();

    prisma.$queryRaw.mockResolvedValueOnce([{ n: 10 }]);
    ({ req, lecture } = await requete());
    res = await POST(req);
    expect(res.status).toBe(429);
    expect((await res.json()).reason).toBe('plafond_24h');
    expect(lecture).not.toHaveBeenCalled();
  });

  it('longueur non annoncée : 411, corps non lu', async () => {
    const { req, lecture } = await requete({ longueur: null });
    expect((await POST(req)).status).toBe(411);
    expect(lecture).not.toHaveBeenCalled();
  });

  it('longueur annoncée au-delà de 10 Mo : 413, corps non lu', async () => {
    const { req, lecture } = await requete({ longueur: String(11 * 1024 * 1024) });
    expect((await POST(req)).status).toBe(413);
    expect(lecture).not.toHaveBeenCalled();
  });

  it('type déclaré qui ne concorde pas avec la signature : 415, rien d’écrit', async () => {
    const { req } = await requete({ type: 'image/png' });
    expect((await POST(req)).status).toBe(415);
    expect(prisma.compteRenduBiologique.create).not.toHaveBeenCalled();
  });
});

describe('POST /api/portail/comptes-rendus — le dépôt', () => {
  it('201 : le document entre au dossier DE LA SESSION, origine patient, sans auteur praticien — un identifiant dans l’URL n’y change rien', async () => {
    const { req } = await requete({ url: 'http://localhost/api/portail/comptes-rendus?idPatient=PAT_AUTRUI' });
    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true });
    const data = prisma.compteRenduBiologique.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ idPatient: 'PAT_JENNIFER', origine: 'patient', deposePar: null, typeMime: 'application/pdf' });
  });

  it('dossier clos PENDANT l’envoi (après le contrôle de la route) : 409, même raison et même message, rien n’est écrit', async () => {
    prisma.$queryRaw.mockImplementation(async (sql: TemplateStringsArray) =>
      sql.join('?').includes('FROM patients')
        ? [{ actif: true, suivi_cloture_le: new Date('2026-10-10T12:00:00Z') }]
        : [{ n: 0 }],
    );
    const { req } = await requete();
    const res = await POST(req);
    expect(res.status).toBe(409);
    const corps = await res.json();
    expect(corps.reason).toBe('dossier_cloture');
    expect(corps.error).toBe('Votre suivi est clôturé : vous ne pouvez plus déposer de document.');
    expect(prisma.compteRenduBiologique.create).not.toHaveBeenCalled();
  });

  it('un document déjà présent : 409, sans identifiant rendu', async () => {
    prisma.$transaction.mockRejectedValueOnce(Object.assign(new Error('unique'), { code: 'P2002' }));
    const { req } = await requete();
    const res = await POST(req);
    expect(res.status).toBe(409);
    const corps = await res.json();
    expect(corps.reason).toBe('document_deja_transmis');
    expect(corps).not.toHaveProperty('idCompteRendu');
  });
});

describe('GET /api/portail/comptes-rendus (D-269 §4)', () => {
  const get = (session = true) => new Request('http://localhost/api/portail/comptes-rendus', { headers: cookie(session) });

  it('drapeau éteint : 503 ; sans session : 401', async () => {
    delete process.env.WN_BIO_PORTAIL_ENABLED;
    expect((await GET(get())).status).toBe(503);
    process.env.WN_BIO_PORTAIL_ENABLED = 'true';
    expect((await GET(get(false))).status).toBe(401);
  });

  it('rend date et statut des documents du patient, et ce qui conditionne un dépôt — rien d’autre', async () => {
    prisma.trustAcknowledgement.count.mockResolvedValueOnce(0);
    prisma.compteRenduBiologique.findMany.mockResolvedValueOnce([
      { deposeLe: new Date('2026-10-07T09:00:00Z'), purgeLe: new Date('2026-10-07T10:00:00Z'), motifEcart: 'illisible', imports: [] },
    ]);
    const res = await GET(get());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      documents: [{ deposeLe: '2026-10-07T09:00:00.000Z', statut: 'illisible' }],
      accuseRequis: true,
      dossierOuvert: true,
      plafond: null,
    });
    expect(prisma.compteRenduBiologique.findMany.mock.calls[0][0].where).toEqual({ idPatient: 'PAT_JENNIFER', origine: 'patient' });
  });
});
