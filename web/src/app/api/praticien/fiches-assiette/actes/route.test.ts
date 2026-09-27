import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, poserActeFiche } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  poserActeFiche: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/fiches-assiette/decision', () => ({ poserActeFiche }));

import { POST } from './route';

const CORPS = {
  idVersion: 'version0000000002',
  acte: 'validee',
  contenuSha256Vu: 'a'.repeat(64),
  dernierActeVu: null,
  relectureIntegrale: true,
};

function requete(body: unknown, brut?: string): Request {
  return new Request('http://localhost/api/praticien/fiches-assiette/actes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: brut ?? JSON.stringify(body),
  });
}

describe('POST /api/praticien/fiches-assiette/actes (D-251, lot 6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'Praticien@Exemple.fr' } });
    poserActeFiche.mockResolvedValue({
      issue: 'posee',
      acte: { ordre: '10', acte: 'validee', validateur: 'praticien@exemple.fr', relectureIntegrale: true, motif: null, le: '2026-09-27T10:00:00.000Z' },
      etat: { etat: 'validee', ordre: '10', le: '2026-09-27T10:00:00.000Z', validateur: 'praticien@exemple.fr' },
    });
  });

  it('exige une session, e-mail compris — jamais d’acte anonyme', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await POST(requete(CORPS))).status).toBe(401);
    getServerSession.mockResolvedValue({ user: {} });
    expect((await POST(requete(CORPS))).status).toBe(401);
    expect(poserActeFiche).not.toHaveBeenCalled();
  });

  it('le validateur est l’e-mail de la SESSION, jamais une valeur du corps', async () => {
    await POST(requete({ ...CORPS, validateur: 'quelqu-un@ailleurs.fr' }));
    expect(poserActeFiche.mock.calls[0][0].validateur).toBe('praticien@exemple.fr');
  });

  it.each([
    ['corps illisible', undefined, '{ pas du json'],
    ['corps null', undefined, 'null'],
    ['corps tableau', undefined, '[]'],
    ['identifiant', { ...CORPS, idVersion: '../x' }, undefined],
    ['acte inconnu', { ...CORPS, acte: 'publiee' }, undefined],
    ['empreinte', { ...CORPS, contenuSha256Vu: 'A'.repeat(64) }, undefined],
    ['jeton non numérique', { ...CORPS, dernierActeVu: 'abc' }, undefined],
    ['jeton absent (undefined n’est pas null)', { ...CORPS, dernierActeVu: undefined }, undefined],
  ])('400 sur %s', async (_cas, corps, brut) => {
    expect((await POST(requete(corps, brut))).status).toBe(400);
    expect(poserActeFiche).not.toHaveBeenCalled();
  });

  it('transmet la déclaration telle quelle — la lib n’accepte que true', async () => {
    await POST(requete({ ...CORPS, relectureIntegrale: 'true' }));
    expect(poserActeFiche.mock.calls[0][0].relectureIntegrale).toBe('true');
  });

  it.each([
    ['relecture_requise', 422],
    ['motif_requis', 422],
    ['version_introuvable', 404],
    ['empreinte_divergente', 409],
    ['etat_illisible', 409],
    ['etat_divergent', 409],
    ['deja_dans_cet_etat', 409],
    ['version_depassee', 409],
  ])('refus %s → %i, message en français', async (raison, status) => {
    poserActeFiche.mockResolvedValue({ issue: 'refusee', raison });
    const res = await POST(requete(CORPS));
    expect(res.status).toBe(status);
    const json = await res.json();
    expect(json).toMatchObject({ ok: false, reason: raison });
    expect(json.error.length).toBeGreaterThan(0);
  });

  it('un refus des contrôles rend ses anomalies (422)', async () => {
    poserActeFiche.mockResolvedValue({
      issue: 'refusee',
      raison: 'controle',
      anomalies: [{ code: 'precaution_manquante', detail: 'La réserve de sécurité … n’est portée par aucune précaution.' }],
    });
    const res = await POST(requete(CORPS));
    expect(res.status).toBe(422);
    expect((await res.json()).anomalies[0].code).toBe('precaution_manquante');
  });

  it('200 : l’acte posé et le nouvel état', async () => {
    const res = await POST(requete(CORPS));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, acte: { ordre: '10' }, etat: { etat: 'validee' } });
  });

  it('une erreur de base ne recopie rien, ni dans la réponse ni dans le journal', async () => {
    const journal = vi.spyOn(console, 'error').mockImplementation(() => {});
    poserActeFiche.mockRejectedValue(Object.assign(new Error('Invalid invocation: texteSource: "Source synthétique."'), { code: 'P2010' }));
    const res = await POST(requete(CORPS));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('synthétique');
    expect(JSON.stringify(journal.mock.calls)).not.toContain('synthétique');
    expect(JSON.stringify(journal.mock.calls)).toContain('P2010');
    journal.mockRestore();
  });
});
