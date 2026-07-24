import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    cabinetInstrument: { create: vi.fn(), findFirst: vi.fn() },
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('next-auth', () => ({
  getServerSession: vi.fn().mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } }),
}));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/ids', () => ({ createPublicId: (prefix: string) => `${prefix}_TEST_12345678` }));

import { POST } from './route';

function postRequest(body: unknown) {
  return new Request('http://localhost/api/praticien/instruments/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('instruments/import POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.cabinetInstrument.create.mockResolvedValue({});
    prisma.cabinetInstrument.findFirst.mockResolvedValue(null); // pas de doublon
  });

  it('json avec échelle nommée : options appliquées, scoring fourni conservé', async () => {
    const res = await POST(
      postRequest({
        format: 'json',
        contenu: JSON.stringify({
          titre: 'Dépistage oui/non',
          questions: [{ texte: 'Ronflez-vous la nuit ?' }, { texte: 'Vous réveillez-vous fatigué(e) ?' }],
          echelle: 'oui_non',
          scoring: {
            type: 'sum',
            interpretation: [
              { min: 0, max: 1, label: 'Peu évocateur', color: 'success' },
              { min: 2, max: 2, label: 'Évocateur', color: 'warning' },
            ],
          },
        }),
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({
      success: true,
      idInstrument: 'CAB_TEST_12345678',
      nbQuestions: 2,
      avertissements: [],
    });
    const data = prisma.cabinetInstrument.create.mock.calls[0][0].data;
    expect(data.statutRelecture).toBe('brouillon');
    // Échelle oui_non : 2 options 0/1, ids générés Q1..Qn.
    const questions = data.definitionJson.sections[0].questions;
    expect(questions.map((q: { id: string }) => q.id)).toEqual(['Q1', 'Q2']);
    expect(questions[0].options).toEqual([
      { v: 0, l: 'Non' },
      { v: 1, l: 'Oui' },
    ]);
  });

  it('json sans scoring : bande unique warning « Grille à définir » + avertissement', async () => {
    const res = await POST(
      postRequest({
        format: 'json',
        contenu: JSON.stringify({
          titre: 'Fatigue cabinet',
          questions: [{ texte: 'Je me sens fatigué(e) dans la journée.' }],
          echelle: 'intensite_0_3',
        }),
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.avertissements.join(' ')).toContain('Grille de score absente');
    const scoring = prisma.cabinetInstrument.create.mock.calls[0][0].data.scoringJson;
    expect(scoring.type).toBe('sum');
    expect(scoring.interpretation).toEqual([
      { min: 0, max: 3, label: 'Grille à définir — relecture requise', color: 'warning' },
    ]);
  });

  it('csv : en-tête « question », titre et échelle du corps de requête', async () => {
    const res = await POST(
      postRequest({
        format: 'csv',
        titre: 'Charge mentale cabinet',
        echelle: 'intensite_0_3',
        contenu: 'question\nJe me sens débordé(e).\nJe rumine le soir.\nJe repousse des tâches.',
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ success: true, nbQuestions: 3 });
    // Grille absente en CSV : bande unique warning, toujours signalée.
    expect(json.avertissements.join(' ')).toContain('Grille de score absente');
    const data = prisma.cabinetInstrument.create.mock.calls[0][0].data;
    expect(data.titre).toBe('Charge mentale cabinet');
    expect(data.definitionJson.sections[0].questions).toHaveLength(3);
    expect(data.definitionJson.sections[0].questions[1].options).toHaveLength(4);
    expect(data.scoringJson.interpretation[0].color).toBe('warning');
  });

  it('csv sans échelle : fréquence 0–4 par défaut, avertissement explicite', async () => {
    const res = await POST(
      postRequest({
        format: 'csv',
        titre: 'Sommeil cabinet',
        contenu: 'texte\nJe dors bien.',
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.avertissements.join(' ')).toContain('Échelle non précisée');
    const questions = prisma.cabinetInstrument.create.mock.calls[0][0].data.definitionJson.sections[0].questions;
    expect(questions[0].options).toHaveLength(5);
  });

  it('csv sans en-tête : 400, rien n’est créé', async () => {
    const res = await POST(
      postRequest({
        format: 'csv',
        titre: 'Sommeil cabinet',
        contenu: 'Je dors bien.\nJe me réveille reposé(e).',
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('en-tête');
    expect(prisma.cabinetInstrument.create).not.toHaveBeenCalled();
  });

  it('json invalide : 400 sans création', async () => {
    const res = await POST(postRequest({ format: 'json', contenu: '[pas un objet]' }));
    expect(res.status).toBe(400);
    expect(prisma.cabinetInstrument.create).not.toHaveBeenCalled();
  });

  it('titre déjà porté par un instrument actif : 409 sans création', async () => {
    prisma.cabinetInstrument.findFirst.mockResolvedValue({ idInstrument: 'CAB_EXISTANT' });
    const res = await POST(
      postRequest({
        format: 'csv',
        titre: 'Sommeil cabinet',
        contenu: 'question\nJe dors bien.',
      }),
    );
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('doublon_titre');
    expect(prisma.cabinetInstrument.create).not.toHaveBeenCalled();
  });
});
