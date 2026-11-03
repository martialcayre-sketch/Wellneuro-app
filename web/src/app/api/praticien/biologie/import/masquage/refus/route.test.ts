import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    journalAccesDossier: { create: vi.fn() },
  },
}));
vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { POST } from './route';

function requete(corps: string, idPatient = 'pat_sophie') {
  return new Request(`http://localhost/api/praticien/biologie/import/masquage/refus?idPatient=${idPatient}`, {
    method: 'POST',
    body: corps,
    headers: { 'content-type': 'application/json', 'content-length': String(Buffer.byteLength(corps)) },
  });
}

let info: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  process.env.WN_CB_ENABLED = 'true';
  process.env.WN_CB_RESULTS_ENABLED = 'true';
  process.env.WN_BIO_INGEST_ENABLED = 'true';
  getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
  prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'praticien@wellneuro.fr', actif: true, suiviClotureLe: null });
  prisma.journalAccesDossier.create.mockResolvedValue({});
  info = vi.spyOn(console, 'info').mockImplementation(() => {});
});

afterEach(() => {
  vi.clearAllMocks();
  info.mockRestore();
});

describe('POST /api/praticien/biologie/import/masquage/refus (compte des refus au-delà de 20 pages)', () => {
  it('écrit le seul nombre de pages au journal, sans identifiant, et répond 204', async () => {
    const r = await POST(requete(JSON.stringify({ nombrePages: 24 })));
    expect(r.status).toBe(204);
    expect(info).toHaveBeenCalledTimes(1);
    const ligne = String(info.mock.calls[0][0]);
    expect(ligne).toBe('[bio-ingest masquage] refus trop_de_pages : 24 pages');
    expect(ligne).not.toContain('pat_sophie');
  });

  it('un nombre de pages admis par le masquage, non entier ou hors borne : 400, rien au journal', async () => {
    for (const nombrePages of [20, 0, -3, 24.5, '24', null, 10_001]) {
      const r = await POST(requete(JSON.stringify({ nombrePages })));
      expect(r.status).toBe(400);
    }
    for (const corps of ['', 'pas du json', 'null', '[]']) {
      expect((await POST(requete(corps))).status).toBe(400);
    }
    expect(info).not.toHaveBeenCalled();
  });

  it('un corps annoncé trop long : 413 avant toute lecture', async () => {
    const r = await POST(requete(JSON.stringify({ nombrePages: 24, bourrage: 'x'.repeat(2000) })));
    expect(r.status).toBe(413);
    expect(info).not.toHaveBeenCalled();
  });

  it('sans longueur annoncée (envoi en morceaux) : 411, le corps n’est pas lu', async () => {
    let tires = 0;
    const flux = new ReadableStream<Uint8Array>({
      pull(c) {
        tires += 1;
        c.enqueue(new TextEncoder().encode('{"nombrePages":24}'));
        c.close();
      },
    });
    const r = await POST(
      new Request('http://localhost/api/praticien/biologie/import/masquage/refus?idPatient=pat_sophie', {
        method: 'POST', body: flux, duplex: 'half',
      } as RequestInit),
    );
    expect(r.status).toBe(411);
    expect(tires).toBeLessThanOrEqual(1); // au plus l'amorce du flux, jamais lu par la route
    expect(info).not.toHaveBeenCalled();
  });

  it('une longueur annoncée qui ment : la lecture s’arrête au-delà de 1 Kio, 413', async () => {
    let tires = 0;
    const flux = new ReadableStream<Uint8Array>({
      pull(c) {
        tires += 1;
        if (tires > 100) return c.close();
        c.enqueue(new Uint8Array(512).fill(0x20));
      },
    });
    const r = await POST(
      new Request('http://localhost/api/praticien/biologie/import/masquage/refus?idPatient=pat_sophie', {
        method: 'POST', body: flux, duplex: 'half', headers: { 'content-length': '20' },
      } as RequestInit),
    );
    expect(r.status).toBe(413);
    expect(tires).toBeLessThan(10);
    expect(info).not.toHaveBeenCalled();
  });

  it('sans session : refusé, rien au journal', async () => {
    getServerSession.mockResolvedValue(null);
    const r = await POST(requete(JSON.stringify({ nombrePages: 24 })));
    expect(r.status).toBe(401);
    expect(info).not.toHaveBeenCalled();
  });

  it('dossier d’un autre praticien : refusé, rien au journal', async () => {
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'autre@wellneuro.fr', actif: true, suiviClotureLe: null });
    const r = await POST(requete(JSON.stringify({ nombrePages: 24 })));
    expect(r.status).toBeGreaterThanOrEqual(403);
    expect(info).not.toHaveBeenCalled();
  });

  it('import éteint : 503, rien au journal', async () => {
    delete process.env.WN_BIO_INGEST_ENABLED;
    const r = await POST(requete(JSON.stringify({ nombrePages: 24 })));
    expect(r.status).toBe(503);
    expect(info).not.toHaveBeenCalled();
  });
});
