import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, exclureDeLaRecherche } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  exclureDeLaRecherche: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/rag/claims/revue', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/rag/claims/revue')>()),
  exclureDeLaRecherche,
}));

import { POST } from './route';

function requete(body: unknown): Request {
  return new Request('http://localhost/api/praticien/corpus/claims/exclusion-recherche', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const CORPS = { id: 'WN-CL-0056-001@v1.0', sens: 'exclure', motif: ' dossier, classement ' };

describe('/api/praticien/corpus/claims/exclusion-recherche ([[D-490]])', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'Praticien@wellneuro.fr' } });
    exclureDeLaRecherche.mockResolvedValue({
      ok: true,
      claim: { id: CORPS.id, excluRecherche: true },
      inchange: false,
    });
  });

  it('exige une session avec e-mail — jamais un acte anonyme', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await POST(requete(CORPS))).status).toBe(401);
    getServerSession.mockResolvedValue({ user: {} });
    expect((await POST(requete(CORPS))).status).toBe(401);
    expect(exclureDeLaRecherche).not.toHaveBeenCalled();
  });

  it('pose l’acte au nom du praticien en session, motif rogné', async () => {
    const reponse = await POST(requete(CORPS));
    expect(reponse.status).toBe(200);
    expect(await reponse.json()).toEqual({
      ok: true,
      claim: { id: CORPS.id, excluRecherche: true },
      inchange: false,
    });
    expect(exclureDeLaRecherche).toHaveBeenCalledWith({
      id: CORPS.id,
      sens: 'exclure',
      motif: 'dossier, classement',
      validateur: 'praticien@wellneuro.fr',
    });
  });

  it('motif obligatoire, blancs invisibles compris : 422, rien n’est écrit', async () => {
    for (const motif of [undefined, '', '   ', '  ', '​﻿', 'x'.repeat(4001)]) {
      const reponse = await POST(requete({ ...CORPS, motif }));
      expect(reponse.status).toBe(422);
      expect((await reponse.json()).reason).toBe('motif_requis');
    }
    expect(exclureDeLaRecherche).not.toHaveBeenCalled();
  });

  it('identifiant ou sens invalide : 400', async () => {
    expect((await POST(requete({ ...CORPS, id: 'WN-CL-0056-001' }))).status).toBe(400);
    expect((await POST(requete({ ...CORPS, sens: 'masquer' }))).status).toBe(400);
    expect((await POST(requete([CORPS]))).status).toBe(400);
    expect(exclureDeLaRecherche).not.toHaveBeenCalled();
  });

  it('un claim non VALIDE est refusé : 409', async () => {
    exclureDeLaRecherche.mockResolvedValue({ ok: false, raison: 'claim_non_valide' });
    const reponse = await POST(requete({ ...CORPS, sens: 'retablir' }));
    expect(reponse.status).toBe(409);
    expect((await reponse.json()).reason).toBe('claim_non_valide');
  });

  it('un claim inconnu : 404', async () => {
    exclureDeLaRecherche.mockResolvedValue({ ok: false, raison: 'claim_introuvable' });
    expect((await POST(requete(CORPS))).status).toBe(404);
  });

  it('une exception : 500 sans contenu journalisé', async () => {
    const erreur = vi.spyOn(console, 'error').mockImplementation(() => {});
    exclureDeLaRecherche.mockRejectedValue(new Error('panne'));
    expect((await POST(requete(CORPS))).status).toBe(500);
    expect(erreur).toHaveBeenCalledWith('[praticien/corpus/claims/exclusion-recherche POST]', 'panne');
    erreur.mockRestore();
  });
});
