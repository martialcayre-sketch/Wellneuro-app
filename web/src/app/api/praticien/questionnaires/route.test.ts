import { describe, expect, it, vi } from 'vitest';

// Test d'autorisation (exig. 7 G-TRUST-04, lot A5) — PRATICIEN SEUL.
const { getServerSession } = vi.hoisted(() => ({ getServerSession: vi.fn() }));
vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

// Espion posé sur l'implémentation RÉELLE : les autres cas continuent de lire
// le vrai catalogue. Il ne sert qu'à provoquer le chemin `catch` de la route,
// qu'aucune donnée d'entrée ne peut atteindre.
const { getQuestionnaireFunctionalMetadata } = vi.hoisted(() => ({
  getQuestionnaireFunctionalMetadata: vi.fn(),
}));
vi.mock('@/lib/questionnaires-functional', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/questionnaires-functional')>();
  getQuestionnaireFunctionalMetadata.mockImplementation(actual.getQuestionnaireFunctionalMetadata);
  return { ...actual, getQuestionnaireFunctionalMetadata };
});

import { GET } from './route';
import { QUESTIONNAIRES_CATALOG } from '@/lib/questionnaires-catalog';

describe('GET /api/praticien/questionnaires — autorisation', () => {
  it('sans session : 401', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });
});

// `suspendus` est lu par `PacksPanel` avec `json.suspendus ?? []` : un corps
// d'échec qui l'omettrait ne casserait rien tout de suite, mais le contrat de
// `QuestionnairesApiResponse` promet un tableau. Le jour où un appelant fait
// `.map` sans repli, c'est ici que ça se voit — pas en production.
describe('GET /api/praticien/questionnaires — forme des réponses d’échec', () => {
  it('401 : le corps porte `suspendus: []`, jamais `undefined`', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.suspendus).toEqual([]);
    expect(json.questionnaires).toEqual([]);
    expect(json.reason).toBe('unauthenticated');
  });

  it('exception : le corps porte `suspendus: []`, jamais `undefined`', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    getQuestionnaireFunctionalMetadata.mockImplementationOnce(() => {
      throw new Error('panne simulée du registre fonctionnel');
    });

    const res = await GET();
    const json = await res.json();
    expect(json.reason).toBe('exception');
    expect(json.suspendus).toEqual([]);
    expect(json.questionnaires).toEqual([]);
  });
});

describe('GET /api/praticien/questionnaires — instruments suspendus', () => {
  it('un suspendu est dans `suspendus` et ABSENT de `questionnaires`', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });

    // Aucun identifiant en dur : `actif` bouge avec les arbitrages cliniques et
    // avec un drapeau d'environnement.
    const suspenduAttendu = QUESTIONNAIRES_CATALOG.find(q => !q.actif);
    expect(suspenduAttendu).toBeDefined();

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();

    // Les DEUX assertions. La première seule laisserait passer un `suspendus`
    // rempli par une route qui aurait cessé de filtrer `actif` — les suspendus
    // fuiteraient alors dans toutes les listes d'instruments assignables.
    expect(json.suspendus.map((s: { id: string }) => s.id)).toContain(suspenduAttendu!.id);
    expect(json.questionnaires.map((q: { id: string }) => q.id)).not.toContain(suspenduAttendu!.id);
  });
});
