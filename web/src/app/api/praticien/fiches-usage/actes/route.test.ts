import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, poserActeRubrique } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  poserActeRubrique: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/fiches-usage/decision', () => ({ poserActeRubrique, poserActeLibelle: vi.fn() }));

import { POST } from './route';

const CORPS = {
  idVersion: 'version0000000002',
  rubrique: 'question',
  acte: 'validee',
  empreinteVue: 'a'.repeat(64),
  dernierActeVu: null,
  relectureIntegrale: true,
};

function requete(body: unknown, brut?: string): Request {
  return new Request('http://localhost/api/praticien/fiches-usage/actes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: brut ?? JSON.stringify(body),
  });
}

describe('POST /api/praticien/fiches-usage/actes — un acte par rubrique (D-314 §3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'Praticien@Exemple.fr' } });
    poserActeRubrique.mockResolvedValue({
      issue: 'posee',
      acte: { ordre: '7', acte: 'validee', validateur: 'praticien@exemple.fr', relectureIntegrale: true, motif: null, le: '2026-10-16T02:00:00.000Z' },
      etat: { etat: 'validee', ordre: '7', le: '2026-10-16T02:00:00.000Z', validateur: 'praticien@exemple.fr' },
    });
  });

  it('401 sans session, ou sans e-mail', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await POST(requete(CORPS))).status).toBe(401);
    getServerSession.mockResolvedValue({ user: {} });
    expect((await POST(requete(CORPS))).status).toBe(401);
    expect(poserActeRubrique).not.toHaveBeenCalled();
  });

  it('le validateur est l’e-mail de la session, jamais une valeur du corps', async () => {
    await POST(requete({ ...CORPS, validateur: 'autre@exemple.fr' }));
    expect(poserActeRubrique.mock.calls[0][0]).toMatchObject({ validateur: 'praticien@exemple.fr', rubrique: 'question' });
  });

  it.each([
    ['corps nul', null, 'invalid'],
    ['acte inconnu', { ...CORPS, acte: 'publiee' }, 'acte_invalide'],
    ['empreinte hors format', { ...CORPS, empreinteVue: 'A'.repeat(64) }, 'empreinte_invalide'],
    ['jeton hors format', { ...CORPS, dernierActeVu: '-1' }, 'jeton_invalide'],
    ['identifiant hors format', { ...CORPS, idVersion: '../x' }, 'id_invalide'],
  ])('400 : %s', async (_cas, corps, reason) => {
    const res = await POST(requete(corps));
    expect(res.status).toBe(400);
    expect((await res.json()).reason).toBe(reason);
    expect(poserActeRubrique).not.toHaveBeenCalled();
  });

  it('400 sur un JSON illisible', async () => {
    expect((await POST(requete(null, '{ pas du json'))).status).toBe(400);
  });

  it.each([
    ['structure_non_signee', 409],
    ['empreinte_divergente', 409],
    ['etat_divergent', 409],
    ['version_depassee', 409],
    ['relecture_requise', 422],
    ['motif_requis', 422],
    ['rubrique_inconnue', 400],
    ['introuvable', 404],
  ])('refus « %s » → %i', async (raison, status) => {
    poserActeRubrique.mockResolvedValue({ issue: 'refusee', raison });
    const res = await POST(requete(CORPS));
    expect(res.status).toBe(status);
    expect((await res.json()).reason).toBe(raison);
  });

  it('un refus de structure rend ses anomalies', async () => {
    poserActeRubrique.mockResolvedValue({ issue: 'refusee', raison: 'structure', anomalies: [{ code: 'structure_perimee' }] });
    const res = await POST(requete(CORPS));
    expect(res.status).toBe(422);
    expect((await res.json()).anomalies).toEqual([{ code: 'structure_perimee' }]);
  });

  it('200 : l’acte posé et l’état de la rubrique', async () => {
    const res = await POST(requete(CORPS));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, etat: { etat: 'validee' } });
  });

  it('500 sans aucun texte journalisé', async () => {
    poserActeRubrique.mockRejectedValue(Object.assign(new Error('Question synthétique. recopiée'), { code: 'P2010' }));
    const journal = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await POST(requete(CORPS));
    expect(res.status).toBe(500);
    expect(JSON.stringify(journal.mock.calls)).not.toContain('synthétique');
    expect(JSON.stringify(journal.mock.calls)).toContain('P2010');
    journal.mockRestore();
  });
});
