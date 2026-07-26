import { describe, expect, it, vi } from 'vitest';

// Test d'autorisation (exig. 7 G-TRUST-04, lot A5) — PRATICIEN SEUL, données
// patient scopées par `filtrePatientsDuPraticien`. La garde 401 est au-dessus de
// tout accès base.
const { getServerSession } = vi.hoisted(() => ({ getServerSession: vi.fn() }));
vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma: {} }));

import { GET } from './route';

describe('GET /api/praticien/metrics — autorisation', () => {
  it('sans session : 401', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET(new Request('http://localhost/api/praticien/metrics'));
    expect(res.status).toBe(401);
  });
});
