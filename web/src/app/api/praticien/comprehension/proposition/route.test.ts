import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma, messagesCreate } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  messagesCreate: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    syntheseIA: { findMany: vi.fn() },
    desaccordComprehension: { findMany: vi.fn() },
    assignation: { count: vi.fn() },
    // `update`, `delete` et `deleteMany` sont moqués EXPRÈS bien que la route ne
    // les appelle jamais : sans eux, l'assertion « append-only » lèverait au
    // lieu de compter zéro.
    propositionComprehensionIA: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    journalAccesDossier: { create: vi.fn() },
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/anthropic', () => ({
  anthropic: { messages: { create: messagesCreate } },
  CLAUDE_MODEL: 'claude-modele-de-banc',
}));
vi.mock('@/lib/patient/featureFlag', () => ({ isDossierDeuxVoixEnabled: () => true }));
vi.mock('@/lib/praticien/appartenance', () => ({
  emailPraticien: () => 'praticien@wellneuro.fr',
  verifierAppartenancePatient: vi.fn(async () => 'ok'),
}));

import { GET, POST } from './route';

const URL_BASE = 'http://localhost/api/praticien/comprehension/proposition';

/**
 * LE PIÈGE EST DANS LA FIXTURE, et c'est délibéré : chaque axe porte ses quatre
 * champs, dont la bande et les scores. Si l'adaptateur rendait l'objet entier,
 * ils voyageraient jusqu'ici.
 */
const axe = (nom: string) => ({
  axe: nom,
  niveau_priorite: 'eleve',
  arguments: ['Score PSQI 14'],
  points_a_confirmer: ['Heure du coucher'],
});

const SYNTHESES = [
  {
    idSynthese: 'SYN_1',
    dateValidation: new Date('2026-07-07T10:00:00Z'),
    syntheseJson: { narratif_patient: 'Premier texte validé.', axes_prioritaires: [axe('Sommeil')] },
  },
  {
    idSynthese: 'SYN_2',
    dateValidation: new Date('2026-08-29T10:00:00Z'),
    syntheseJson: { narratif_patient: 'Second texte validé.', axes_prioritaires: [axe('Énergie')] },
  },
];

function reponseModele(texte: string) {
  return { content: [{ type: 'text', text: texte }] };
}

beforeEach(() => {
  vi.clearAllMocks();
  getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
  prisma.patient.findUnique.mockResolvedValue({ actif: true, suiviClotureLe: null });
  prisma.syntheseIA.findMany.mockResolvedValue(SYNTHESES);
  prisma.desaccordComprehension.findMany.mockResolvedValue([]);
  prisma.assignation.count.mockResolvedValue(18);
  prisma.propositionComprehensionIA.findFirst.mockResolvedValue(null);
  messagesCreate.mockResolvedValue(reponseModele('Vous décrivez un sommeil qui ne répare pas.'));
});

