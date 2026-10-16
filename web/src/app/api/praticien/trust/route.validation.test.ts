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

  // D-281 §5, arbitrage du 2026-10-16 : « impliqué, élément non identifiable »
  // ouvert sur le seul programme visé illisible.
  it('avisSansElement : vrai sur programme illisible, faux sur liste lisible vide et sur élément désigné', async () => {
    prisma.trustAdverseEffectReport.findMany.mockResolvedValue([
      effet({ id: 's1', protocolDraftId: 'draft-9', rattachement: 'ne_sait_pas' }),
      effet({ id: 's2', protocolDraftId: 'draft-9' }),
      effet({ id: 's3', protocolDraftId: 'draft-vide', rattachement: 'ne_sait_pas' }),
      effet({ id: 's4', protocolDraftId: 'draft-9', rattachement: 'element', elementActionId: 'a-magnesium' }),
    ]);
    elementsDesProgrammesVises.mockResolvedValue(new Map([['draft-9', null], ['draft-vide', []]]));
    prisma.trustAdverseEffectVerdict.findMany.mockResolvedValue([]);
    const corps = await (await GET()).json();
    const parId = Object.fromEntries(corps.signalements.map((s: { id: string }) => [s.id, s]));
    expect(parId.s1.validation.avisSansElement).toBe(true);
    expect(parId.s2.validation.avisSansElement).toBe(true);
    expect(parId.s3.validation.avisSansElement).toBe(false);
    expect(parId.s4.validation.avisSansElement).toBe(false);
  });

  // D-281 §5 : « oui » au programme sans élément. Il reçoit l'avis comme
  // « Je ne sais pas » : la liste du programme visé, sans élément désigné.
  it('formulaire d’avant : validation servie, rattachement nul, liste du programme visé', async () => {
    prisma.trustAdverseEffectReport.findMany.mockResolvedValue([effet({ id: 's1', protocolDraftId: 'draft-1' })]);
    prisma.trustAdverseEffectVerdict.findMany.mockResolvedValue([]);
    const corps = await (await GET()).json();
    expect(corps.signalements[0].validation).toMatchObject({
      rattachement: null, elementDesigne: null,
      elements: [{ actionId: 'a-magnesium', title: 'Magnésium le soir' }], verdictCourantId: null,
    });
    expect(prisma.trustAdverseEffectVerdict.findMany.mock.calls[0][0].where).toEqual({ reportId: { in: ['s1'] } });
  });

  it('signalement sans rattachement ni programme : aucune validation, aucune lecture de verdicts', async () => {
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

  // D-281 §5, « le statut ne lève rien » : un signalement rattaché reste non
  // traité tant qu'aucun avis n'est rendu, et l'est dès qu'il l'est, quel que
  // soit son statut. Les autres se comptent par statut.
  it('nonTraites : un rattaché compte tant qu’il attend l’avis, quel que soit son statut', async () => {
    prisma.trustAdverseEffectReport.findMany.mockResolvedValue([
      effet({ id: 's1', protocolDraftId: 'draft-1', rattachement: 'element', elementActionId: 'a-magnesium', statutTraitement: 'traite' }),
      effet({ id: 's2', protocolDraftId: 'draft-1', rattachement: 'ne_sait_pas', statutTraitement: 'clos' }),
      effet({ id: 's3', protocolDraftId: 'draft-1', rattachement: 'element', elementActionId: 'a-magnesium', statutTraitement: 'recu' }),
      effet({ id: 's4', statutTraitement: 'en_cours' }),
      effet({ id: 's5', statutTraitement: 'traite' }),
      // Formulaire d'avant : passé à « traité » sans avis, il attend toujours.
      effet({ id: 's6', protocolDraftId: 'draft-1', statutTraitement: 'traite' }),
    ]);
    // s3 a son avis : il sort du compte, même au statut « reçu ».
    prisma.trustAdverseEffectVerdict.findMany.mockResolvedValue([
      { id: 'v1', reportId: 's3', verdict: 'non_implique', elementActionId: null, amenagement: null, renduPar: 'a@wellneuro.fr', renduLe: new Date('2026-10-13T10:00:00Z'), supersedesVerdictId: null },
    ]);
    prisma.trustRightsRequest.findMany.mockResolvedValue([
      { id: 'd1', idPatient: 'PAT_TEST', type: 'acces', description: null, statutTraitement: 'recu', soumisLe: new Date('2026-10-11T10:00:00Z'), examineLe: null },
    ]);
    // s1, s2 et s6 (attente), s4 (statut ouvert, hors règle), d1 (demande reçue).
    expect((await (await GET()).json()).nonTraites).toBe(5);
  });
});
