import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EntreeGardeComplement } from '@/lib/clinical/gardeComplementCible';

// [[D-345]] §4-§7, J3-12h lot 3 — LA ROUTE QUI PRÉPARE ET CONSIGNE LE COURRIER
// COMPLÉMENT. Ce banc tient : drapeau d'abord, version PERSISTÉE de ce
// dossier, garde relue (seul « requis » prépare), refus de liste en clair
// avant toute écriture, accord relu sous verrou, courrier ET liste dans la
// même transaction. Le « les deux ou rien » sur une vraie base est joué par
// `courrierComplement.pg.test.ts`. Données synthétiques.

const { prisma, tx, getServerSession, entrees, reconstruire } = vi.hoisted(() => {
  const tx = {
    $queryRaw: vi.fn(async () => [{ id: 'PAT_1' }]),
    trustChoiceEvent: {
      findMany: vi.fn(async () => [{ finalite: 'partage_medecin_traitant', statut: 'accorde', enregistreLe: new Date('2026-10-01T00:00:00Z') }]),
    },
    correspondanceMedecin: { create: vi.fn(async () => ({ id: 'corr_1' })) },
    courrierComplementListe: { create: vi.fn(async () => ({})) },
  };
  const prisma = {
    patient: {
      findUnique: vi.fn(async () => ({
        praticienEmail: 'p@wellneuro.fr', actif: true, suiviClotureLe: null, prenom: 'Sophie', nom: 'Nicola',
      })),
    },
    journalAccesDossier: { create: vi.fn(async () => ({})) },
    protocolDraft: {
      findUnique: vi.fn(async () => ({
        idPatient: 'PAT_1', payload: {}, inputHash: 'HASH_V1', contractVersion: 'c1-protocol-draft-v4',
      })),
    },
    supplementIngredient: { findMany: vi.fn(async () => [{ id: 'ing_1', nomFr: 'Magnésium' }]) },
    $transaction: vi.fn(async (fn: (client: unknown) => unknown) => fn(tx)),
  };
  const entrees = { valeur: null as EntreeGardeComplement | null };
  const reconstruire = vi.fn((): unknown => ({
    actions: [{
      actionId: 'a1',
      type: 'supplement_exploration',
      title: 'Intention ciblée',
      natureComplement: 'cible',
      interventionStatus: 'active',
      supplementCatalogRef: { ingredientId: 'ing_1', ruleId: 'r', ruleVersion: 1, justification: 'j' },
    }],
  }));
  return { prisma, tx, getServerSession: vi.fn(), entrees, reconstruire };
});

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/protocol/fromPrisma', () => ({ reconstructProtocolDraft: reconstruire }));
vi.mock('@/lib/clinical/entreesGardeComplement', () => ({
  lireEntreesGardeComplement: vi.fn(async (_c: unknown, _p: string, actions: unknown[]) =>
    (entrees.valeur ? { ...entrees.valeur, actions } : null)),
}));

import { POST } from './route';

const REQUIS: EntreeGardeComplement = {
  actions: [],
  statutAge: 'majeur',
  declarations: [{ critere: 'allaitement', reponse: 'oui', source: 'praticien', le: '2026-10-01T00:00:00.000Z' }],
  accordPartage: 'accorde',
};

const preparer = (corps: Record<string, unknown> = {}) =>
  POST(new Request('http://localhost/api/praticien/protocoles/courrier-complement', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idPatient: 'PAT_1', protocolDraftId: 'pd_v1', medecinLibelle: 'Dr Exemple', ...corps }),
  }));

describe('POST /api/praticien/protocoles/courrier-complement (D-345, J3-12h lot 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WN_COURRIER_COMPLEMENT = 'true';
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    entrees.valeur = REQUIS;
  });

  afterEach(() => {
    delete process.env.WN_COURRIER_COMPLEMENT;
  });

  it('drapeau fermé : 503 avant toute session et toute lecture', async () => {
    delete process.env.WN_COURRIER_COMPLEMENT;
    const res = await preparer();
    expect(res.status).toBe(503);
    expect(getServerSession).not.toHaveBeenCalled();
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
  });

  it('requis : le courrier ET sa liste, dans la même transaction, sous verrou et accord relu', async () => {
    const res = await preparer();
    expect(res.status).toBe(201);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.trustChoiceEvent.findMany).toHaveBeenCalledTimes(1);
    expect(tx.correspondanceMedecin.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        idPatient: 'PAT_1',
        sens: 'sortant',
        medecinLibelle: 'Dr Exemple',
        ancrageVersion: expect.stringMatching(/^complement-cible-[0-9a-f]{64}$/),
        texte: expect.stringContaining('- Intention ciblée — Magnésium.'),
      }),
    }));
    expect(tx.courrierComplementListe.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        idCorrespondance: 'corr_1',
        idPatient: 'PAT_1',
        complements: [expect.stringMatching(/^a1:[0-9a-f]{64}:[0-9a-f]{64}$/)],
        complementsSha256: expect.stringMatching(/^[0-9a-f]{64}$/),
      }),
    });
    const corps = await res.json();
    expect(corps.texte).not.toContain('Sophie');
  });

  it('garde non requise (rien ne déclenche) : 409 en clair, rien d’écrit', async () => {
    entrees.valeur = { ...REQUIS, declarations: [{ critere: 'allaitement', reponse: 'non', source: 'praticien', le: '2026-10-01T00:00:00.000Z' }, { critere: 'grossesse', reponse: 'non', source: 'praticien', le: '2026-10-01T00:00:00.000Z' }] };
    const res = await preparer();
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('garde_non_requis');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('mineur : 409, aucun courrier ne se prépare (D-345 §3)', async () => {
    entrees.valeur = { ...REQUIS, statutAge: 'mineur' };
    const res = await preparer();
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('garde_mineur');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('identifiant d’action hors format : refus EN CLAIR avant toute écriture', async () => {
    reconstruire.mockReturnValueOnce({
      actions: [{ actionId: 'a:1', type: 'supplement_exploration', title: 'Intention', natureComplement: 'cible', interventionStatus: 'active' }],
    });
    const res = await preparer();
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('identifiant_hors_format');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('accord retiré entre la garde et l’insertion : 409, rien de consigné', async () => {
    tx.trustChoiceEvent.findMany.mockResolvedValueOnce([
      { finalite: 'partage_medecin_traitant', statut: 'retire', enregistreLe: new Date('2026-10-02T00:00:00Z') },
    ]);
    const res = await preparer();
    expect(res.status).toBe(409);
    expect(tx.correspondanceMedecin.create).not.toHaveBeenCalled();
    expect(tx.courrierComplementListe.create).not.toHaveBeenCalled();
  });

  it('la liste refusée par la base : erreur, la transaction (donc le courrier) est annulée', async () => {
    tx.courrierComplementListe.create.mockRejectedValueOnce(new Error('liste refusée'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await preparer();
    expect(res.status).toBe(500);
  });

  it('version d’un autre dossier : 404', async () => {
    prisma.protocolDraft.findUnique.mockResolvedValueOnce({
      idPatient: 'AUTRE', payload: {}, inputHash: 'H', contractVersion: 'c1-protocol-draft-v4',
    });
    expect((await preparer()).status).toBe(404);
  });

  it('destinataire vide : 400', async () => {
    expect((await preparer({ medecinLibelle: '  ' })).status).toBe(400);
  });
});
