import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApercuCourrierComplement } from '@/lib/correspondance/courrierComplementRemise';

// [[D-345]] §4-§6, J3-12h lot 3 — LE COURRIER COMPLÉMENT AU CLIC « VALIDER POUR
// DIFFUSION ». Ce banc tient le branchement dans la route : refus d'avant
// l'embranchement (motif en clair), fail-closed quand le chemin des fiches est
// fermé, aperçu recalculé DANS la transaction et entré dans le jeton, remise
// liée au courrier VU, refus sous verrou qui annule tout, et drapeau fermé =
// réponse d'avant. L'aperçu et la remise ont leur propre banc
// (`courrierComplementRemise.test.ts`), la règle de la base son contrat SQL.
// Données synthétiques.

const { prisma, tx, getServerSession, reconstruire } = vi.hoisted(() => {
  const prisma = {
    patient: { findUnique: vi.fn(async () => ({ praticienEmail: 'p@wellneuro.fr', actif: true, suiviClotureLe: null })) },
    journalAccesDossier: { create: vi.fn(async () => ({})), deleteMany: vi.fn(async () => ({ count: 0 })) },
    protocolDraft: {
      findUnique: vi.fn(async () => ({
        idPatient: 'PAT_1',
        inputHash: 'HASH_V1',
        decisionCardInputHash: 'HASH_DEC',
        assessmentEpisodeId: 'E1',
        status: 'practitioner_reviewed',
        reviewedAt: new Date('2026-09-28T00:00:00.000Z'),
        payload: {},
        contractVersion: 'c1-protocol-draft-v4',
      })),
      findMany: vi.fn(async () => [
        {
          id: 'pd_v1', inputHash: 'HASH_V1', decisionCardInputHash: 'HASH_DEC', assessmentEpisodeId: 'E1',
          supersedesDraftId: null, createdAt: new Date('2026-09-28T00:00:00.000Z'), payload: {},
          contractVersion: 'c1-protocol-draft-v4',
        },
      ]),
    },
    protocolDiffusionApproval: {
      findMany: vi.fn(async () => [] as unknown[]),
      create: vi.fn(async () => ({ id: 'appr_1' })),
    },
    ficheAssietteVersion: { findMany: vi.fn(async () => []), findUnique: vi.fn(async () => null) },
    ficheAssietteRemise: { findMany: vi.fn(async () => []), createMany: vi.fn(async () => ({ count: 0 })) },
    correspondancePatient: { create: vi.fn(async () => ({ id: 'trace_1' })), count: vi.fn(async () => 0) },
    $executeRaw: vi.fn(async () => 1),
    $queryRaw: vi.fn(async () => [{ actif: true, suivi_cloture_le: null }]),
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(tx)),
  };
  const tx: typeof prisma = { ...prisma };
  const reconstruire = vi.fn((): unknown => ({
    protocolDraftId: 'PD_1',
    inputHash: 'HASH_V1',
    actions: [
      { actionId: 'a1', type: 'supplement_exploration', title: 'Intention', natureComplement: 'cible', interventionStatus: 'active' },
    ],
  }));
  return { prisma, tx, getServerSession: vi.fn(), reconstruire };
});

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/clinical-engine/rejeuCarteDecision', () => ({
  rejouerCarteDecision: vi.fn(async () => ({
    ok: true,
    selectionEcartee: false,
    decisionCard: { decisionCardId: 'DEC_1', inputHash: 'HASH_DEC', abstention: { status: 'not_required', ruleIds: [], limitations: [] }, safetyFindingIds: [] },
  })),
}));
vi.mock('@/lib/protocol/fromPrisma', () => ({ reconstructProtocolDraft: reconstruire }));
vi.mock('@/lib/clinical-engine/contenuPatientProtocole', () => ({
  apercuContenuPatient: vi.fn(() => ({ ok: true, contenu: {} })),
}));
vi.mock('@/lib/protocol/servirAuPatient', () => ({ vuePatientOuRefus: vi.fn(() => ({ ok: true })) }));

const { apercuCourrierComplement, remettreCourrierComplement } = vi.hoisted(() => ({
  apercuCourrierComplement: vi.fn(async (): Promise<ApercuCourrierComplement> => ({
    etat: 'non_requis', statut: 'non_requis', motif: 'm', populationDeclenche: false, courrier: null,
  })),
  remettreCourrierComplement: vi.fn(async (): Promise<'remis' | 'deja_remis' | 'rien'> => 'remis'),
}));
vi.mock('@/lib/correspondance/courrierComplementRemise', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/correspondance/courrierComplementRemise')>()),
  apercuCourrierComplement,
  remettreCourrierComplement,
}));

