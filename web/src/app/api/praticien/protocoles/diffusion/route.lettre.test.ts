import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// [[D-262]], LOT-02 — LA LETTRE D'ADRESSAGE PART AVEC LE CLIC « VALIDER POUR
// DIFFUSION ». Ce banc tient le branchement dans la route : la remise est
// appelée DANS la transaction, avec l'approbation du clic, les actions de la
// version et le blocage des fiches ; une lettre remise réserve l'annonce même
// sans fiche (une annonce par clic, B3) ; drapeau fermé, la réponse est celle
// d'avant. Le choix de la lettre a son propre banc (`lettreAdressageRemise.test.ts`),
// la règle de la base son contrat SQL. Données synthétiques.

const H1 = 'a'.repeat(64);
const H2 = 'b'.repeat(64);

type Version = {
  id: string;
  sourceId: string;
  plateCode: string;
  numero: number;
  contenuSha256: string;
  actes: { ordre: bigint; acte: string; contenuSha256: string; validateur: string; relectureIntegrale: boolean; motif: string | null; le: Date }[];
};

const { etat, prisma, getServerSession } = vi.hoisted(() => {
  const etat = { versions: [] as Version[], remises: [] as { idVersion: string; ordre: number }[] };
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
      })),
      findMany: vi.fn(async () => [
        { id: 'pd_v1', inputHash: 'HASH_V1', decisionCardInputHash: 'HASH_DEC', assessmentEpisodeId: 'E1', supersedesDraftId: null, createdAt: new Date('2026-09-28T00:00:00.000Z'), payload: {} },
      ]),
    },
    protocolDiffusionApproval: {
      findMany: vi.fn(async () => [] as unknown[]),
      create: vi.fn(async () => ({ id: 'appr_1' })),
    },
    ficheAssietteVersion: {
      findMany: vi.fn(async () => etat.versions),
      findUnique: vi.fn(async () => ({ contenu: {}, texteSource: 'Source synthétique.' })),
    },
    ficheAssietteRemise: {
      findMany: vi.fn(async () =>
        [...etat.remises]
          .sort((a, b) => b.ordre - a.ordre)
          .map(r => {
            const v = etat.versions.find(x => x.id === r.idVersion)!;
            return { idVersion: r.idVersion, version: { sourceId: v.sourceId, numero: v.numero } };
          }),
      ),
      createMany: vi.fn(async ({ data }: { data: { idVersion: string }[] }) => {
        for (const d of data) etat.remises.push({ idVersion: d.idVersion, ordre: etat.remises.length + 1 });
        return { count: data.length };
      }),
    },
    correspondancePatient: { create: vi.fn(async () => ({ id: 'trace_1' })) },
    $executeRaw: vi.fn(async () => 1),
    $queryRaw: vi.fn(async () => [{ actif: true, suivi_cloture_le: null }]),
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(prisma)),
  };
  return { etat, prisma, getServerSession: vi.fn() };
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
vi.mock('@/lib/protocol/fromPrisma', () => ({
  reconstructProtocolDraft: vi.fn(() => ({
    protocolDraftId: 'PD_1',
    inputHash: 'HASH_V1',
    actions: [
      { actionId: 'orientation-medecin', type: 'medical_referral', interventionStatus: 'active' },
      { actionId: 'a1', type: 'food', interventionStatus: 'active', recommendedPlateRef: { plateCode: 'ASSIETTE_PROTEINEE' } },
    ],
  })),
}));
vi.mock('@/lib/clinical-engine/contenuPatientProtocole', () => ({
  apercuContenuPatient: vi.fn(() => ({ ok: true, contenu: {} })),
}));
vi.mock('@/lib/protocol/servirAuPatient', () => ({ vuePatientOuRefus: vi.fn(() => ({ ok: true })) }));
vi.mock('@/lib/fiches-assiette/controle', () => ({
  controlerVersion: vi.fn(async () => ({ contenu: {}, anomalies: [], claimsValides: new Map() })),
}));

