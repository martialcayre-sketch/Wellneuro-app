import { describe, expect, it, vi } from 'vitest';

// Test d'autorisation (exig. 7 G-TRUST-04, lot A5) — PRATICIEN SEUL.
const { getServerSession } = vi.hoisted(() => ({ getServerSession: vi.fn() }));
vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/rag/claims/notebooks', () => ({}));
vi.mock('@/lib/rag/claims/revue', () => ({}));

import { GET } from './route';

describe('GET /api/praticien/corpus/claims/sources — autorisation', () => {
  it('sans session : 401', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });
});
