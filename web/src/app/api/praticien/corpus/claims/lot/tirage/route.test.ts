import { describe, expect, it, vi } from 'vitest';

// Test d'autorisation (exig. 7 G-TRUST-04, lot A5) — PRATICIEN SEUL. GET (tirage
// ouvert) et POST (nouveau tirage) refusent tous deux sans session.
const { getServerSession } = vi.hoisted(() => ({ getServerSession: vi.fn() }));
vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/rag/claims/recherche', () => ({}));
vi.mock('@/lib/rag/claims/revue', () => ({}));

import { GET, POST } from './route';

describe('/api/praticien/corpus/claims/lot/tirage — autorisation', () => {
  it('GET sans session : 401', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET(new Request('http://localhost/api/praticien/corpus/claims/lot/tirage?sourceId=WN-SRC-0001'));
    expect(res.status).toBe(401);
  });

  it('POST sans session : 401', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await POST(
      new Request('http://localhost/api/praticien/corpus/claims/lot/tirage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      }),
    );
    expect(res.status).toBe(401);
  });
});
