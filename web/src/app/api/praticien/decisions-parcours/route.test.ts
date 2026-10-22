import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Banc de la route du cockpit ([[D-343]], BP-15). La base refuse ce que la
// route refuse (contrat `decisions_parcours_v1_negatif.sql`, banc à deux
// sessions) ; ce banc-ci éprouve que la route le DIT, nommé, n'écrit rien
// quand elle refuse, et garde l'ordre drapeau → session → appartenance. Ce
// que la base ne voit pas — l'action dans le contenu de la version, la
// diffusion, l'instantané du carnet — se tient ici. Identifiants synthétiques.

const { getServerSession, prisma, lireVersionsDiffusees } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  lireVersionsDiffusees: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    protocolDraft: { findMany: vi.fn(), findFirst: vi.fn() },
    protocolDiffusionApproval: { findMany: vi.fn() },
    decisionParcours: { findMany: vi.fn(), create: vi.fn() },
    journalAccesDossier: { create: vi.fn(), deleteMany: vi.fn() },
    $transaction: vi.fn(),
    $executeRaw: vi.fn(),
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/dateParis', () => ({ dateJourParis: () => '2026-10-22' }));
vi.mock('@/lib/protocol/calendriersPersistes', () => ({ lireVersionsDiffusees }));
// Le contenu d'une version se relit par son empreinte ; la fixture porte ses
// actions en clair, ou se dit illisible.
vi.mock('@/lib/protocol/fromPrisma', () => ({
  reconstructProtocolDraft: (payload: { actions?: { actionId: string; title: string }[] }) => {
    if (!payload.actions) throw new Error('empreinte incohérente');
    return { actions: payload.actions };
  },
}));

import { JA_FOOD_OBSERVATION_CONTRACT_VERSION } from '@/lib/food-observation/contract';
import { GET, POST } from './route';

const PRATICIEN = 'praticien@wellneuro.fr';
const V = 'proto_a#h1';
const DOSSIER = {
  praticienEmail: PRATICIEN,
  actif: true,
  suiviClotureLe: null as Date | null,
  dateNaissance: '1985-03-12' as string | null,
};
const VERSION = {
  id: V,
  payload: { actions: [{ actionId: 'act_1', title: 'Action de fixture' }] },
  inputHash: 'h1',
  contractVersion: 'protocol-draft-v1',
};

const requete = (body: unknown) =>
  new Request('http://localhost/api/praticien/decisions-parcours', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
const lecture = () => GET(new Request('http://localhost/api/praticien/decisions-parcours?idPatient=PAT1'));
const poser = async (corps: Record<string, unknown>) => {
  const reponse = await POST(requete({ idPatient: 'PAT1', idVersion: V, acte: 'pose', ...corps }));
  return { status: reponse.status, corps: (await reponse.json()) as { ok: boolean; reason?: string; error?: string } };
};

const REFUS = { nature: 'refus', source: 'rapporte_par_patient', motif: 'choix_du_patient' };
const DEBUT = { nature: 'debut', source: 'constate_par_praticien', evenementLe: '2026-10-20' };

const ligne = (surcharge: Record<string, unknown>) => ({
  id: 'l1',
  ordre: BigInt(1),
  idPatient: 'PAT1',
  acte: 'pose',
  idVersion: V,
  idAction: null,
  nature: 'interruption',
  issue: null,
  motif: 'contrainte_pratique',
  note: null,
  evenementLe: new Date('2026-10-10T00:00:00.000Z'),
  evenementInconnu: false,
  source: 'rapporte_par_patient',
  idVersionSuivante: null,
  idLigneRemplacee: null,
  praticienEmail: PRATICIEN,
  acteLe: new Date('2026-10-20T09:00:00.000Z'),
  ...surcharge,
});

const avant = process.env.WN_DECISIONS_PARCOURS;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.WN_DECISIONS_PARCOURS = 'true';
  getServerSession.mockResolvedValue({ user: { email: PRATICIEN } });
  prisma.patient.findUnique.mockResolvedValue({ ...DOSSIER });
  prisma.protocolDraft.findFirst.mockResolvedValue({ ...VERSION });
  prisma.protocolDraft.findMany.mockResolvedValue([]);
  prisma.decisionParcours.findMany.mockResolvedValue([]);
  prisma.decisionParcours.create.mockResolvedValue({ id: 'nouvelle' });
  lireVersionsDiffusees.mockResolvedValue(new Map([[V, new Date('2026-10-01T08:00:00.000Z')]]));
  prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => unknown) => fn(prisma));
});

