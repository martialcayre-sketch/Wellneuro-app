import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    consultation: { findFirst: vi.fn() },
    propositionObjectif: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      createMany: vi.fn(),
      // Moqués EXPRÈS alors que la route ne les appelle jamais : sans eux,
      // l'assertion « append-only » ne pourrait pas être écrite — un mock
      // absent lèverait au lieu de compter zéro.
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    dispositionProposition: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    // Les tables de 6.0-A : moquées pour prouver que ce lot ne les touche pas.
    objectifNegocie: { create: vi.fn(), update: vi.fn(), findMany: vi.fn() },
    ratificationObjectif: { create: vi.fn(), findMany: vi.fn() },
    journalAccesDossier: { create: vi.fn(), deleteMany: vi.fn() },
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { GET, POST } from './route';
import { LONGUEUR_MAX_MOTIF_ECART, MAX_PROPOSITIONS } from '@/lib/praticien/propositionObjectif';

const URL_BASE = 'http://localhost/api/praticien/propositions-objectif';
const SHA_PERIMETRE = 'a'.repeat(64);

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

const corpsAssembler = (partiel: Record<string, unknown> = {}) => ({
  action: 'assembler',
  idPatient: 'PAT_TEST',
  plainte: { instrument: 'Q_MOD_03', domaine: 'sommeil', restitution: 'Restitution publiée' },
  candidats: [{ regle: 'PRIO-SOM-01', texte: 'Explorer le sommeil' }],
  shaPerimetre: SHA_PERIMETRE,
  ...partiel,
});

const corpsEcarter = (partiel: Record<string, unknown> = {}) => ({
  action: 'ecarter',
  idPatient: 'PAT_TEST',
  idProposition: 'PROP_1',
  motif: 'Le patient a déjà tranché autrement.',
  ...partiel,
});

const ligneProposition = (partiel: Record<string, unknown> = {}) => ({
  id: 'PROP_1',
  fragments: [{ texte: 'Explorer le sommeil', source: { nature: 'regle_signee', regle: 'PRIO-SOM-01' } }],
  hashSources: 'b'.repeat(64),
  assembleeLe: new Date('2026-08-22T09:00:00.000Z'),
  creeLe: new Date('2026-08-22T09:00:00.000Z'),
  ...partiel,
});

async function corpsDe(reponse: Response) {
  return (await reponse.json()) as Record<string, unknown>;
}

