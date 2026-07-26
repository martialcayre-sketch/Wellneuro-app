import { describe, expect, it, vi } from 'vitest';

// Test d'autorisation (exig. 7 G-TRUST-04, lot A5) — PRATICIEN SEUL.
const { getServerSession } = vi.hoisted(() => ({ getServerSession: vi.fn() }));
vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/rag/claims/recherche', () => ({}));

import { POST } from './route';

describe('POST /api/praticien/corpus/claims/recherche — autorisation', () => {
  it('sans session : 401', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await POST(
      new Request('http://localhost/api/praticien/corpus/claims/recherche', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      }),
    );
    expect(res.status).toBe(401);
  });
});