afterEach(() => {
  if (avant === undefined) delete process.env.WN_DECISIONS_PARCOURS;
  else process.env.WN_DECISIONS_PARCOURS = avant;
});

describe('drapeau et gardes', () => {
  it('drapeau éteint : 503 avant la session, rien n’est lu', async () => {
    delete process.env.WN_DECISIONS_PARCOURS;
    expect((await lecture()).status).toBe(503);
    expect((await poser(REFUS)).status).toBe(503);
    expect(getServerSession).not.toHaveBeenCalled();
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
  });

  it('sans session : 401 ; autre praticien : 403, rien d’écrit', async () => {
    getServerSession.mockResolvedValueOnce(null);
    expect((await lecture()).status).toBe(401);
    prisma.patient.findUnique.mockResolvedValue({ ...DOSSIER, praticienEmail: 'autre@wellneuro.fr' });
    expect((await poser(REFUS)).status).toBe(403);
    expect(prisma.decisionParcours.create).not.toHaveBeenCalled();
  });

  it('le GET journalise l’accès au dossier', async () => {
    expect((await lecture()).status).toBe(200);
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledTimes(1);
  });

  it('un dossier mineur est refusé à l’écriture (§8) ; le GET le dit', async () => {
    prisma.patient.findUnique.mockResolvedValue({ ...DOSSIER, dateNaissance: '2015-01-01' });
    const { status, corps } = await poser(REFUS);
    expect(status).toBe(409);
    expect(corps.reason).toBe('dossier_mineur');
    expect(prisma.decisionParcours.create).not.toHaveBeenCalled();
    expect((await (await lecture()).json()).mineur).toBe(true);
  });

  it('un dossier clos ne reçoit plus de décision', async () => {
    prisma.patient.findUnique.mockResolvedValue({ ...DOSSIER, suiviClotureLe: new Date('2026-10-01') });
    expect((await poser(REFUS)).status).toBe(409);
    expect(prisma.decisionParcours.create).not.toHaveBeenCalled();
  });

  it('une clôture posée entre la lecture de la route et la transaction : refusée sous le verrou', async () => {
    prisma.patient.findUnique
      .mockResolvedValueOnce({ ...DOSSIER }) // appartenance
      .mockResolvedValueOnce({ ...DOSSIER }) // la route, avant la transaction
      .mockResolvedValue({ ...DOSSIER, suiviClotureLe: new Date('2026-10-22') }); // sous le verrou
    const { status, corps } = await poser(REFUS);
    expect(status).toBe(409);
    expect(corps.reason).toBe('dossier_cloture');
    expect(corps.error).toMatch(/clôturé/);
    expect(prisma.decisionParcours.create).not.toHaveBeenCalled();
  });
});