const { remettreLettreAdressage, annoncerDocumentRemis } = vi.hoisted(() => ({
  remettreLettreAdressage: vi.fn(async () => 1),
  annoncerDocumentRemis: vi.fn(async () => 'envoye' as const),
}));
vi.mock('@/lib/correspondance/lettreAdressageRemise', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/correspondance/lettreAdressageRemise')>()),
  remettreLettreAdressage,
}));
vi.mock('@/lib/fiches-assiette/annonce', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/fiches-assiette/annonce')>()),
  annoncerDocumentRemis,
}));

import { GET, POST } from './route';

const lireJeton = async () =>
  ((await (await GET(new Request('http://localhost/api/praticien/protocoles/diffusion?idPatient=PAT_1&decisionCardId=DEC_1'))).json()) as {
    fiches: { jeton: string };
  }).fiches.jeton;

const cliquer = async () =>
  POST(
    new Request('http://localhost/api/praticien/protocoles/diffusion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idPatient: 'PAT_1', decisionCardId: 'DEC_1', protocolDraftInputHash: 'HASH_V1', jetonApercuFiches: await lireJeton() }),
    }),
  );

describe('La lettre d’adressage part avec le clic de diffusion (D-262, LOT-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WN_FICHES_ASSIETTE = 'true';
    process.env.WN_LETTRE_ADRESSAGE_PATIENT = 'true';
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    etat.versions = [];
    etat.remises = [];
  });

  afterEach(() => {
    delete process.env.WN_FICHES_ASSIETTE;
    delete process.env.WN_LETTRE_ADRESSAGE_PATIENT;
    delete process.env.WN_FICHES_ASSIETTE_LECTURE;
  });

  it('la remise est appelée dans la transaction, avec l’approbation du clic et les actions de la version', async () => {
    const res = await cliquer();
    expect(res.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(remettreLettreAdressage).toHaveBeenCalledWith(prisma, {
      idPatient: 'PAT_1',
      idApprobation: 'appr_1',
      actions: [
        expect.objectContaining({ actionId: 'orientation-medecin', type: 'medical_referral' }),
        expect.objectContaining({ actionId: 'a1' }),
      ],
      bloque: false,
    });
    expect(await res.json()).toEqual(expect.objectContaining({ fichesRemises: 0, lettreAdressageRemise: true, annonceFiches: 'envoye' }));
  });

  it('une lettre remise sans aucune fiche réserve UNE annonce, même espace des fiches fermé', async () => {
    await cliquer();
    expect(prisma.correspondancePatient.create).toHaveBeenCalledTimes(1);
    expect(annoncerDocumentRemis).toHaveBeenCalledWith('PAT_1', 'trace_1');
  });

  it('rien de remis : aucune annonce', async () => {
    remettreLettreAdressage.mockResolvedValueOnce(0);
    const res = await cliquer();
    expect(prisma.correspondancePatient.create).not.toHaveBeenCalled();
    expect(await res.json()).toEqual(expect.objectContaining({ lettreAdressageRemise: false }));
  });

  it('dossier clos : la remise reçoit le blocage des fiches', async () => {
    // Clos au GET comme au clic : le jeton vu est celui que le POST recalcule.
    const clos = new Date('2026-09-01T00:00:00.000Z');
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'p@wellneuro.fr', actif: true, suiviClotureLe: clos } as never);
    prisma.$queryRaw.mockResolvedValue([{ actif: true, suivi_cloture_le: clos }] as never);
    try {
      expect((await cliquer()).status).toBe(200);
      expect(remettreLettreAdressage).toHaveBeenCalledWith(prisma, expect.objectContaining({ bloque: true }));
    } finally {
      prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'p@wellneuro.fr', actif: true, suiviClotureLe: null });
      prisma.$queryRaw.mockResolvedValue([{ actif: true, suivi_cloture_le: null }]);
    }
  });

  it('drapeau fermé : la réponse ne porte pas la clé de la lettre', async () => {
    delete process.env.WN_LETTRE_ADRESSAGE_PATIENT;
    remettreLettreAdressage.mockResolvedValueOnce(0);
    const corps = await (await cliquer()).json();
    expect(corps).not.toHaveProperty('lettreAdressageRemise');
    expect(prisma.correspondancePatient.create).not.toHaveBeenCalled();
  });
});
