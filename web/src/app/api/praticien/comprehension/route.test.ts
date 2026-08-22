import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    syntheseComprehension: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      // `update` et `delete` sont moqués EXPRÈS, alors que la route ne les
      // appelle jamais : sans eux, l'assertion « append-only » ne pourrait pas
      // être écrite — un mock absent lèverait au lieu de compter zéro.
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    // Le désaccord est un geste du PATIENT : les écritures sont moquées pour
    // prouver que cette route ne les emprunte jamais.
    desaccordComprehension: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    journalAccesDossier: { create: vi.fn(), deleteMany: vi.fn() },
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { GET, POST } from './route';
import { LONGUEUR_MAX_SYNTHESE } from '@/lib/praticien/syntheseComprehension';

const URL_BASE = 'http://localhost/api/praticien/comprehension';

function getRequest(query = 'idPatient=PAT_TEST'): Request {
  return new Request(`${URL_BASE}?${query}`);
}

function postRequest(body: unknown): Request {
  return new Request(URL_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const corps = (partiel: Record<string, unknown> = {}) => ({
  idPatient: 'PAT_TEST',
  texte: 'Vous venez pour un sommeil qui se casse au milieu de la nuit.',
  ...partiel,
});

const ligneLue = (partiel: Record<string, unknown> = {}) => ({
  id: 'SYN_1',
  texte: 'Vous venez pour un sommeil qui se casse au milieu de la nuit.',
  redigeeLe: null,
  publieeLe: null,
  creeLe: new Date('2026-08-20T09:00:00.000Z'),
  supersedesSyntheseId: null,
  ...partiel,
});

describe('/api/praticien/comprehension', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WN_COMPREHENSION = 'true';
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({
      praticienEmail: 'praticien@wellneuro.fr',
      actif: true,
      suiviClotureLe: null,
    });
    prisma.syntheseComprehension.findMany.mockResolvedValue([]);
    prisma.syntheseComprehension.findUnique.mockResolvedValue(null);
    prisma.syntheseComprehension.findFirst.mockResolvedValue(null);
    prisma.desaccordComprehension.findMany.mockResolvedValue([]);
    prisma.syntheseComprehension.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'SYN_NEUVE',
        texte: data.texte,
        redigeeLe: data.redigeeLe ?? null,
        publieeLe: data.publieeLe ?? null,
        supersedesSyntheseId: data.supersedesSyntheseId ?? null,
        // La base pose le présent : le mock reflète ce contrat, pas l'appelant.
        creeLe: new Date('2026-08-22T09:00:00.000Z'),
      }),
    );
  });

  // ── Droits ────────────────────────────────────────────────────────────────

  it('exige une session, au GET comme au POST', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await GET(getRequest())).status).toBe(401);
    expect((await POST(postRequest(corps()))).status).toBe(401);
    expect(prisma.syntheseComprehension.create).not.toHaveBeenCalled();
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });

  it('refuse le dossier d’un autre praticien, sans écrire ni journaliser', async () => {
    prisma.patient.findUnique.mockResolvedValue({
      praticienEmail: 'autre@wellneuro.fr',
      actif: true,
      suiviClotureLe: null,
    });
    expect((await GET(getRequest())).status).toBe(403);
    expect((await POST(postRequest(corps()))).status).toBe(403);
    expect(prisma.syntheseComprehension.create).not.toHaveBeenCalled();
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });

  it('répond 404 sur un patient inconnu', async () => {
    prisma.patient.findUnique.mockResolvedValue(null);
    expect((await GET(getRequest())).status).toBe(404);
  });

  it('refuse un identifiant patient malformé sans toucher la base', async () => {
    expect((await GET(getRequest('idPatient=PAT%20TEST'))).status).toBe(400);
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
  });

  // ── Le drapeau garde la PUBLICATION, pas le brouillon ─────────────────────

  it('refuse de publier quand la surface patient est fermée', async () => {
    process.env.WN_COMPREHENSION = '';
    const reponse = await POST(postRequest(corps({ publier: true })));
    expect(reponse.status).toBe(503);
    await expect(reponse.json()).resolves.toMatchObject({ reason: 'surface_patient_fermee' });
    expect(prisma.syntheseComprehension.create).not.toHaveBeenCalled();
  });

  it('laisse ENREGISTRER UN BROUILLON surface fermée — préparer n’est pas remettre', async () => {
    process.env.WN_COMPREHENSION = '';
    const reponse = await POST(postRequest(corps()));
    expect(reponse.status).toBe(201);
    expect(prisma.syntheseComprehension.create).toHaveBeenCalledTimes(1);
    const { data } = prisma.syntheseComprehension.create.mock.calls[0][0];
    expect(data.publieeLe).toBeNull();
  });

  it('fail-closed : « 1 », « TRUE » et « oui » n’ouvrent pas la publication', async () => {
    for (const valeur of ['1', 'TRUE', 'oui', 'true ']) {
      process.env.WN_COMPREHENSION = valeur;
      expect((await POST(postRequest(corps({ publier: true })))).status).toBe(503);
    }
  });

  it('`publier` n’est vrai que sur le booléen — pas de coercition', async () => {
    // `"non"`, `1` et `{}` sont truthy en JavaScript. Publier au patient ne doit
    // pas dépendre de la coercition d'un champ mal typé.
    for (const valeur of ['non', 1, {}, 'true']) {
      vi.clearAllMocks();
      prisma.syntheseComprehension.create.mockResolvedValue({
        id: 'SYN_NEUVE',
        texte: 'x',
        redigeeLe: null,
        publieeLe: null,
        supersedesSyntheseId: null,
        creeLe: new Date('2026-08-22T09:00:00.000Z'),
      });
      await POST(postRequest(corps({ publier: valeur })));
      const { data } = prisma.syntheseComprehension.create.mock.calls[0][0];
      expect(data.publieeLe).toBeNull();
    }
  });

  // ── Garde de vocabulaire — BANC DE DÉBRANCHEMENT ──────────────────────────
  //
  // CE BLOC EST LA PREUVE EXIGÉE PAR LA CARTE DES CHEMINS SORTANTS
  // (`documents/vocabulaire.ts`). Retirer l'appel à `termeAnxiogene` de la
  // route fait ROUGIR les deux premiers cas : ils sont écrits pour ça, et
  // aucun autre test du dépôt ne couvre ce câblage.

  it('DÉBRANCHEMENT — refuse de publier un texte au registre anxiogène (confirmable)', async () => {
    const reponse = await POST(
      postRequest(corps({ texte: 'Votre situation est grave et demande une réponse.', publier: true })),
    );
    expect(reponse.status).toBe(409);
    const corpsReponse = await reponse.json();
    expect(corpsReponse.reason).toBe('REGISTRE_ANXIOGENE');
    // Le message cite le mot du praticien, pas la racine du registre.
    expect(corpsReponse.error).toContain('grave');
    expect(prisma.syntheseComprehension.create).not.toHaveBeenCalled();
  });

  it('DÉBRANCHEMENT — publie tout de même sur confirmation explicite', async () => {
    const reponse = await POST(
      postRequest(
        corps({
          texte: 'Votre situation est grave et demande une réponse.',
          publier: true,
          confirmerRegistre: true,
        }),
      ),
    );
    expect(reponse.status).toBe(201);
    expect(prisma.syntheseComprehension.create).toHaveBeenCalledTimes(1);
  });

  it('ne garde PAS le brouillon : un brouillon ne sort pas de l’application', async () => {
    const reponse = await POST(
      postRequest(corps({ texte: 'Votre situation est grave et demande une réponse.' })),
    );
    expect(reponse.status).toBe(201);
  });

  it('`confirmerRegistre` seul ne publie rien — il ne remplace pas le drapeau', async () => {
    process.env.WN_COMPREHENSION = '';
    const reponse = await POST(
      postRequest(corps({ texte: 'Situation grave.', publier: true, confirmerRegistre: true })),
    );
    expect(reponse.status).toBe(503);
  });

  // ── Append-only ───────────────────────────────────────────────────────────

  it('n’écrit JAMAIS par update, delete ou upsert — réviser AJOUTE une ligne', async () => {
    prisma.syntheseComprehension.findUnique.mockResolvedValue({ idPatient: 'PAT_TEST' });
    await POST(postRequest(corps({ supersedesSyntheseId: 'SYN_1', texte: 'Version révisée.' })));

    expect(prisma.syntheseComprehension.create).toHaveBeenCalledTimes(1);
    expect(prisma.syntheseComprehension.update).not.toHaveBeenCalled();
    expect(prisma.syntheseComprehension.updateMany).not.toHaveBeenCalled();
    expect(prisma.syntheseComprehension.delete).not.toHaveBeenCalled();
    expect(prisma.syntheseComprehension.deleteMany).not.toHaveBeenCalled();
    const { data } = prisma.syntheseComprehension.create.mock.calls[0][0];
    expect(data.supersedesSyntheseId).toBe('SYN_1');
  });

  it('n’écrit JAMAIS un désaccord — le geste appartient au patient', async () => {
    await POST(postRequest(corps({ publier: true })));
    await GET(getRequest());
    expect(prisma.desaccordComprehension.create).not.toHaveBeenCalled();
    expect(prisma.desaccordComprehension.update).not.toHaveBeenCalled();
    expect(prisma.desaccordComprehension.delete).not.toHaveBeenCalled();
    expect(prisma.desaccordComprehension.deleteMany).not.toHaveBeenCalled();
  });

  it('ne transmet jamais `creeLe` : la base pose le présent', async () => {
    await POST(postRequest(corps()));
    const { data } = prisma.syntheseComprehension.create.mock.calls[0][0];
    expect(data).not.toHaveProperty('creeLe');
  });

  // ── Référence de version ──────────────────────────────────────────────────

  it('rend le MÊME refus pour une version inexistante et pour celle d’un autre dossier', async () => {
    // Inexistante.
    prisma.syntheseComprehension.findUnique.mockResolvedValue(null);
    const inexistante = await POST(postRequest(corps({ supersedesSyntheseId: 'SYN_X' })));
    // D'un autre dossier.
    prisma.syntheseComprehension.findUnique.mockResolvedValue({ idPatient: 'PAT_AUTRE' });
    const autreDossier = await POST(postRequest(corps({ supersedesSyntheseId: 'SYN_X' })));

    expect(inexistante.status).toBe(404);
    expect(autreDossier.status).toBe(404);
    // MÊME corps : distinguer ferait de la route un oracle d'existence.
    await expect(inexistante.json()).resolves.toEqual(await autreDossier.json());
    expect(prisma.syntheseComprehension.create).not.toHaveBeenCalled();
  });

  it('refuse une seconde révision de la même version (course rendue visible)', async () => {
    prisma.syntheseComprehension.findUnique.mockResolvedValue({ idPatient: 'PAT_TEST' });
    prisma.syntheseComprehension.findFirst.mockResolvedValue({ id: 'SYN_2' });
    const reponse = await POST(postRequest(corps({ supersedesSyntheseId: 'SYN_1' })));
    expect(reponse.status).toBe(409);
    await expect(reponse.json()).resolves.toMatchObject({ reason: 'synthese_supplantee' });
  });

  it('scope la recherche de supplantation au dossier — le seul index est (idPatient, creeLe)', async () => {
    prisma.syntheseComprehension.findUnique.mockResolvedValue({ idPatient: 'PAT_TEST' });
    await POST(postRequest(corps({ supersedesSyntheseId: 'SYN_1' })));
    expect(prisma.syntheseComprehension.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { idPatient: 'PAT_TEST', supersedesSyntheseId: 'SYN_1' } }),
    );
  });

  // ── Dossier clos ──────────────────────────────────────────────────────────

  it('refuse une nouvelle version sur un dossier clos', async () => {
    prisma.patient.findUnique.mockResolvedValue({
      praticienEmail: 'praticien@wellneuro.fr',
      actif: true,
      suiviClotureLe: new Date('2026-08-01T00:00:00.000Z'),
    });
    expect((await POST(postRequest(corps()))).status).toBe(409);
    expect(prisma.syntheseComprehension.create).not.toHaveBeenCalled();
  });

  // ── Validation ────────────────────────────────────────────────────────────

  it('refuse un texte vide et un texte trop long, sans tronquer', async () => {
    expect((await POST(postRequest(corps({ texte: '   ' })))).status).toBe(400);
    const trop = 'a'.repeat(LONGUEUR_MAX_SYNTHESE + 1);
    expect((await POST(postRequest(corps({ texte: trop })))).status).toBe(400);
    expect(prisma.syntheseComprehension.create).not.toHaveBeenCalled();
  });

  it('rend 400 — jamais 500 — sur un corps mal typé ou non-objet', async () => {
    expect((await POST(postRequest(null))).status).toBe(400);
    expect((await POST(postRequest([]))).status).toBe(400);
    expect((await POST(postRequest(corps({ texte: 123 })))).status).toBe(400);
    expect((await POST(postRequest(corps({ supersedesSyntheseId: 42 })))).status).toBe(400);
  });

  // ── Lecture ───────────────────────────────────────────────────────────────

  it('rend les têtes de chaîne, leur trajectoire, et l’état des désaccords', async () => {
    prisma.syntheseComprehension.findMany.mockResolvedValue([
      ligneLue({
        id: 'SYN_2',
        supersedesSyntheseId: 'SYN_1',
        publieeLe: new Date('2026-08-21T09:00:00.000Z'),
        creeLe: new Date('2026-08-21T09:00:00.000Z'),
      }),
      ligneLue({ id: 'SYN_1', publieeLe: new Date('2026-08-20T09:00:00.000Z') }),
    ]);
    prisma.desaccordComprehension.findMany.mockResolvedValue([
      {
        id: 'DES_1',
        idSynthese: 'SYN_1',
        texte: 'Ce n’est pas exactement ça.',
        exprimeLe: null,
        creeLe: new Date('2026-08-20T10:00:00.000Z'),
      },
    ]);

    const corpsReponse = await (await GET(getRequest())).json();
    expect(corpsReponse.syntheses.map((s: { id: string }) => s.id)).toEqual(['SYN_2']);
    expect(corpsReponse.trajectoires[0].lignes.map((l: { id: string }) => l.id)).toEqual([
      'SYN_2',
      'SYN_1',
    ]);
    // Le désaccord vise SYN_1, et SYN_2 (publiée, postérieure) en descend.
    expect(corpsReponse.desaccords[0].etat).toBe('repondu');
  });

  it('un désaccord sans réponse reste « en_attente » — jamais « ignoré »', async () => {
    prisma.syntheseComprehension.findMany.mockResolvedValue([
      ligneLue({ id: 'SYN_1', publieeLe: new Date('2026-08-20T09:00:00.000Z') }),
    ]);
    prisma.desaccordComprehension.findMany.mockResolvedValue([
      {
        id: 'DES_1',
        idSynthese: 'SYN_1',
        texte: null,
        exprimeLe: null,
        creeLe: new Date('2026-08-20T10:00:00.000Z'),
      },
    ]);
    const corpsReponse = await (await GET(getRequest())).json();
    expect(corpsReponse.desaccords[0].etat).toBe('en_attente');
  });

  it('garde le désaccord visible même quand la version visée a été révisée', async () => {
    prisma.syntheseComprehension.findMany.mockResolvedValue([
      ligneLue({ id: 'SYN_2', supersedesSyntheseId: 'SYN_1', creeLe: new Date('2026-08-21T09:00:00.000Z') }),
      ligneLue({ id: 'SYN_1' }),
    ]);
    prisma.desaccordComprehension.findMany.mockResolvedValue([
      {
        id: 'DES_1',
        idSynthese: 'SYN_1',
        texte: null,
        exprimeLe: null,
        creeLe: new Date('2026-08-20T10:00:00.000Z'),
      },
    ]);
    const corpsReponse = await (await GET(getRequest())).json();
    // Réécrire ce qu'un désaccord conteste ne le fait pas disparaître.
    expect(corpsReponse.desaccords).toHaveLength(1);
    expect(corpsReponse.desaccords[0].idSynthese).toBe('SYN_1');
  });

  it('LIT sans drapeau — une liste vide est un silence honnête, pas une panne', async () => {
    process.env.WN_COMPREHENSION = '';
    const reponse = await GET(getRequest());
    expect(reponse.status).toBe(200);
    await expect(reponse.json()).resolves.toMatchObject({ surfacePatientOuverte: false });
  });

  it('dit la vérité sur ce que le patient voit', async () => {
    process.env.WN_COMPREHENSION = 'true';
    await expect((await GET(getRequest())).json()).resolves.toMatchObject({
      surfacePatientOuverte: true,
    });
  });

  // ── Accusé de lecture, versant « vu » (G-TRUST-04) ────────────────────────
  //
  // C'est la MOITIÉ de l'arbitrage du lot sur l'accusé de lecture praticien :
  // faute de colonne en base, « vu » repose entièrement sur ce journal. Une
  // assertion de non-régression (avant/après) resterait verte si `acces`
  // disparaissait de l'appel à `garder()` — `0 === 0`. Il faut donc un cas
  // POSITIF, et qui nomme le gabarit.

  it('JOURNALISE la lecture du dossier, avec le gabarit littéral et la méthode', async () => {
    await GET(getRequest());
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledTimes(1);
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          idPatient: 'PAT_TEST',
          praticienEmail: 'praticien@wellneuro.fr',
          // Gabarit LITTÉRAL, jamais l'URL reçue (qui porterait la query).
          route: '/api/praticien/comprehension',
          methode: 'GET',
        }),
      }),
    );
  });

  it('ne journalise PAS l’écriture — elle laisse déjà sa propre trace', async () => {
    await POST(postRequest(corps()));
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });

  // ── Le texte gardé est le texte écrit ─────────────────────────────────────

  it('écrit en base EXACTEMENT le texte soumis à la garde de vocabulaire', async () => {
    // Le banc de débranchement prouve que `termeAnxiogene` est appelée ; celui-ci
    // prouve qu'elle porte sur le texte réellement stocké. Un refactor qui
    // garderait une variable et écrirait l'autre passerait entre les deux.
    const texte = '  Vous venez pour un sommeil qui se casse.  ';
    await POST(postRequest(corps({ texte, publier: true })));
    const { data } = prisma.syntheseComprehension.create.mock.calls[0][0];
    expect(data.texte).toBe(texte.trim());

    // Et le même texte, muni d'un terme du registre, est bien refusé.
    vi.clearAllMocks();
    const reponse = await POST(
      postRequest(corps({ texte: `${texte.trim()} C’est grave.`, publier: true })),
    );
    expect(reponse.status).toBe(409);
  });

  // ── Chemin d’exception : rien de nominatif en logs ────────────────────────

  it('ne journalise NI le texte NI l’e-mail quand Prisma lève', async () => {
    // `PrismaClientValidationError` recopie le `data:` du `create` dans son
    // message : journaliser `err.message` brut publierait 4 000 caractères de
    // prose clinique et l'e-mail du praticien (revue LOT-04, B2).
    const erreur = new Error(
      'Invalid `prisma.syntheseComprehension.create()` invocation: data: { texte: "Vous venez pour un sommeil qui se casse.", praticienEmail: "praticien@wellneuro.fr" }',
    );
    erreur.name = 'PrismaClientValidationError';
    prisma.syntheseComprehension.create.mockRejectedValue(erreur);
    const espion = vi.spyOn(console, 'error').mockImplementation(() => {});

    const reponse = await POST(postRequest(corps()));
    expect(reponse.status).toBe(500);

    const journalise = espion.mock.calls.flat().join(' ');
    expect(journalise).not.toContain('sommeil');
    expect(journalise).not.toContain('praticien@wellneuro.fr');
    // Ce qui reste est diagnosticable, et ne peut porter aucune valeur.
    expect(journalise).toContain('PrismaClientValidationError');
    espion.mockRestore();
  });

  it('garde le message des erreurs NON-Prisma — elles ne voient pas le corps', async () => {
    prisma.syntheseComprehension.create.mockRejectedValue(new Error('socket hang up'));
    const espion = vi.spyOn(console, 'error').mockImplementation(() => {});
    await POST(postRequest(corps()));
    expect(espion.mock.calls.flat().join(' ')).toContain('socket hang up');
    espion.mockRestore();
  });
});