describe('GET — versions et décisions', () => {
  it('les versions disent leur première diffusion et leurs actions ; jamais un instantané du carnet', async () => {
    prisma.protocolDraft.findMany.mockResolvedValue([
      { id: V, createdAt: new Date('2026-09-30T08:00:00.000Z'), payload: VERSION.payload, inputHash: 'h1' },
      { id: 'proto_b#h2', createdAt: new Date('2026-09-01T08:00:00.000Z'), payload: {}, inputHash: 'h2' },
    ]);
    prisma.decisionParcours.findMany.mockResolvedValue([ligne({})]);
    const corps = await (await lecture()).json();
    expect(corps.versions).toEqual([
      { id: V, creeLe: '2026-09-30T08:00:00.000Z', diffuseeLe: '2026-10-01T08:00:00.000Z', actions: [{ actionId: 'act_1', titre: 'Action de fixture' }] },
      { id: 'proto_b#h2', creeLe: '2026-09-01T08:00:00.000Z', diffuseeLe: null, actions: null },
    ]);
    const filtre = prisma.protocolDraft.findMany.mock.calls[0][0].where;
    expect(JSON.stringify(filtre)).toContain(JA_FOOD_OBSERVATION_CONTRACT_VERSION);
    expect(corps.decisions[0]).toMatchObject({ id: 'l1', ordre: '1', evenementLe: '2026-10-10', nature: 'interruption' });
  });
});

