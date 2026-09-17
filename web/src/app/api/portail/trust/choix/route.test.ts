import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma, authentifierPatientPortail } = vi.hoisted(() => ({
  prisma: {
    trustChoiceEvent: { findFirst: vi.fn(), create: vi.fn() },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  },
  authentifierPatientPortail: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/trust/portailAuth', () => ({ authentifierPatientPortail }));

import { POST } from './route';

const URL_BASE = 'http://localhost/api/portail/trust/choix';

function requete(corps: unknown): Request {
  return new Request(URL_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
  });
}

// CETTE ROUTE N'AVAIT AUCUN BANC, et c'est le geste le plus sensible du portail :
// c'est ici que le choix du patient s'enregistre. Elle a reçu le 2026-09-17 une
// transaction, un verrou de ligne et une colonne sous drapeau — trois
// changements dont aucun n'était éprouvé.
describe('POST /api/portail/trust/choix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authentifierPatientPortail.mockResolvedValue({ patient: { idPatient: 'PAT_TEST' } });
    prisma.trustChoiceEvent.findFirst.mockResolvedValue(null);
    prisma.trustChoiceEvent.create.mockResolvedValue({});
    prisma.$queryRaw.mockResolvedValue([{ id: 1 }]);
    prisma.$transaction.mockImplementation(async (op: (tx: unknown) => unknown) => op({
      trustChoiceEvent: prisma.trustChoiceEvent,
      $queryRaw: prisma.$queryRaw,
    }));
    delete process.env.WN_TRACE_FORMULATION_CHOIX;
  });

  it('★ PREND LE VERROU DE LIGNE — sans lui, la garde des routes praticien ne sérialise rien', () => {
    // LE VERROU NE VAUT QUE PARCE QUE LES DEUX CÔTÉS LE PRENNENT. Cette route
    // est l'écrivain ; les routes praticien sont les lecteurs. Si celle-ci
    // cessait de le prendre, leur `FOR UPDATE` retiendrait le vide et la course
    // se rouvrirait sans qu'un seul banc ne rougisse là-bas.
    return POST(requete({ finalite: 'partage_medecin_traitant', statut: 'refuse' })).then(() => {
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      const gabarit = prisma.$queryRaw.mock.calls[0][0] as string[];
      expect(gabarit.join('§')).toContain('FOR UPDATE');

      // L'ORDRE, apporté par la revue Copilot et retenu : le verrou est pris
      // AVANT la lecture du précédent et AVANT l'écriture. Un verrou pris après
      // la lecture ne retient plus rien — la valeur lue daterait d'avant lui.
      // Ma version du banc ne l'attrapait pas ; la sienne si.
      expect(prisma.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
        prisma.trustChoiceEvent.findFirst.mock.invocationCallOrder[0],
      );
      expect(prisma.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
        prisma.trustChoiceEvent.create.mock.invocationCallOrder[0],
      );
    });
  });

  it('enregistre le choix avec la version du document de référence', async () => {
    await POST(requete({ finalite: 'partage_medecin_traitant', statut: 'refuse' }));
    const data = prisma.trustChoiceEvent.create.mock.calls[0][0].data;
    expect(data.idPatient).toBe('PAT_TEST');
    expect(data.statut).toBe('refuse');
    expect(data.documentVersion).toMatch(/^v\d+$/);
  });

  it('★ le drapeau ÉTEINT n’écrit PAS la colonne — sinon la migration non appliquée casse le geste', () => {
    // C'EST LA RAISON D'ÊTRE DU DRAPEAU. Entre le merge et l'approbation
    // `release-db`, la colonne n'existe pas : la nommer ferait échouer
    // l'enregistrement du choix du patient.
    return POST(requete({ finalite: 'partage_medecin_traitant', statut: 'accorde' })).then(() => {
      const data = prisma.trustChoiceEvent.create.mock.calls[0][0].data;
      expect(data).not.toHaveProperty('formulationVersion');
    });
  });

  it('★ le drapeau ALLUMÉ écrit la version de la formulation servie', async () => {
    process.env.WN_TRACE_FORMULATION_CHOIX = 'true';
    await POST(requete({ finalite: 'partage_medecin_traitant', statut: 'accorde' }));
    const data = prisma.trustChoiceEvent.create.mock.calls[0][0].data;
    expect(data.formulationVersion).toBe('v2');
  });

  it('un retrait sans accord antérieur ne s’écrit pas, et répond quand même ok', async () => {
    prisma.trustChoiceEvent.findFirst.mockResolvedValue(null);
    const reponse = await POST(requete({ finalite: 'partage_medecin_traitant', statut: 'retire' }));
    expect(reponse.status).toBe(200);
    expect(prisma.trustChoiceEvent.create).not.toHaveBeenCalled();
  });

  it('refuse une finalité ou un statut inconnus, sans rien écrire', async () => {
    expect((await POST(requete({ finalite: 'inventee', statut: 'accorde' }))).status).toBe(400);
    expect((await POST(requete({ finalite: 'partage_medecin_traitant', statut: 'peut_etre' }))).status).toBe(400);
    expect(prisma.trustChoiceEvent.create).not.toHaveBeenCalled();
  });
});
