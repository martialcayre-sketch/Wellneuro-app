import { describe, expect, it, vi } from 'vitest';

// Test d'autorisation (exig. 7 G-TRUST-04, lot A5) — PRATICIEN SEUL. La route
// porte quatre méthodes (GET/POST/PATCH/DELETE) ; toutes refusent sans session.
const { getServerSession } = vi.hoisted(() => ({ getServerSession: vi.fn() }));
vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma: {} }));

import { GET, POST, PATCH, DELETE } from './route';

function req(method: string): Request {
  return new Request('http://localhost/api/praticien/packs', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
}

describe('/api/praticien/packs — autorisation', () => {
  it('GET sans session : 401', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('POST/PATCH/DELETE sans session : 401', async () => {
    getServerSession.mockResolvedValue(null);
    for (const [m, handler] of [['POST', POST], ['PATCH', PATCH], ['DELETE', DELETE]] as const) {
      const res = await handler(req(m));
      expect(res.status).toBe(401);
    }
  });
});
