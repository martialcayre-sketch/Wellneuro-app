import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Garde, journal des accès (G-TRUST-04) et en-têtes du téléchargement. Le
// contenu du document est jugé par lib/export-dossier/assembler.test.ts, pas
// ici : l'assembleur et le moteur PDF sont simulés.
const { getServerSession, prisma, assemblerDossierExport, rendrePdf } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    journalAccesDossier: { create: vi.fn(), deleteMany: vi.fn() },
  },
  assemblerDossierExport: vi.fn(),
  rendrePdf: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/export-dossier/assembler', async importOriginal => {
  const reel = await importOriginal<typeof import('@/lib/export-dossier/assembler')>();
  return { ...reel, assemblerDossierExport };
});
vi.mock('@/lib/export-dossier/pdf', () => ({ rendrePdf }));

import { GET } from './route';
import { FORME_PSEUDONYME, pseudonymeExport, VARIABLE_SECRET_PSEUDONYME } from '@/lib/export-dossier/pseudonyme';

// Secret de test, jamais celui d'un environnement ([[D-512]] §1).
const SECRET = 'secret-de-test-route-export-pseudonyme-0123456789';

const DOCUMENT = {
  titre: 'Dossier patient PAT_1',
  sousTitre: 'Version pseudonymisée pour une IA externe',
  mentionPied: 'PAT_1 · version pseudonymisée',
  metadonnees: { titre: 'Dossier patient PAT_1', sujet: 'Dossier de neuronutrition exporté depuis WellNeuro' },
  blocs: [],
};
const OCTETS = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]); // « %PDF- »

function request(query = 'idPatient=PAT_1&version=ia-externe'): Request {
  return new Request(`http://localhost/api/praticien/export-dossier?${query}`);
}