import { MOTIF_REMISE_REFUSEE, RemiseComplementRefusee } from '@/lib/correspondance/courrierComplementRemise';
import { GET, POST } from './route';

const PART: ApercuCourrierComplement = {
  etat: 'part', statut: 'requis', motif: 'part', populationDeclenche: true,
  courrier: { idCorrespondance: 'corr_1', consigneLe: '2026-10-20T10:00:00.000Z' },
};
const MANQUANT: ApercuCourrierComplement = {
  etat: 'manquant', statut: 'requis', motif: 'Un courrier au médecin est requis.', populationDeclenche: false, courrier: null,
};

const lireGet = async () =>
  (await (await GET(new Request('http://localhost/api/praticien/protocoles/diffusion?idPatient=PAT_1&decisionCardId=DEC_1'))).json()) as {
    fiches: { jeton: string } | null;
    courrierComplement?: unknown;
  };

const cliquer = async (jeton?: string) =>
  POST(
    new Request('http://localhost/api/praticien/protocoles/diffusion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idPatient: 'PAT_1',
        decisionCardId: 'DEC_1',
        protocolDraftInputHash: 'HASH_V1',
        jetonApercuFiches: jeton ?? (await lireGet()).fiches?.jeton,
      }),
    }),
  );

describe('Le courrier complément au clic de diffusion (D-345, J3-12h lot 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WN_FICHES_ASSIETTE = 'true';
    process.env.WN_COURRIER_COMPLEMENT = 'true';
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    apercuCourrierComplement.mockResolvedValue(PART);
    remettreCourrierComplement.mockResolvedValue('remis');
  });

  afterEach(() => {
    delete process.env.WN_FICHES_ASSIETTE;
    delete process.env.WN_COURRIER_COMPLEMENT;
  });

  it('remise dans la transaction, liée à l’approbation du clic et au courrier VU', async () => {
    const res = await cliquer();
    expect(res.status).toBe(200);
    expect(apercuCourrierComplement).toHaveBeenCalledWith(tx, expect.objectContaining({
      idPatient: 'PAT_1', contractVersion: 'c1-protocol-draft-v4',
    }));
    expect(remettreCourrierComplement).toHaveBeenCalledWith(tx, expect.objectContaining({
      idPatient: 'PAT_1',
      idApprobation: 'appr_1',
      idCorrespondanceVue: 'corr_1',
      actions: [expect.objectContaining({ actionId: 'a1', natureComplement: 'cible' })],
    }));
    expect(await res.json()).toEqual(expect.objectContaining({ courrierComplementRemis: true }));
  });

  it('courrier requis non préparé : refus d’avant l’embranchement, motif en clair, rien d’écrit', async () => {
    apercuCourrierComplement.mockResolvedValue(MANQUANT);
    const res = await cliquer('jeton');
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ ok: false, reason: 'courrier_complement_requis', error: MANQUANT.motif });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.protocolDiffusionApproval.create).not.toHaveBeenCalled();
  });

  it('refus de la garde (accord absent) : 409, motif de la garde', async () => {
    apercuCourrierComplement.mockResolvedValue({
      etat: 'refuse', statut: 'accord_requis', motif: 'Accord requis.', populationDeclenche: true, courrier: null,
    });
    const res = await cliquer('jeton');
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('Accord requis.');
  });

  it('courrier à remettre mais chemin des fiches fermé : refus (fail-closed), aucune approbation', async () => {
    delete process.env.WN_FICHES_ASSIETTE;
    const res = await cliquer('jeton');
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('courrier_complement_requis');
    expect(prisma.protocolDiffusionApproval.create).not.toHaveBeenCalled();
  });

  it('non requis, chemin des fiches fermé : le clic d’avant, sans remise', async () => {
    delete process.env.WN_FICHES_ASSIETTE;
    apercuCourrierComplement.mockResolvedValue({
      etat: 'non_requis', statut: 'non_requis', motif: 'm', populationDeclenche: false, courrier: null,
    });
    const res = await cliquer('jeton');
    expect(res.status).toBe(200);
    expect(remettreCourrierComplement).not.toHaveBeenCalled();
  });

  it('version illisible : refus, la garde ne peut rien affirmer', async () => {
    reconstruire.mockImplementation(() => { throw new Error('illisible'); });
    try {
      const res = await cliquer('jeton');
      expect(res.status).toBe(409);
      expect((await res.json()).reason).toBe('courrier_complement_requis');
    } finally {
      reconstruire.mockImplementation(() => ({
        protocolDraftId: 'PD_1',
        inputHash: 'HASH_V1',
        actions: [
          { actionId: 'a1', type: 'supplement_exploration', title: 'Intention', natureComplement: 'cible', interventionStatus: 'active' },
        ],
      }));
    }
  });

  it('remise refusée sous verrou : le clic est annulé entier, motif en clair', async () => {
    remettreCourrierComplement.mockRejectedValue(new RemiseComplementRefusee());
    const res = await cliquer();
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ ok: false, reason: 'courrier_complement_requis', error: MOTIF_REMISE_REFUSEE });
  });

  it('le courrier entre dans le jeton : un courrier préparé entre l’aperçu et le clic périme le clic', async () => {
    apercuCourrierComplement.mockResolvedValue({ ...PART, etat: 'deja', courrier: null });
    const jetonVu = (await lireGet()).fiches?.jeton;
    apercuCourrierComplement.mockResolvedValue(PART);
    const res = await cliquer(jetonVu);
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('apercu_fiches_perime');
    expect(remettreCourrierComplement).not.toHaveBeenCalled();
  });

  it('le GET sert l’aperçu, avec le destinataire prérempli quand un courrier est à préparer', async () => {
    apercuCourrierComplement.mockResolvedValue(MANQUANT);
    prisma.patient.findUnique.mockResolvedValue({
      praticienEmail: 'p@wellneuro.fr', actif: true, suiviClotureLe: null, medecinTraitantNom: ' Dr Exemple ',
    } as never);
    try {
      const get = await lireGet();
      expect(get.courrierComplement).toEqual({ apercu: MANQUANT, medecinTraitant: 'Dr Exemple' });
    } finally {
      prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'p@wellneuro.fr', actif: true, suiviClotureLe: null });
    }
  });

  it('dossier clos et courrier à remettre : refusé, motif du blocage — et le GET le dit d’avance', async () => {
    const clos = new Date('2026-09-01T00:00:00.000Z');
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'p@wellneuro.fr', actif: true, suiviClotureLe: clos } as never);
    prisma.$queryRaw.mockResolvedValue([{ actif: true, suivi_cloture_le: clos }] as never);
    try {
      const get = await lireGet();
      expect(get.courrierComplement).toMatchObject({ apercu: { etat: 'refuse', statut: 'dossier_bloque' } });
      const res = await cliquer();
      expect(res.status).toBe(409);
      expect((await res.json()).error).toMatch(/ne peut pas être remis/);
      expect(remettreCourrierComplement).not.toHaveBeenCalled();
    } finally {
      prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'p@wellneuro.fr', actif: true, suiviClotureLe: null });
      prisma.$queryRaw.mockResolvedValue([{ actif: true, suivi_cloture_le: null }]);
    }
  });

  it('GET sans aucune version, drapeau ouvert : la clé est là — la case paraît dès le premier protocole', async () => {
    prisma.protocolDraft.findMany.mockResolvedValueOnce([]);
    const get = await lireGet();
    expect(get).toHaveProperty('courrierComplement', null);
  });

  it('GET dont l’aperçu du complément lève : réponse servie, aperçu bloquant, jeton empoisonné', async () => {
    apercuCourrierComplement.mockRejectedValueOnce(new Error('panne'));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const get = await lireGet();
    expect(get.courrierComplement).toMatchObject({ apercu: { etat: 'refuse', statut: 'lecture_impossible' } });
    expect(get.fiches?.jeton).toBe('lecture_impossible');
  });

  it('drapeau fermé : ni aperçu, ni remise, ni clé — la réponse d’avant', async () => {
    delete process.env.WN_COURRIER_COMPLEMENT;
    const get = await lireGet();
    expect(get).not.toHaveProperty('courrierComplement');
    const res = await cliquer();
    expect(res.status).toBe(200);
    expect(await res.json()).not.toHaveProperty('courrierComplementRemis');
    expect(apercuCourrierComplement).not.toHaveBeenCalled();
    expect(remettreCourrierComplement).not.toHaveBeenCalled();
    // La lecture de base est celle d'avant : le contrat n'est pas lu.
    for (const appel of prisma.protocolDraft.findMany.mock.calls as unknown as [{ select: Record<string, unknown> }][]) {
      expect(appel[0].select.contractVersion).toBe(false);
    }
  });
});
