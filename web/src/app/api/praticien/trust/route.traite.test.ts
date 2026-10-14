import { beforeEach, describe, expect, it, vi } from 'vitest';

// D-295 §3 — une demande de droit ne passe à « Traité » qu'avec une réponse
// écrite : celle de la requête, ou celle déjà enregistrée. Les autres statuts
// et les autres signalements ne sont pas concernés.
const { getServerSession, findFirst, updateMany } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  findFirst: vi.fn(),
  updateMany: vi.fn(),
}));
vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({
  prisma: { trustRightsRequest: { findFirst, updateMany } },
}));

import { PATCH } from './route';

const patch = (corps: Record<string, unknown>) =>
  PATCH(
    new Request('http://localhost/api/praticien/trust', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'demande_droit', id: 'd1', ...corps }),
    }),
  );

describe('PATCH /api/praticien/trust — « Traité » exige une réponse (D-295 §3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    updateMany.mockResolvedValue({ count: 1 });
  });

  it('refuse « Traité » sans réponse, ni dans la requête ni en base', async () => {
    findFirst.mockResolvedValue({ reponse: null });
    const res = await patch({ statutTraitement: 'traite' });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('réponse écrite est requise');
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('refuse « Traité » quand la réponse envoyée ne contient que des espaces', async () => {
    findFirst.mockResolvedValue({ reponse: '   ' });
    const res = await patch({ statutTraitement: 'traite', reponse: '  \n ' });
    expect(res.status).toBe(400);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('accepte « Traité » avec une réponse dans la requête, enregistrée nettoyée', async () => {
    const res = await patch({ statutTraitement: 'traite', reponse: '  Export envoyé le 14 octobre.  ' });
    expect(res.status).toBe(200);
    expect(findFirst).not.toHaveBeenCalled();
    expect(updateMany.mock.calls[0][0].data).toMatchObject({
      statutTraitement: 'traite',
      reponse: 'Export envoyé le 14 octobre.',
    });
  });

  it('accepte « Traité » quand la réponse a été enregistrée auparavant', async () => {
    findFirst.mockResolvedValue({ reponse: 'Réponse envoyée.' });
    const res = await patch({ statutTraitement: 'traite' });
    expect(res.status).toBe(200);
    expect(updateMany.mock.calls[0][0].data.reponse).toBeUndefined();
  });

  it('répond 404 quand la demande n’appartient pas au praticien', async () => {
    findFirst.mockResolvedValue(null);
    const res = await patch({ statutTraitement: 'traite' });
    expect(res.status).toBe(404);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('laisse passer « En cours » sans réponse', async () => {
    const res = await patch({ statutTraitement: 'en_cours' });
    expect(res.status).toBe(200);
    expect(findFirst).not.toHaveBeenCalled();
  });
});
