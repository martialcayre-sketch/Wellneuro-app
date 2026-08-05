import { describe, expect, it, vi } from 'vitest';

// Test d'autorisation (exig. 7 G-TRUST-04, lot A5) — PRATICIEN SEUL.
const { getServerSession } = vi.hoisted(() => ({ getServerSession: vi.fn() }));
vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma: {} }));

import { GET } from './route';

describe('GET /api/praticien/bibliotheque/apercu — autorisation', () => {
  it('sans session : 401', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET(new Request('http://localhost/api/praticien/bibliotheque/apercu?id=PSS10'));
    expect(res.status).toBe(401);
  });
});

// LE VERBATIM D'UN INSTRUMENT FERMÉ — trouvé en revue le 2026-07-31.
//
// La route rendait `def.sections` — le texte intégral des items et des options —
// pour n'importe quel identifiant porteur d'une définition, suspendu ou non. Le
// rayon n'affiche jamais une entrée inactive, mais un appel direct suffisait :
// classe « invisible mais servi ».
//
// Ces trois cas gardent une CONJONCTION, et c'est elle qui porte le sens :
// suspendu ET hors consultation. Un test de clinicien est `actif: false` à vie —
// c'est ce qui ferme sa route d'assignation — et il doit rester servi.
describe('GET …/apercu — un instrument fermé ne livre pas son verbatim', () => {
  const apercu = async (id: string) => {
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    return GET(new Request(`http://localhost/api/praticien/bibliotheque/apercu?id=${id}`));
  };

  it('refuse un instrument suspendu et hors consultation', async () => {
    // `Q_PED_03` (Conners parent) : fermé, jamais administré en consultation.
    const res = await apercu('Q_PED_03');
    expect(res.status).toBe(404);
    const d = await res.json();
    expect(d.apercu).toBeNull();
    expect(d.reason).toBe('not_found');
  });

  it('sert un instrument de consultation, bien qu’inactif au catalogue', async () => {
    // `Q_GEO_04` (MMSE) : `actif: false` — sa route d'assignation est fermée —
    // et pourtant servi ici, sans quoi le praticien ne peut pas l'administrer.
    // Sans ce cas, un refus fondé sur le seul `IDS_SUSPENDUS` passerait au vert
    // en ayant cassé l'usage clinique.
    const res = await apercu('Q_GEO_04');
    expect(res.status).toBe(200);
    const d = await res.json();
    expect(d.apercu?.id).toBe('Q_GEO_04');
    expect(Array.isArray(d.apercu?.sections)).toBe(true);
    expect(d.apercu?.sections.length).toBeGreaterThan(0);
  });

  it('sert un instrument ordinaire (contrôle négatif)', async () => {
    // Sans lui, un refus inconditionnel ferait passer le premier cas.
    const res = await apercu('Q_SOM_01');
    expect(res.status).toBe(200);
    expect((await res.json()).apercu?.sections.length).toBeGreaterThan(0);
  });
});