describe('GET /api/praticien/export-dossier', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'P@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'p@wellneuro.fr' });
    assemblerDossierExport.mockResolvedValue(DOCUMENT);
    rendrePdf.mockResolvedValue(OCTETS);
    vi.stubEnv(VARIABLE_SECRET_PSEUDONYME, SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('sans session : 401, rien n’est lu', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET(request());
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ ok: false, reason: 'unauthenticated', error: 'Authentification requise.' });
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
    expect(assemblerDossierExport).not.toHaveBeenCalled();
  });

  it.each([
    ['absent', 'version=ia-externe'],
    ['vide', 'idPatient=&version=ia-externe'],
    ['caractères interdits', 'idPatient=PAT_1%27%3B--&version=ia-externe'],
    ['trop long', `idPatient=${'P'.repeat(65)}&version=ia-externe`],
  ])('idPatient %s : 400, rien n’est lu', async (_cas, query) => {
    const res = await GET(request(query));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ ok: false, reason: 'invalid' });
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });

  it.each(['pseudonymisee', 'COMPLETE', '', 'complet'])(
    'version présente mais invalide (%j) : 400 en français, rien n’est lu',
    async version => {
      const res = await GET(request(`idPatient=PAT_1&version=${version}`));
      expect(res.status).toBe(400);
      const corps = await res.json();
      expect(corps).toMatchObject({ ok: false, reason: 'invalid' });
      expect(corps.error).toContain('Version d’export invalide');
      expect(prisma.patient.findUnique).not.toHaveBeenCalled();
      expect(assemblerDossierExport).not.toHaveBeenCalled();
    },
  );

  it('version absente : la version pseudonymisée, jamais la complète', async () => {
    const res = await GET(request('idPatient=PAT_1'));
    expect(res.status).toBe(200);
    expect(assemblerDossierExport).toHaveBeenCalledWith(expect.objectContaining({ version: 'ia-externe' }));
    expect(res.headers.get('Content-Disposition')).toContain('-ia-externe-');
  });

  it('patient inconnu : 404, jamais journalisé, rien n’est assemblé', async () => {
    prisma.patient.findUnique.mockResolvedValue(null);
    const res = await GET(request());
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ ok: false, reason: 'patient_not_found' });
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
    expect(assemblerDossierExport).not.toHaveBeenCalled();
  });

  it('patient d’un autre praticien : 403, jamais journalisé, rien n’est assemblé', async () => {
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'autre@wellneuro.fr' });
    const res = await GET(request());
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ ok: false, reason: 'forbidden' });
    // Un refus ne se journalise pas : la ligne nommerait un dossier non lu.
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
    expect(assemblerDossierExport).not.toHaveBeenCalled();
  });

  // Revue de sécurité du 2026-11-12, P2-1 : le gabarit dit quelle version est sortie.
  it.each([
    ['idPatient=PAT_1&version=complete', '/api/praticien/export-dossier?version=complete'],
    ['idPatient=PAT_1&version=ia-externe', '/api/praticien/export-dossier?version=ia-externe'],
    ['idPatient=PAT_1', '/api/praticien/export-dossier?version=ia-externe'],
  ])('accès accordé (%s) : journalisé UNE fois, au gabarit littéral de la version (G-TRUST-04)', async (query, route) => {
    const res = await GET(request(query));
    expect(res.status).toBe(200);
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledTimes(1);
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledWith({
      data: {
        idPatient: 'PAT_1',
        praticienEmail: 'p@wellneuro.fr',
        route,
        methode: 'GET',
      },
    });
  });

  it('200 : le PDF en pièce jointe, nommé sans le nom du patient, jamais mis en cache', async () => {
    const res = await GET(request('idPatient=PAT_1&version=complete'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(res.headers.get('Content-Disposition')).toMatch(
      /^attachment; filename="dossier-PAT_1-complet-\d{4}-\d{2}-\d{2}\.pdf"$/,
    );
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(OCTETS);
  });

  it('assemble avec l’e-mail de session normalisé et UN SEUL instant pour le document et le PDF', async () => {
    await GET(request('idPatient=PAT_1&version=ia-externe'));
    expect(assemblerDossierExport).toHaveBeenCalledTimes(1);
    const [params] = assemblerDossierExport.mock.calls[0];
    expect(params).toMatchObject({ idPatient: 'PAT_1', praticienEmail: 'p@wellneuro.fr', version: 'ia-externe' });
    expect(params.maintenant).toBeInstanceOf(Date);
    expect(rendrePdf).toHaveBeenCalledWith(DOCUMENT, { maintenant: params.maintenant });
  });

  // [[D-512]] §1 : le pseudonyme remplace PATnnn dans le nom du fichier et part à l'assembleur.
  it('200 ia-externe : pseudonyme d’export à l’assembleur, dans le nom du fichier et dans l’en-tête ; jamais l’identifiant interne', async () => {
    const res = await GET(request('idPatient=PAT_1&version=ia-externe'));
    expect(res.status).toBe(200);
    const pseudonyme = pseudonymeExport('PAT_1', SECRET);
    expect(pseudonyme).toMatch(FORME_PSEUDONYME);
    expect(assemblerDossierExport).toHaveBeenCalledWith(expect.objectContaining({ pseudonyme }));
    expect(res.headers.get('X-Pseudonyme-Export')).toBe(pseudonyme);
    const disposition = res.headers.get('Content-Disposition') ?? '';
    expect(disposition).toBe(
      `attachment; filename="dossier-${pseudonyme}-ia-externe-${disposition.match(/\d{4}-\d{2}-\d{2}/)?.[0]}.pdf"`,
    );
    expect(disposition).not.toContain('PAT_1');
  });

  it('200 complete : ni pseudonyme ni en-tête, le nom garde l’identifiant interne', async () => {
    const res = await GET(request('idPatient=PAT_1&version=complete'));
    expect(res.status).toBe(200);
    expect(assemblerDossierExport).toHaveBeenCalledWith(expect.objectContaining({ pseudonyme: null }));
    expect(res.headers.get('X-Pseudonyme-Export')).toBeNull();
  });

  it.each([
    ['absent', ''],
    ['trop court (31 caractères)', 'x'.repeat(31)],
  ])('secret de pseudonymisation %s : ia-externe en 503, rien n’est lu ni journalisé ; la complète reste servie', async (_cas, valeur) => {
    const erreur = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubEnv(VARIABLE_SECRET_PSEUDONYME, valeur);
    for (const query of ['idPatient=PAT_1&version=ia-externe', 'idPatient=PAT_1']) {
      const res = await GET(request(query));
      expect(res.status).toBe(503);
      const corps = await res.json();
      expect(corps).toMatchObject({ ok: false, reason: 'pseudonymisation_indisponible' });
      expect(corps.error).toContain('Export pseudonymisé indisponible');
    }
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
    expect(assemblerDossierExport).not.toHaveBeenCalled();
    expect(JSON.stringify(erreur.mock.calls)).not.toContain(valeur || '\u0000');
    const complete = await GET(request('idPatient=PAT_1&version=complete'));
    expect(complete.status).toBe(200);
    erreur.mockRestore();
  });

  it('dossier disparu entre la garde et l’assemblage : 404', async () => {
    assemblerDossierExport.mockResolvedValue(null);
    const res = await GET(request());
    expect(res.status).toBe(404);
    expect(rendrePdf).not.toHaveBeenCalled();
  });

  it('exception : 500 « Erreur technique. », seul le message part au journal', async () => {
    const erreur = vi.spyOn(console, 'error').mockImplementation(() => {});
    assemblerDossierExport.mockRejectedValue(new Error('panne simulée'));
    const res = await GET(request());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, reason: 'exception', error: 'Erreur technique.' });
    expect(erreur).toHaveBeenCalledWith('[praticien/export-dossier GET]', 'panne simulée');
    erreur.mockRestore();
  });
});
