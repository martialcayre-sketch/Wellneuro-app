import { describe, expect, it, vi } from 'vitest';

// Test d'autorisation (exig. 7 G-TRUST-04, lot A5) — PRATICIEN SEUL, données
// patient scopées par `filtrePatientsDuPraticien`. GET (liste) et PATCH
// (mutation d'un signalement) refusent tous deux sans session.
const { getServerSession } = vi.hoisted(() => ({ getServerSession: vi.fn() }));
vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma: {} }));

import { GET, PATCH } from './route';

describe('/api/praticien/trust — autorisation', () => {
  it('GET sans session : 401', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('PATCH sans session : 401', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await PATCH(
      new Request('http://localhost/api/praticien/trust', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      }),
    );
    expect(res.status).toBe(401);
  });
});
