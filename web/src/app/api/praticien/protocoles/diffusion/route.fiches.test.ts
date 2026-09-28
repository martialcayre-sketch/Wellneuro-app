import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// L'INVARIANT CENTRAL DU LOT 8 ([[D-251]] §7) : le jeton que le GET sert avec
// l'aperçu des fiches est celui que le POST RECALCULE sous verrou — quand rien
// n'a changé, le clic passe ; quand quelque chose a changé, il est refusé.
//
// Ici, rien de la chaîne des fiches n'est simulé : `remise.ts`, `apercuRemise.ts`
// et l'appariement tournent pour de vrai sur un état en mémoire. Seuls le sont
// la base, la carte de décision, le contrat patient et les contrôles du corpus
// (qui ont leurs propres bancs). Données synthétiques.

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

import { GET, POST } from './route';

function valide(ordre: number, empreinte: string) {
  return { ordre: BigInt(ordre), acte: 'validee', contenuSha256: empreinte, validateur: 'praticien@wellneuro.fr', relectureIntegrale: true, motif: null, le: new Date('2026-09-28T00:00:00.000Z') };
}

const lireApercu = async () =>
  ((await (await GET(new Request('http://localhost/api/praticien/protocoles/diffusion?idPatient=PAT_1&decisionCardId=DEC_1'))).json()) as {
    fiches: { jeton: string; lignes: { statut: string; idVersion: string | null }[] };
  }).fiches;

const cliquer = (jeton: string) =>
  POST(
    new Request('http://localhost/api/praticien/protocoles/diffusion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idPatient: 'PAT_1', decisionCardId: 'DEC_1', protocolDraftInputHash: 'HASH_V1', jetonApercuFiches: jeton }),
    }),
  );

describe('Le jeton du GET est celui que le POST recalcule (lot 8)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WN_FICHES_ASSIETTE = 'true';
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    etat.versions = [
      { id: 'fav_1', sourceId: 'WN-SRC-0300', plateCode: 'ASSIETTE_PROTEINEE', numero: 1, contenuSha256: H1, actes: [valide(1, H1)] },
    ];
    etat.remises = [];
  });

  afterEach(() => {
    delete process.env.WN_FICHES_ASSIETTE;
  });

  it('rien n’a changé : le clic passe, avec le jeton lu au GET, et remet la fiche', async () => {
    const apercu = await lireApercu();
    expect(apercu.lignes).toEqual([expect.objectContaining({ statut: 'part', idVersion: 'fav_1' })]);

    const res = await cliquer(apercu.jeton);
    expect(res.status).toBe(200);
    expect(((await res.json()) as { fichesRemises: number }).fichesRemises).toBe(1);
    expect(etat.remises.map(r => r.idVersion)).toEqual(['fav_1']);
  });

  it('le même aperçu rejoué après la remise est PÉRIMÉ : refusé, rien de plus n’est écrit', async () => {
    const apercu = await lireApercu();
    expect((await cliquer(apercu.jeton)).status).toBe(200);

    const rejeu = await cliquer(apercu.jeton);
    expect(rejeu.status).toBe(409);
    expect(etat.remises).toHaveLength(1);

    // L'aperçu relu dit « déjà remise », et son jeton, lui, passe — sans rien écrire.
    const relu = await lireApercu();
    expect(relu.lignes[0].statut).toBe('deja_remise');
    expect((await cliquer(relu.jeton)).status).toBe(200);
    expect(etat.remises).toHaveLength(1);
  });

  it('une version validée entre l’aperçu et le clic : refusé, et l’aperçu relu montre la nouvelle', async () => {
    const apercu = await lireApercu();
    etat.versions.push({ id: 'fav_2', sourceId: 'WN-SRC-0300', plateCode: 'ASSIETTE_PROTEINEE', numero: 2, contenuSha256: H2, actes: [valide(2, H2)] });

    expect((await cliquer(apercu.jeton)).status).toBe(409);
    expect(etat.remises).toHaveLength(0);
    expect(prisma.protocolDiffusionApproval.create).not.toHaveBeenCalled();

    const relu = await lireApercu();
    expect(relu.lignes[0]).toMatchObject({ statut: 'part', idVersion: 'fav_2' });
    expect((await cliquer(relu.jeton)).status).toBe(200);
    expect(etat.remises.map(r => r.idVersion)).toEqual(['fav_2']);
  });
});