const get = (q = 'idPatient=PAT_TEST') => GET(new Request(`${URL_BASE}?${q}`));
const post = (body: unknown = { idPatient: 'PAT_TEST' }) =>
  POST(
    new Request(URL_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );

describe('GET — lit sans jamais appeler le modèle', () => {
  it('n’APPELLE PAS l’IA, même quand tout est là : ouvrir la phase 3 ne dépense pas un appel', async () => {
    await get();
    expect(messagesCreate).not.toHaveBeenCalled();
  });

  it('dit « aucune » quand la barre est franchie mais que rien n’a été tiré', async () => {
    const corps = await (await get()).json();
    expect(corps.etat).toBe('aucune');
  });

  it('sert le tirage figé, AVEC son identifiant — sans lui la provenance ne s’écrit pas', async () => {
    prisma.propositionComprehensionIA.findFirst.mockResolvedValue({
      id: 'TIR_1',
      texte: 'Un résumé déjà tiré.',
      rang: 2,
      creeLe: new Date('2026-09-11T12:00:00Z'),
    });
    const corps = await (await get()).json();
    expect(corps.etat).toBe('proposee');
    expect(corps.proposition.id).toBe('TIR_1');
    expect(corps.proposition.rang).toBe(2);
    expect(corps.proposition.versionConsigne).toBe('comprehension-v1');
  });

  it('ne laisse RIEN du blob franchir la frontière', async () => {
    prisma.propositionComprehensionIA.findFirst.mockResolvedValue({
      id: 'TIR_1', texte: 'Un résumé.', rang: 1, creeLe: new Date(),
    });
    const brut = JSON.stringify(await (await get()).json());
    expect(brut).not.toContain('niveau_priorite');
    expect(brut).not.toContain('Score PSQI');
    expect(brut).not.toContain('points_a_confirmer');
    expect(brut).not.toContain('axes_prioritaires');
  });

  it('NOMME ce qui manque : une seule synthèse validée', async () => {
    prisma.syntheseIA.findMany.mockResolvedValue([SYNTHESES[0]]);
    const corps = await (await get()).json();
    expect(corps.etat).toBe('sources_manquantes');
    expect(corps.manque).toEqual(['deux_syntheses_validees']);
  });

  it('NOMME ce qui manque : aucun second rideau', async () => {
    prisma.assignation.count.mockResolvedValue(0);
    const corps = await (await get()).json();
    expect(corps.etat).toBe('sources_manquantes');
    expect(corps.manque).toEqual(['second_rideau']);
  });

  it('les deux manques se cumulent sans se confondre', async () => {
    prisma.syntheseIA.findMany.mockResolvedValue([SYNTHESES[0]]);
    prisma.assignation.count.mockResolvedValue(0);
    const corps = await (await get()).json();
    expect(corps.manque.sort()).toEqual(['deux_syntheses_validees', 'second_rideau']);
  });

  it('le second rideau se compte DEPUIS la première synthèse validée (D-158)', async () => {
    await get();
    expect(prisma.assignation.count).toHaveBeenCalledWith({
      where: { idPatient: 'PAT_TEST', dateAssignation: { gt: new Date('2026-07-07T10:00:00Z') } },
    });
  });

  it('sous la barre, AUCUNE lecture de matière n’a lieu — ni appel, ni tirage lu', async () => {
    prisma.syntheseIA.findMany.mockResolvedValue([]);
    prisma.assignation.count.mockResolvedValue(0);
    await get();
    expect(messagesCreate).not.toHaveBeenCalled();
    expect(prisma.propositionComprehensionIA.findFirst).not.toHaveBeenCalled();
  });

  it('le tirage servi est celui de la matière COURANTE et de la consigne courante', async () => {
    await get();
    const where = prisma.propositionComprehensionIA.findFirst.mock.calls[0][0].where;
    expect(where.idPatient).toBe('PAT_TEST');
    expect(where.sourcesSyntheses).toEqual({ equals: ['SYN_1', 'SYN_2'] });
    expect(where.sourcesDesaccords).toEqual({ equals: [] });
    expect(where.versionConsigne).toBe('comprehension-v1');
  });

  it('refuse un identifiant patient malformé', async () => {
    const reponse = await get('idPatient=PAT%20TEST');
    expect(reponse.status).toBe(400);
  });

  it('refuse une session absente', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await get()).status).toBe(401);
  });
});

