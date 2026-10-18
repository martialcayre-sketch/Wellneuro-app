import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// « Pour votre médecin » au portail (D-307 §3, F38). Signature de session
// réelle : seuls Prisma et le module du document sont simulés.

const { prisma, documentDisponible, telechargerDocument } = vi.hoisted(() => ({
  prisma: { patient: { findUnique: vi.fn() } },
  documentDisponible: vi.fn(),
  telechargerDocument: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/documents/documentMedecinImprime', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/documents/documentMedecinImprime')>()),
  documentDisponible,
  telechargerDocument,
}));

import { signPatientSession } from '@/lib/patient-session';
import { GET } from './route';
import { POST as TELECHARGER } from './telechargement/route';

const PATIENT = { idPatient: 'PAT_TEST', email: 'jennifer.martin@example.test' };

function requete(chemin: string, avecCookie = true, method = 'GET'): Request {
  const cookie = signPatientSession({ idPatient: PATIENT.idPatient, email: PATIENT.email });
  return new Request(`http://localhost${chemin}`, {
    method,
    headers: avecCookie ? { cookie: `wn_portail=${encodeURIComponent(cookie)}` } : {},
  });
}

const telechargement = (avecCookie = true) =>
  requete('/api/portail/document-medecin/telechargement', avecCookie, 'POST');

function compte(revoque = false) {
  return {
    idPatient: PATIENT.idPatient, actif: true, accessTokenRevoked: revoque, email: PATIENT.email,
    sessionsInvalidesAvant: null, createdAt: new Date('2026-06-01T08:00:00.000Z'),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NEXTAUTH_SECRET', 'secret-de-test-non-production');
  vi.stubEnv('WN_DOCUMENT_MEDECIN_PATIENT', 'true');
  prisma.patient.findUnique.mockResolvedValue(compte());
  documentDisponible.mockResolvedValue({ imprimeLe: new Date('2026-10-18T15:00:00.000Z') });
  telechargerDocument.mockResolvedValue({ html: '<!doctype html><p>Pour le médecin</p>', imprimeLe: new Date() });
});
afterEach(() => vi.unstubAllEnvs());

describe('GET /api/portail/document-medecin', () => {
  it('drapeau fermé : 503, ni session ni base', async () => {
    vi.stubEnv('WN_DOCUMENT_MEDECIN_PATIENT', '');
    expect((await GET(requete('/api/portail/document-medecin'))).status).toBe(503);
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
    expect(documentDisponible).not.toHaveBeenCalled();
  });

  it('sans session : 401', async () => {
    expect((await GET(requete('/api/portail/document-medecin', false))).status).toBe(401);
    expect(documentDisponible).not.toHaveBeenCalled();
  });

  it('rend la date du document de CE patient, sans contenu', async () => {
    const res = await GET(requete('/api/portail/document-medecin'));
    expect(await res.json()).toEqual({ ok: true, document: { imprimeLe: '2026-10-18T15:00:00.000Z' } });
    expect(documentDisponible).toHaveBeenCalledWith(PATIENT.idPatient);
  });

  it('rien à remettre : document null', async () => {
    documentDisponible.mockResolvedValue(null);
    expect(await (await GET(requete('/api/portail/document-medecin'))).json()).toEqual({ ok: true, document: null });
  });

  it('interrupteur : ouvert et disponible, sans date ni contenu', async () => {
    expect(await (await GET(requete('/api/portail/document-medecin?interrupteur=1'))).json())
      .toEqual({ ok: true, ouvert: true, disponible: true });
    documentDisponible.mockResolvedValue(null);
    expect(await (await GET(requete('/api/portail/document-medecin?interrupteur=1'))).json())
      .toEqual({ ok: true, ouvert: true, disponible: false });
  });
});

describe('POST /api/portail/document-medecin/telechargement', () => {
  it('n’expose pas de GET : un HEAD ou un lien ne journalise rien', async () => {
    const route = await import('./telechargement/route');
    expect('GET' in route).toBe(false);
    expect('HEAD' in route).toBe(false);
  });

  it('drapeau fermé : 503, rien n’est journalisé', async () => {
    vi.stubEnv('WN_DOCUMENT_MEDECIN_PATIENT', 'false');
    expect((await TELECHARGER(telechargement())).status).toBe(503);
    expect(telechargerDocument).not.toHaveBeenCalled();
  });

  it('sans session : 401 ; compte révoqué : 403 — rien n’est journalisé', async () => {
    expect((await TELECHARGER(telechargement(false))).status).toBe(401);
    prisma.patient.findUnique.mockResolvedValue(compte(true));
    expect((await TELECHARGER(telechargement())).status).toBe(403);
    expect(telechargerDocument).not.toHaveBeenCalled();
  });

  it('sert le fichier de CE patient, en pièce jointe, jamais en cache', async () => {
    const res = await TELECHARGER(telechargement());
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(res.headers.get('content-disposition')).toBe('attachment; filename="pour-votre-medecin.html"');
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(await res.text()).toContain('Pour le médecin');
    expect(telechargerDocument).toHaveBeenCalledWith(PATIENT.idPatient);
  });

  it('rien à remettre : 404, sans dire pourquoi', async () => {
    telechargerDocument.mockResolvedValue(null);
    const res = await TELECHARGER(telechargement());
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ ok: false, reason: 'introuvable', error: 'Aucun document à remettre.' });
  });
});