describe('POST — la base fait foi, la route le dit avant', () => {
  it('pose un refus, sous les deux verrous du trigger, l’auteur pris à la session', async () => {
    const { status } = await poser({ ...REFUS, praticienEmail: 'autre@wellneuro.fr' });
    expect(status).toBe(201);
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(2);
    expect(prisma.decisionParcours.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ nature: 'refus', motif: 'choix_du_patient', praticienEmail: PRATICIEN, idLigneRemplacee: null }),
    }));
  });

  it('un début réel daté s’écrit au jour, en UTC minuit', async () => {
    expect((await poser(DEBUT)).status).toBe(201);
    expect(prisma.decisionParcours.create.mock.calls[0][0].data.evenementLe).toEqual(new Date('2026-10-20T00:00:00.000Z'));
  });

  it('mise en œuvre et révision : une version diffusée seule (§7) ; un choix, toute version', async () => {
    lireVersionsDiffusees.mockResolvedValue(new Map());
    expect((await poser(DEBUT)).corps.reason).toBe('version_non_diffusee');
    expect((await poser({ nature: 'revision', issue: 'maintenir' })).corps.reason).toBe('version_non_diffusee');
    expect(prisma.decisionParcours.create).not.toHaveBeenCalled();
    expect((await poser(REFUS)).status).toBe(201);
  });

  it('une version d’un autre dossier ou un instantané du carnet : version_inconnue', async () => {
    prisma.protocolDraft.findFirst.mockResolvedValue(null);
    expect((await poser(REFUS)).corps.reason).toBe('version_inconnue');
    prisma.protocolDraft.findFirst.mockResolvedValue({ ...VERSION, contractVersion: JA_FOOD_OBSERVATION_CONTRACT_VERSION });
    expect((await poser(REFUS)).corps.reason).toBe('version_inconnue');
    expect(prisma.decisionParcours.create).not.toHaveBeenCalled();
  });

  it('l’action appartient au contenu de la version (§2)', async () => {
    expect((await poser({ ...REFUS, idAction: 'act_9' })).corps.reason).toBe('action_inconnue');
    prisma.protocolDraft.findFirst.mockResolvedValue({ ...VERSION, payload: {} });
    expect((await poser({ ...REFUS, idAction: 'act_1' })).corps.reason).toBe('version_illisible');
    expect(prisma.decisionParcours.create).not.toHaveBeenCalled();
  });

  it('la version suivante existe dans le dossier (§6)', async () => {
    prisma.protocolDraft.findFirst.mockImplementation(async ({ where }: { where: { id: string } }) =>
      (where.id === V ? { ...VERSION } : null));
    const corps = { nature: 'revision', issue: 'ajuster', motif: 'nouvelle_donnee_au_dossier', idVersionSuivante: 'proto_x#h9' };
    expect((await poser(corps)).corps.reason).toBe('version_suivante_inconnue');
    expect(prisma.decisionParcours.create).not.toHaveBeenCalled();
  });

  it('une révision désigne la tête de révision en vigueur (un fil par version)', async () => {
    prisma.decisionParcours.findMany.mockResolvedValue([ligne({ id: 'r1', nature: 'revision', issue: 'maintenir', motif: null, source: null })]);
    expect((await poser({ nature: 'revision', issue: 'maintenir' })).corps.reason).toBe('tete_changee');
    expect((await poser({ nature: 'revision', issue: 'maintenir', remplace: 'r1' })).status).toBe(201);
  });

  it('le fil de révision retiré : une révision neuve n’en désigne aucune, l’ancienne tête est refusée', async () => {
    prisma.decisionParcours.findMany.mockResolvedValue([
      ligne({ id: 'r1', nature: 'revision', issue: 'maintenir', motif: null, source: null }),
      ligne({ id: 'r2', ordre: BigInt(2), acte: 'retrait', nature: null, motif: null, source: null, idLigneRemplacee: 'r1' }),
    ]);
    expect((await poser({ nature: 'revision', issue: 'maintenir', remplace: 'r1' })).corps.reason).toBe('tete_changee');
    expect((await poser({ nature: 'revision', issue: 'maintenir' })).status).toBe(201);
  });

  it('une correction garde la famille et l’action (§3)', async () => {
    prisma.decisionParcours.findMany.mockResolvedValue([ligne({})]);
    expect((await poser({ ...REFUS, remplace: 'l1' })).corps.reason).toBe('remplacement_hors_famille');
    expect((await poser({ ...DEBUT, nature: 'arret', motif: 'choix_du_patient', remplace: 'l1', idAction: 'act_1' })).corps.reason)
      .toBe('remplacement_hors_famille');
    expect(prisma.decisionParcours.create).not.toHaveBeenCalled();
    // Une interruption corrigée en arrêt, même famille : admise.
    expect((await poser({ ...DEBUT, nature: 'arret', motif: 'choix_du_patient', remplace: 'l1' })).status).toBe(201);
  });

  it('retirer une ligne déjà remplacée : tete_changee ; inconnue : ligne_inconnue', async () => {
    prisma.decisionParcours.findMany.mockResolvedValue([ligne({}), ligne({ id: 'l2', ordre: BigInt(2), idLigneRemplacee: 'l1' })]);
    const retrait = { idPatient: 'PAT1', idVersion: V, acte: 'retrait', remplace: 'l1' };
    expect((await (await POST(requete(retrait))).json()).reason).toBe('tete_changee');
    prisma.decisionParcours.findMany.mockResolvedValue([]);
    expect((await (await POST(requete(retrait))).json()).reason).toBe('ligne_inconnue');
    expect(prisma.decisionParcours.create).not.toHaveBeenCalled();
  });

  it('un retrait de la tête s’écrit sans motif, sans note, sans date', async () => {
    prisma.decisionParcours.findMany.mockResolvedValue([ligne({})]);
    const reponse = await POST(requete({ idPatient: 'PAT1', idVersion: V, acte: 'retrait', remplace: 'l1' }));
    expect(reponse.status).toBe(201);
    expect(prisma.decisionParcours.create.mock.calls[0][0].data).toEqual({
      idPatient: 'PAT1', acte: 'retrait', idVersion: V, idLigneRemplacee: 'l1', praticienEmail: PRATICIEN,
    });
  });

  it('un refus de la base se reconnaît à son code, jamais à son message', async () => {
    prisma.decisionParcours.create.mockRejectedValue(
      Object.assign(new Error('pose refusée : PAT1'), { code: 'P2039', meta: { driverAdapterError: { cause: { code: 'P0001' } } } }),
    );
    const erreur = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { status, corps } = await poser(REFUS);
    expect(status).toBe(409);
    expect(corps.reason).toBe('refus_base');
    expect(JSON.stringify(erreur.mock.calls)).not.toContain('PAT1');
    erreur.mockRestore();
  });

  it('une demande invalide est refusée avant la transaction, nommée et en français', async () => {
    const { status, corps } = await poser({ ...REFUS, motif: 'inefficace' });
    expect(status).toBe(400);
    expect(corps.reason).toBe('motif_invalide');
    expect(corps.error).toMatch(/motif/i);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
