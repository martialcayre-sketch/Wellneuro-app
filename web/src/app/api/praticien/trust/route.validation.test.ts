import { beforeEach, describe, expect, it, vi } from 'vitest';

// GET /api/praticien/trust — CE QUE LE PRATICIEN LIT POUR RENDRE SON AVIS
// ([[D-281]] §5, étape 4) : le rattachement, les deux dates, la chaîne des
// avis et celui qui fait foi.

const { getServerSession, prisma, elementsDesProgrammesVises, signee } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    trustAdverseEffectReport: { findMany: vi.fn() },
    trustPrivacyIncident: { findMany: vi.fn() },
    trustRightsRequest: { findMany: vi.fn() },
    patient: { findMany: vi.fn() },
    trustAdverseEffectVerdict: { findMany: vi.fn() },
  },
  elementsDesProgrammesVises: vi.fn(),
  signee: { valeur: false },
}));
vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/trust/pauseEffetIndesirableServeur', () => ({ elementsDesProgrammesVises }));
vi.mock('@/lib/clinical/safetyEffetIndesirableV1', () => ({ interruptionEffetIndesirableActive: () => signee.valeur }));

import { GET } from './route';

const effet = (e: Record<string, unknown>) => ({
  idPatient: 'PAT_TEST', produitLibelle: 'Magnésium', severiteDeclaree: 'legere', symptomes: 'Maux de ventre',
  doseDeclaree: null, actionPrise: 'ne_sait_pas', produitsConcomitants: null, orientation: 'o', regleId: 'r',
  regleVersion: 'v', statutTraitement: 'recu', soumisLe: new Date('2026-10-12T10:00:00Z'), examineLe: null,
  debutPriseLe: null, debutSymptomesLe: null, protocolDraftId: null, rattachement: null, elementActionId: null, ...e,
});

describe('GET /api/praticien/trust — validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signee.valeur = false;
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.trustPrivacyIncident.findMany.mockResolvedValue([]);
    prisma.trustRightsRequest.findMany.mockResolvedValue([]);
    prisma.patient.findMany.mockResolvedValue([{ idPatient: 'PAT_TEST', prenom: 'Sophie', nom: 'Nicola' }]);
    elementsDesProgrammesVises.mockResolvedValue(new Map([['draft-1', [{ actionId: 'a-magnesium', title: 'Magnésium le soir' }]]]));
  });

  it('signalement rattaché : élément intitulé, dates, chaîne entière et tête en vigueur', async () => {
    prisma.trustAdverseEffectReport.findMany.mockResolvedValue([
      effet({
        id: 's1', protocolDraftId: 'draft-1', rattachement: 'element', elementActionId: 'a-magnesium',
        debutPriseLe: new Date('2026-10-03T00:00:00Z'),
      }),
    ]);
    prisma.trustAdverseEffectVerdict.findMany.mockResolvedValue([
      { id: 'v1', reportId: 's1', verdict: 'implique', elementActionId: 'a-magnesium', amenagement: 'retirer', renduPar: 'a@wellneuro.fr', renduLe: new Date('2026-10-10T10:00:00Z'), supersedesVerdictId: null },
      { id: 'v2', reportId: 's1', verdict: 'non_implique', elementActionId: null, amenagement: null, renduPar: 'a@wellneuro.fr', renduLe: new Date('2026-10-11T10:00:00Z'), supersedesVerdictId: 'v1' },
    ]);
    const corps = await (await GET()).json();
    expect(corps.pauseServie).toBe(false);
    const [s] = corps.signalements;
    expect(s.debutPriseLe).toBe('2026-10-03T00:00:00.000Z');
    expect(s.validation).toMatchObject({
      rattachement: 'element',
      elementDesigne: { actionId: 'a-magnesium', title: 'Magnésium le soir' },
      elements: [{ actionId: 'a-magnesium', title: 'Magnésium le soir' }],
      verdictCourantId: 'v2',
    });
    expect(s.validation.verdicts.map((v: { id: string }) => v.id)).toEqual(['v1', 'v2']);
    expect(elementsDesProgrammesVises).toHaveBeenCalledWith(['draft-1']);
  });

  it('« Je ne sais pas » : la liste du programme visé est servie ; programme illisible : null', async () => {
    prisma.trustAdverseEffectReport.findMany.mockResolvedValue([
      effet({ id: 's1', protocolDraftId: 'draft-1', rattachement: 'ne_sait_pas' }),
      effet({ id: 's2', protocolDraftId: 'draft-9', rattachement: 'autre_produit' }),
    ]);
    elementsDesProgrammesVises.mockResolvedValue(new Map([
      ['draft-1', [{ actionId: 'a-magnesium', title: 'Magnésium le soir' }]],
      ['draft-9', null],
    ]));
    prisma.trustAdverseEffectVerdict.findMany.mockResolvedValue([]);
    const corps = await (await GET()).json();
    const parId = Object.fromEntries(corps.signalements.map((s: { id: string }) => [s.id, s]));
    expect(parId.s1.validation).toMatchObject({
      elementDesigne: null, elements: [{ actionId: 'a-magnesium', title: 'Magnésium le soir' }], verdictCourantId: null,
    });
    expect(parId.s2.validation.elements).toBeNull();
  });

  it('signalement sans rattachement : aucune validation, aucune lecture de verdicts', async () => {
    prisma.trustAdverseEffectReport.findMany.mockResolvedValue([effet({ id: 's1' })]);
    const corps = await (await GET()).json();
    expect(corps.signalements[0].validation).toBeUndefined();
    expect(prisma.trustAdverseEffectVerdict.findMany).not.toHaveBeenCalled();
  });

  it('règle signée : pauseServie le dit', async () => {
    signee.valeur = true;
    prisma.trustAdverseEffectReport.findMany.mockResolvedValue([]);
    expect((await (await GET()).json()).pauseServie).toBe(true);
  });
});
