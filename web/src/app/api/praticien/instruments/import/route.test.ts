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

  // GARDE ANTI-BANDE-PAR-DÉFAUT, troisième site (`D-088`). L'import est la
  // porte d'entrée d'une EVA : shape complète, item `number` borné, famille
  // déclarée. Rien ne doit lui poser de bande — ni la grille par défaut, ni
  // l'avertissement qui l'annonce.
  it('json EVA sans interprétation : aucune bande posée, aucun avertissement de grille', async () => {
    const res = await POST(
      postRequest({
        format: 'json',
        contenu: JSON.stringify({
          titre: 'EVA fatigue — cabinet',
          definition: {
            instructions: 'Placez le curseur là où vous vous situez aujourd’hui.',
            sections: [
              {
                id: 'S1',
                questions: [
                  {
                    id: 'EVA1',
                    texte: 'Où en êtes-vous de votre fatigue aujourd’hui ?',
                    type: 'number',
                    min: 0,
                    max: 10,
                    unit: '/10',
                  },
                ],
              },
            ],
          },
          scoring: { type: 'sum_no_interpretation' },
        }),
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ success: true, nbQuestions: 1, avertissements: [] });
    const data = prisma.cabinetInstrument.create.mock.calls[0][0].data;
    expect(data.statutRelecture).toBe('brouillon');
    expect(data.scoringJson.type).toBe('sum_no_interpretation');
    expect(data.scoringJson.maxTotal).toBe(10);
    expect(data.scoringJson.interpretation ?? []).toEqual([]);
    expect(JSON.stringify(data.scoringJson)).not.toContain('Grille à définir');
    expect(JSON.stringify(data.scoringJson)).not.toContain('warning');
    // Les ancres du curseur traversent l'import telles qu'elles ont été
    // déclarées — elles bornent le rendu patient ET la garde serveur.
    expect(data.definitionJson.sections[0].questions[0]).toMatchObject({
      type: 'number',
      min: 0,
      max: 10,
      unit: '/10',
    });
  });

  // Le chemin gardé de `scoringParDefaut(definition, typeDemande)` est
  // INATTEIGNABLE (aucun appelant ne passe le second argument) : ce qui couvre
  // réellement « items number, grille absente », c'est ce refus dédié. Sans
  // lui, l'import répondait « seul “likert” est admis » et « entre 2 et 8
  // options » — deux reproches exacts, aucun ne disant quoi faire.
  it('json avec des items number mais SANS scoring : 400 orientant vers la famille à déclarer', async () => {
    const res = await POST(
      postRequest({
        format: 'json',
        contenu: JSON.stringify({
          titre: 'EVA fatigue — cabinet',
          definition: {
            sections: [
              {
                id: 'S1',
                questions: [
                  {
                    id: 'EVA1',
                    texte: 'Où en êtes-vous de votre fatigue aujourd’hui ?',
                    type: 'number',
                    min: 0,
                    max: 10,
                  },
                ],
              },
            ],
          },
        }),
      }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    // Le geste attendu est NOMMÉ, avec le littéral à écrire.
    expect(json.error).toContain('sum_no_interpretation');
    expect(json.error).toContain('Saisie chiffrée sans grille déclarée');
    // Et les messages de la famille par défaut ne sont plus servis ici : ils
    // envoyaient le praticien transformer son curseur en échelle à options.
    expect(json.erreurs.join(' ')).not.toContain('seul « likert » est admis');
    expect(json.erreurs.join(' ')).not.toContain('entre 2 et 8 options');
    expect(prisma.cabinetInstrument.create).not.toHaveBeenCalled();
  });

  // Le refus dédié ne mange pas le cas voisin : une famille interprétée
  // DÉCLARÉE avec des items number est une contradiction du praticien, et
  // garde le message qui la nomme.
  it('json avec des items number et un scoring « sum » déclaré : message d’origine conservé', async () => {
    const res = await POST(
      postRequest({
        format: 'json',
        contenu: JSON.stringify({
          titre: 'EVA fatigue — cabinet',
          definition: {
            sections: [
              {
                id: 'S1',
                questions: [
                  {
                    id: 'EVA1',
                    texte: 'Où en êtes-vous de votre fatigue aujourd’hui ?',
                    type: 'number',
                    min: 0,
                    max: 10,
                  },
                ],
              },
            ],
          },
          scoring: {
            type: 'sum',
            interpretation: [{ min: 0, max: 10, label: 'Repère', color: 'warning' }],
          },
        }),
      }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.erreurs.join(' ')).toContain('seul « likert » est admis');
    expect(json.error).not.toContain('Saisie chiffrée sans grille déclarée');
    expect(prisma.cabinetInstrument.create).not.toHaveBeenCalled();
  });

  it('json EVA avec une bande : 400, rien n’est créé', async () => {
    const res = await POST(
      postRequest({
        format: 'json',
        contenu: JSON.stringify({
          titre: 'EVA fatigue — cabinet',
          definition: {
            sections: [
              {
                id: 'S1',
                questions: [
                  {
                    id: 'EVA1',
                    texte: 'Où en êtes-vous de votre fatigue aujourd’hui ?',
                    type: 'number',
                    min: 0,
                    max: 10,
                  },
                ],
              },
            ],
          },
          scoring: {
            type: 'sum_no_interpretation',
            interpretation: [{ min: 0, max: 10, label: 'Fatigue élevée', color: 'danger' }],
          },
        }),
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).erreurs.join(' ')).toContain('aucune bande n’est admise');
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