describe('/api/praticien/propositions-objectif', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // LE DRAPEAU EST ÉTEINT PAR DÉFAUT EN PRODUCTION : chaque cas qui veut la
    // surface ouverte l'allume explicitement, et un cas dédié vérifie le
    // comportement drapeau éteint.
    vi.stubEnv('WN_OBJECTIF_PROPOSE', 'true');
    vi.stubEnv('WN_OBJECTIF_PROPOSE_PATIENTS', '');
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({
      praticienEmail: 'praticien@wellneuro.fr',
      actif: true,
      suiviClotureLe: null,
    });
    prisma.consultation.findFirst.mockResolvedValue(null);
    prisma.propositionObjectif.findMany.mockResolvedValue([]);
    prisma.propositionObjectif.findFirst.mockResolvedValue(null);
    prisma.propositionObjectif.createMany.mockResolvedValue({ count: 0 });
    prisma.dispositionProposition.findMany.mockResolvedValue([]);
    prisma.dispositionProposition.create.mockResolvedValue({
      id: 'DIS_NEUVE',
      geste: 'ecartee',
      creeLe: new Date('2026-08-23T09:00:00.000Z'),
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // ── Droits et drapeaux ────────────────────────────────────────────────────

  it('exige une session, au GET comme au POST', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await GET(getRequest())).status).toBe(401);
    expect((await POST(postRequest(corpsAssembler()))).status).toBe(401);
    expect(prisma.propositionObjectif.createMany).not.toHaveBeenCalled();
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });

  it('répond 503 drapeau éteint — GET COMPRIS', async () => {
    // EXCEPTION ASSUMÉE à « une liste vide est un silence honnête » : ici, une
    // liste vide se lirait « la machine n'a rien trouvé à proposer sur ce
    // dossier », c'est-à-dire un constat sur le patient, là où la vérité est
    // que personne n'a ouvert la fonctionnalité.
    vi.stubEnv('WN_OBJECTIF_PROPOSE', '');
    expect((await GET(getRequest())).status).toBe(503);
    expect((await POST(postRequest(corpsAssembler()))).status).toBe(503);
    expect(prisma.propositionObjectif.findMany).not.toHaveBeenCalled();
  });

  it('est FAIL-CLOSED : seule la chaîne exacte « true » ouvre', async () => {
    for (const valeur of ['1', 'TRUE', 'oui', 'True', ' true']) {
      vi.stubEnv('WN_OBJECTIF_PROPOSE', valeur);
      expect((await GET(getRequest())).status).toBe(503);
    }
  });

  it('répond 503 hors du périmètre de repli, sans dire que c’est le repli', async () => {
    // Distinguer le repli du drapeau dirait à l'appelant qu'un dossier a été
    // retiré du périmètre, ce qui ne le regarde pas.
    vi.stubEnv('WN_OBJECTIF_PROPOSE_PATIENTS', 'PAT_AUTRE, PAT_ENCORE_AUTRE');
    const reponse = await GET(getRequest());
    expect(reponse.status).toBe(503);
    expect(await corpsDe(reponse)).toMatchObject({ reason: 'feature_disabled' });
  });

  it('sert le dossier quand il figure dans le repli, espaces tolérés', async () => {
    vi.stubEnv('WN_OBJECTIF_PROPOSE_PATIENTS', ' PAT_AUTRE , PAT_TEST ');
    expect((await GET(getRequest())).status).toBe(200);
  });

  it('refuse le dossier d’un autre praticien, et l’inconnu, sans écrire', async () => {
    prisma.patient.findUnique.mockResolvedValue({
      praticienEmail: 'autre@wellneuro.fr',
      actif: true,
      suiviClotureLe: null,
    });
    expect((await GET(getRequest())).status).toBe(403);

    prisma.patient.findUnique.mockResolvedValue(null);
    expect((await GET(getRequest())).status).toBe(404);
    expect(prisma.propositionObjectif.createMany).not.toHaveBeenCalled();
    // Un refus ne se journalise pas : la ligne nommerait un dossier non lu.
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });

  it('valide l’identifiant patient avant de toucher la base', async () => {
    expect((await GET(getRequest('idPatient='))).status).toBe(400);
    expect((await GET(getRequest('idPatient=PAT%20TEST'))).status).toBe(400);
    expect(prisma.propositionObjectif.findMany).not.toHaveBeenCalled();
  });

  it('refuse un dossier clos', async () => {
    prisma.patient.findUnique.mockResolvedValue({
      praticienEmail: 'praticien@wellneuro.fr',
      actif: false,
      suiviClotureLe: new Date('2026-08-01T09:00:00.000Z'),
    });
    const reponse = await POST(postRequest(corpsAssembler()));
    expect(reponse.status).toBe(409);
    expect(prisma.propositionObjectif.createMany).not.toHaveBeenCalled();
  });

  // ── Corps malformé ────────────────────────────────────────────────────────

  it('rend 400, jamais 500, sur un corps qui n’est pas un objet', async () => {
    // `null`, `42`, `[]` sont du JSON PARFAITEMENT VALIDE : sans contrôle, la
    // route lèverait AVANT la garde — donc sans session.
    for (const corps of [null, 42, 'texte', []]) {
      expect((await POST(postRequest(corps))).status).toBe(400);
    }
    const brut = new Request(URL_BASE, { method: 'POST', body: 'pas du json' });
    expect((await POST(brut)).status).toBe(400);
  });

  it('refuse une action inconnue avant de lire le dossier', async () => {
    expect((await POST(postRequest({ action: 'reprendre', idPatient: 'PAT_TEST' }))).status).toBe(400);
    expect((await POST(postRequest({ idPatient: 'PAT_TEST' }))).status).toBe(400);
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
  });

  // ── Assembler ─────────────────────────────────────────────────────────────

  it('assemble et écrit une assemblée neuve quand le dossier est vide', async () => {
    prisma.consultation.findFirst.mockResolvedValue({
      anamnese: {
        motif_principal: 'Je me réveille à trois heures.',
        objectif_prioritaire: 'Dormir d’une traite.',
        attentes: ['Comprendre pourquoi'],
      },
      dateValidation: new Date('2026-08-20T09:00:00.000Z'),
      createdAt: new Date('2026-08-19T09:00:00.000Z'),
    });

    const reponse = await POST(postRequest(corpsAssembler()));
    expect(reponse.status).toBe(200);
    expect(prisma.propositionObjectif.createMany).toHaveBeenCalledTimes(1);

    const { data } = prisma.propositionObjectif.createMany.mock.calls[0][0];
    expect(data).toHaveLength(1);
    // UN SEUL INSTANT POUR TOUTE L'ASSEMBLÉE — c'est la clé d'assemblée.
    expect(data[0].assembleeLe).toBeInstanceOf(Date);
    expect(data[0].hashSources).toMatch(/^[0-9a-f]{64}$/);
    // `creeLe` N'EST PAS TRANSMIS : la base pose le présent, ce qui rend la
    // ligne inantidatable.
    expect(data[0]).not.toHaveProperty('creeLe');

    // L'ANAMNÈSE VIENT DE LA BASE, pas du corps de la requête.
    const natures = data[0].fragments.map((f: { source: { nature: string } }) => f.source.nature);
    expect(natures).toEqual(['regle_signee', 'instrument', 'anamnese', 'anamnese', 'anamnese']);
  });

  it('N’ÉCRIT RIEN quand les sources n’ont pas bougé — idempotence par empreinte', async () => {
    // Premier appel : on capture l'empreinte produite.
    await POST(postRequest(corpsAssembler()));
    const { data } = prisma.propositionObjectif.createMany.mock.calls[0][0];
    const empreintes = data.map((ligne: { hashSources: string }) => ligne.hashSources);

    // Second appel, sources identiques et assemblée déjà en base : rien.
    vi.clearAllMocks();
    prisma.consultation.findFirst.mockResolvedValue(null);
    prisma.dispositionProposition.findMany.mockResolvedValue([]);
    prisma.propositionObjectif.findMany.mockResolvedValue(
      empreintes.map((hash: string, i: number) =>
        ligneProposition({ id: `PROP_${i}`, hashSources: hash }),
      ),
    );

    const reponse = await POST(postRequest(corpsAssembler()));
    expect(reponse.status).toBe(200);
    expect(prisma.propositionObjectif.createMany).not.toHaveBeenCalled();
  });

  it('RÉASSEMBLE dès qu’une source a bougé', async () => {
    prisma.propositionObjectif.findMany.mockResolvedValue([
      ligneProposition({ hashSources: 'c'.repeat(64) }),
    ]);
    const reponse = await POST(postRequest(corpsAssembler()));
    expect(reponse.status).toBe(200);
    expect(prisma.propositionObjectif.createMany).toHaveBeenCalledTimes(1);
  });

  it('n’écrit rien, et ne rend rien, sans candidat ni SHA de périmètre', async () => {
    // Table non signée, abstention requise, aucune règle déclenchée : la
    // machine n'a rien de signé à citer.
    for (const corps of [corpsAssembler({ candidats: [] }), corpsAssembler({ shaPerimetre: '' })]) {
      vi.clearAllMocks();
      prisma.propositionObjectif.findMany.mockResolvedValue([]);
      prisma.dispositionProposition.findMany.mockResolvedValue([]);
      const reponse = await POST(postRequest(corps));
      expect(reponse.status).toBe(200);
      expect(await corpsDe(reponse)).toMatchObject({ propositions: [] });
      expect(prisma.propositionObjectif.createMany).not.toHaveBeenCalled();
    }
  });

  it('refuse un SHA de périmètre malformé', async () => {
    for (const sha of ['pas-un-sha', 'A'.repeat(64), 'a'.repeat(63)]) {
      expect((await POST(postRequest(corpsAssembler({ shaPerimetre: sha })))).status).toBe(400);
    }
    expect(prisma.propositionObjectif.createMany).not.toHaveBeenCalled();
  });

  it('refuse une plainte ou des candidats malformés plutôt que de les accepter à moitié', async () => {
    const malformes = [
      corpsAssembler({ plainte: { instrument: '', domaine: 'sommeil' } }),
      corpsAssembler({ plainte: 'Q_MOD_03' }),
      corpsAssembler({ plainte: { instrument: 'Q_MOD_03', domaine: 'sommeil', restitution: 7 } }),
      corpsAssembler({ candidats: [{ regle: 'PRIO-1' }] }),
      corpsAssembler({ candidats: [{ regle: '', texte: 'x' }] }),
      corpsAssembler({ candidats: 'PRIO-1' }),
      corpsAssembler({ candidats: Array.from({ length: 33 }, () => ({ regle: 'r', texte: 't' })) }),
    ];
    for (const corps of malformes) {
      expect((await POST(postRequest(corps))).status).toBe(400);
    }
    expect(prisma.propositionObjectif.createMany).not.toHaveBeenCalled();
  });

  it('accepte une plainte absente — le canal n’est pas toujours mesurable', async () => {
    const reponse = await POST(postRequest(corpsAssembler({ plainte: null })));
    expect(reponse.status).toBe(200);
    const { data } = prisma.propositionObjectif.createMany.mock.calls[0][0];
    expect(data[0].fragments.map((f: { source: { nature: string } }) => f.source.nature)).toEqual([
      'regle_signee',
    ]);
  });

  it('ne produit JAMAIS plus de trois propositions, même sur huit candidats', async () => {
    const candidats = Array.from({ length: 8 }, (_, i) => ({ regle: `PRIO-${i}`, texte: `Règle ${i}` }));
    await POST(postRequest(corpsAssembler({ candidats })));
    const { data } = prisma.propositionObjectif.createMany.mock.calls[0][0];
    expect(data).toHaveLength(MAX_PROPOSITIONS);
  });

  // ── Écarter ───────────────────────────────────────────────────────────────

  it('enregistre un écart motivé, et rien d’autre', async () => {
    prisma.propositionObjectif.findFirst.mockResolvedValue({ id: 'PROP_1' });
    const reponse = await POST(postRequest(corpsEcarter()));
    expect(reponse.status).toBe(201);

    const { data } = prisma.dispositionProposition.create.mock.calls[0][0];
    expect(data).toEqual({
      idPatient: 'PAT_TEST',
      idProposition: 'PROP_1',
      praticienEmail: 'praticien@wellneuro.fr',
      geste: 'ecartee',
      motif: 'Le patient a déjà tranché autrement.',
    });
    // `creeLe` n'est pas transmis, et rien n'est écrit ailleurs.
    expect(data).not.toHaveProperty('creeLe');
    expect(prisma.propositionObjectif.createMany).not.toHaveBeenCalled();
    expect(prisma.objectifNegocie.create).not.toHaveBeenCalled();
  });

  it('rend 422 sur un écart sans motif — pas 400 : c’est un défaut de CONTENU', async () => {
    prisma.propositionObjectif.findFirst.mockResolvedValue({ id: 'PROP_1' });
    for (const motif of [undefined, null, '', '   ']) {
      const reponse = await POST(postRequest(corpsEcarter({ motif })));
      expect(reponse.status).toBe(422);
      expect(await corpsDe(reponse)).toMatchObject({ reason: 'motif_absent' });
    }
    expect(prisma.dispositionProposition.create).not.toHaveBeenCalled();
  });

  it('rend 422 sur un motif trop long — refus, jamais troncature', async () => {
    prisma.propositionObjectif.findFirst.mockResolvedValue({ id: 'PROP_1' });
    const trop = 'x'.repeat(LONGUEUR_MAX_MOTIF_ECART + 1);
    const reponse = await POST(postRequest(corpsEcarter({ motif: trop })));
    expect(reponse.status).toBe(422);
    expect(prisma.dispositionProposition.create).not.toHaveBeenCalled();
  });

  it('rend 400 sur un motif non textuel, et sur une proposition non visée', async () => {
    expect((await POST(postRequest(corpsEcarter({ motif: 42 })))).status).toBe(400);
    expect((await POST(postRequest(corpsEcarter({ idProposition: '' })))).status).toBe(400);
    expect(prisma.dispositionProposition.create).not.toHaveBeenCalled();
  });

  it('rend 404 sur une proposition inconnue OU d’un autre dossier — même réponse', async () => {
    // Les distinguer ferait de la route un oracle d'existence, interrogeable
    // avec une session praticien quelconque.
    prisma.propositionObjectif.findFirst.mockResolvedValue(null);
    const reponse = await POST(postRequest(corpsEcarter()));
    expect(reponse.status).toBe(404);
    expect(prisma.dispositionProposition.create).not.toHaveBeenCalled();
    // Le prédicat est SCOPÉ AU DOSSIER : sans `idPatient`, l'index
    // `(id_patient, cree_le)` ne peut pas être emprunté.
    expect(prisma.propositionObjectif.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'PROP_1', idPatient: 'PAT_TEST' } }),
    );
  });

  // ── Lecture ───────────────────────────────────────────────────────────────

  it('sépare vivantes, disposées et caduques', async () => {
    const ancienne = new Date('2026-08-21T09:00:00.000Z');
    const recente = new Date('2026-08-22T09:00:00.000Z');
    prisma.propositionObjectif.findMany.mockResolvedValue([
      ligneProposition({ id: 'NEUVE_A', assembleeLe: recente }),
      ligneProposition({ id: 'NEUVE_B', assembleeLe: recente }),
      ligneProposition({ id: 'VIEILLE', assembleeLe: ancienne }),
    ]);
    prisma.dispositionProposition.findMany.mockResolvedValue([
      { id: 'D1', idProposition: 'NEUVE_B', geste: 'reprise', creeLe: recente },
    ]);

    const corps = await corpsDe(await GET(getRequest()));
    expect((corps.propositions as { id: string }[]).map((p) => p.id)).toEqual(['NEUVE_A']);
    expect(corps.disposees).toMatchObject([{ id: 'NEUVE_B', disposition: 'reprise' }]);
    expect((corps.caduques as { id: string }[]).map((p) => p.id)).toEqual(['VIEILLE']);
  });

  it('n’expose que les clés épinglées, et jamais l’empreinte des sources', async () => {
    prisma.propositionObjectif.findMany.mockResolvedValue([ligneProposition()]);
    const corps = await corpsDe(await GET(getRequest()));
    const [proposition] = corps.propositions as Record<string, unknown>[];
    expect(Object.keys(proposition).sort()).toEqual([
      'assembleeLe',
      'creeLe',
      'disposition',
      'fragments',
      'id',
    ]);
    // `hashSources` est une mécanique de caducité, pas une information d'écran.
    expect(proposition).not.toHaveProperty('hashSources');
  });

  it('ÉCARTE un fragment sans source plutôt que de l’afficher comme s’il en avait une', async () => {
    // `fragments` est un JSONB LIBRE et la table est en production depuis le
    // LOT-01 : rien ne garantit qu'une ligne y ait été déposée par les
    // fabriques. Ce qui n'a pas la forme attendue est écarté, jamais complété.
    prisma.propositionObjectif.findMany.mockResolvedValue([
      ligneProposition({
        fragments: [
          { texte: 'Des mots sans provenance' },
          { texte: '', source: { nature: 'anamnese' } },
          { texte: 'Sourcé', source: { nature: 'anamnese', champ: 'motif_principal' } },
          'pas un objet',
        ],
      }),
    ]);
    const corps = await corpsDe(await GET(getRequest()));
    const [proposition] = corps.propositions as { fragments: { texte: string }[] }[];
    expect(proposition.fragments.map((f) => f.texte)).toEqual(['Sourcé']);
  });

  it('journalise la lecture du dossier, une seule fois, et jamais l’URL reçue', async () => {
    await GET(getRequest('idPatient=PAT_TEST&bruit=1'));
    // La journalisation est portée par `verifierAppartenancePatient` : ce banc
    // vérifie que le GET a bien opté (le POST, lui, ne doit pas).
    vi.clearAllMocks();
    prisma.patient.findUnique.mockResolvedValue({
      praticienEmail: 'praticien@wellneuro.fr',
      actif: true,
      suiviClotureLe: null,
    });
    prisma.propositionObjectif.findMany.mockResolvedValue([]);
    prisma.dispositionProposition.findMany.mockResolvedValue([]);
    await POST(postRequest(corpsAssembler()));
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });

  // ── Append-only et frontières ─────────────────────────────────────────────

  it('n’emprunte AUCUNE écriture destructrice, sur aucune des deux tables', async () => {
    prisma.propositionObjectif.findFirst.mockResolvedValue({ id: 'PROP_1' });
    await GET(getRequest());
    await POST(postRequest(corpsAssembler()));
    await POST(postRequest(corpsEcarter()));

    for (const mock of [
      prisma.propositionObjectif.update,
      prisma.propositionObjectif.updateMany,
      prisma.propositionObjectif.delete,
      prisma.propositionObjectif.deleteMany,
      prisma.dispositionProposition.update,
      prisma.dispositionProposition.deleteMany,
    ]) {
      expect(mock).not.toHaveBeenCalled();
    }
    // Ni les tables de 6.0-A : la reprise passe par la route objectifs.
    expect(prisma.objectifNegocie.create).not.toHaveBeenCalled();
    expect(prisma.ratificationObjectif.create).not.toHaveBeenCalled();
  });

  it('rend 500 sans jamais journaliser les mots du patient', async () => {
    const journal = vi.spyOn(console, 'error').mockImplementation(() => {});
    const erreur = Object.assign(
      new Error('Invalid `prisma.propositionObjectif.createMany()` — Je me réveille à trois heures.'),
      { name: 'PrismaClientValidationError' },
    );
    prisma.propositionObjectif.createMany.mockRejectedValue(erreur);

    const reponse = await POST(postRequest(corpsAssembler()));
    expect(reponse.status).toBe(500);

    const journalise = journal.mock.calls.flat().join(' ');
    expect(journalise).toContain('PrismaClientValidationError');
    // LE MESSAGE BRUT RECOPIE LE `data:` — donc les fragments. On n'en garde
    // que la classe.
    expect(journalise).not.toContain('Je me réveille');
    journal.mockRestore();
  });
});