describe('POST — produit un tirage', () => {
  it('écrit une ligne au rang 1 avec sa matière, son modèle et sa consigne', async () => {
    prisma.propositionComprehensionIA.create.mockResolvedValue({
      id: 'TIR_1', texte: 'Vous décrivez un sommeil qui ne répare pas.', rang: 1, creeLe: new Date(),
    });
    const reponse = await post();
    expect(reponse.status).toBe(201);

    const data = prisma.propositionComprehensionIA.create.mock.calls[0][0].data;
    expect(data.sourcesSyntheses).toEqual(['SYN_1', 'SYN_2']);
    expect(data.sourcesDesaccords).toEqual([]);
    expect(data.rang).toBe(1);
    expect(data.versionConsigne).toBe('comprehension-v1');
    expect(data.modele).toBe('claude-modele-de-banc');
  });

  it('« une autre » écrit au rang SUIVANT — rien n’est écrasé', async () => {
    prisma.propositionComprehensionIA.findFirst.mockResolvedValue({ rang: 3 });
    prisma.propositionComprehensionIA.create.mockResolvedValue({
      id: 'TIR_4', texte: 'Un autre résumé.', rang: 4, creeLe: new Date(),
    });
    await post();
    expect(prisma.propositionComprehensionIA.create.mock.calls[0][0].data.rang).toBe(4);
    expect(prisma.propositionComprehensionIA.update).not.toHaveBeenCalled();
    expect(prisma.propositionComprehensionIA.updateMany).not.toHaveBeenCalled();
    expect(prisma.propositionComprehensionIA.delete).not.toHaveBeenCalled();
    expect(prisma.propositionComprehensionIA.deleteMany).not.toHaveBeenCalled();
  });

  it('les désaccords entrent dans la matière du tirage', async () => {
    prisma.desaccordComprehension.findMany.mockResolvedValue([
      { id: 'DES_1', texte: 'Ce n’est pas la fatigue.' },
    ]);
    prisma.propositionComprehensionIA.create.mockResolvedValue({
      id: 'TIR_1', texte: 'Un résumé.', rang: 1, creeLe: new Date(),
    });
    await post();
    expect(prisma.propositionComprehensionIA.create.mock.calls[0][0].data.sourcesDesaccords)
      .toEqual(['DES_1']);
    expect(messagesCreate.mock.calls[0][0].messages[0].content).toContain('Ce n’est pas la fatigue.');
  });

  it('SOUS LA BARRE, aucun appel n’est fait — 409, et le manque est nommé', async () => {
    prisma.syntheseIA.findMany.mockResolvedValue([SYNTHESES[0]]);
    const reponse = await post();
    expect(reponse.status).toBe(409);
    expect((await reponse.json()).manque).toEqual(['deux_syntheses_validees']);
    expect(messagesCreate).not.toHaveBeenCalled();
    expect(prisma.propositionComprehensionIA.create).not.toHaveBeenCalled();
  });

  it('un dossier clos refuse, avant tout appel', async () => {
    prisma.patient.findUnique.mockResolvedValue({ actif: false, suiviClotureLe: new Date() });
    const reponse = await post();
    expect(reponse.status).toBe(409);
    expect(messagesCreate).not.toHaveBeenCalled();
  });

  it('un échec d’appel ne fait écrire AUCUNE ligne', async () => {
    messagesCreate.mockRejectedValue(new Error('fournisseur indisponible'));
    const reponse = await post();
    expect(reponse.status).toBe(502);
    expect((await reponse.json()).reason).toBe('proposition_indisponible');
    expect(prisma.propositionComprehensionIA.create).not.toHaveBeenCalled();
  });

  it('chaque motif d’échec a SA phrase — « trop long » n’est pas « indisponible »', async () => {
    messagesCreate.mockResolvedValue(reponseModele('a'.repeat(4001)));
    const corps = await (await post()).json();
    expect(corps.reason).toBe('proposition_trop_longue');
    expect(corps.error).toContain('refusé plutôt que coupé');
  });

  it('un texte vide est nommé comme tel', async () => {
    messagesCreate.mockResolvedValue(reponseModele('   '));
    expect((await (await post()).json()).reason).toBe('proposition_vide');
  });

  it('refuse un corps illisible', async () => {
    const reponse = await POST(
      new Request(URL_BASE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' }),
    );
    expect(reponse.status).toBe(400);
  });

  it('refuse un corps annoncé trop volumineux', async () => {
    const reponse = await POST(
      new Request(URL_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'content-length': String(9 * 1024) },
        body: JSON.stringify({ idPatient: 'PAT_TEST' }),
      }),
    );
    expect(reponse.status).toBe(413);
  });
});
