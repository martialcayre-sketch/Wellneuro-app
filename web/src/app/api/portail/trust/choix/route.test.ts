import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma, authentifierPatientPortail } = vi.hoisted(() => ({
  prisma: {
    trustChoiceEvent: { count: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  },
  authentifierPatientPortail: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma }));
// La garde du dossier de la page reste la vraie ([[D-481]], DOC-12) : seule
// l'authentification est simulée.
vi.mock('@/lib/trust/portailAuth', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/trust/portailAuth')>()),
  authentifierPatientPortail,
}));

import { POST } from './route';
import { EN_TETE_DOSSIER_PAGE, MESSAGE_AUTRE_DOSSIER } from '@/lib/portail/dossierPage';

const URL_BASE = 'http://localhost/api/portail/trust/choix';

/** `segment` : celui de la page qui envoie ; `null` : en-tête absent. Défaut : le dossier de la session. */
function requete(corps: unknown, segment: string | null = 'PAT_TEST'): Request {
  return new Request(URL_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(segment === null ? {} : { [EN_TETE_DOSSIER_PAGE]: segment }) },
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
    prisma.trustChoiceEvent.count.mockResolvedValue(0);
    prisma.$queryRaw.mockResolvedValue([{ id: 1 }]);
    prisma.$transaction.mockImplementation(async (op: (tx: unknown) => unknown) => op({
      trustChoiceEvent: prisma.trustChoiceEvent,
      $queryRaw: prisma.$queryRaw,
    }));
    delete process.env.WN_TRACE_FORMULATION_CHOIX;
  });

  it('page ouverte sous un autre dossier : 409 (T-51), sans verrou ni écriture', async () => {
    const res = await POST(requete({ finalite: 'partage_medecin_traitant', statut: 'accorde' }, 'PAT_AUTRE'));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ ok: false, reason: 'autre_dossier', error: MESSAGE_AUTRE_DOSSIER });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.trustChoiceEvent.create).not.toHaveBeenCalled();
  });

  it('segment absent : 409, sans écriture', async () => {
    const res = await POST(requete({ finalite: 'partage_medecin_traitant', statut: 'retire' }, null));
    expect(res.status).toBe(409);
    expect(prisma.trustChoiceEvent.create).not.toHaveBeenCalled();
  });

  it('401 et 403 passent avant la garde du dossier de la page', async () => {
    const { NextResponse } = await import('next/server');
    for (const status of [401, 403]) {
      authentifierPatientPortail.mockResolvedValueOnce({ erreur: NextResponse.json({ ok: false }, { status }) });
      const res = await POST(requete({ finalite: 'partage_medecin_traitant', statut: 'accorde' }, 'PAT_AUTRE'));
      expect(res.status).toBe(status);
    }
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

  it('au plafond horaire (D-327), un accord est refusé (429), compté sous le verrou', async () => {
    prisma.trustChoiceEvent.count.mockResolvedValue(20);
    const reponse = await POST(requete({ finalite: 'partage_medecin_traitant', statut: 'accorde' }));
    expect(reponse.status).toBe(429);
    expect((await reponse.json()).error).toBe('Vous avez fait beaucoup d’envois en peu de temps. Réessayez dans une heure.');
    expect(prisma.trustChoiceEvent.create).not.toHaveBeenCalled();
    expect(prisma.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.trustChoiceEvent.count.mock.invocationCallOrder[0],
    );
  });

  it('au plafond, un REFUS est compté et borné comme un accord', async () => {
    prisma.trustChoiceEvent.count.mockResolvedValue(20);
    const reponse = await POST(requete({ finalite: 'partage_medecin_traitant', statut: 'refuse' }));
    expect(reponse.status).toBe(429);
    expect(prisma.trustChoiceEvent.create).not.toHaveBeenCalled();
  });

  it('★ au plafond, un RETRAIT passe quand même — il doit rester aussi simple que l’accord', async () => {
    prisma.trustChoiceEvent.count.mockResolvedValue(500);
    prisma.trustChoiceEvent.findFirst.mockResolvedValue({ id: 'EVT_1', statut: 'accorde' });
    const reponse = await POST(requete({ finalite: 'partage_medecin_traitant', statut: 'retire' }));
    expect(reponse.status).toBe(200);
    expect(prisma.trustChoiceEvent.create).toHaveBeenCalledTimes(1);
    expect(prisma.trustChoiceEvent.count).not.toHaveBeenCalled();
  });

  it('refuse une finalité ou un statut inconnus, sans rien écrire', async () => {
    expect((await POST(requete({ finalite: 'inventee', statut: 'accorde' }))).status).toBe(400);
    expect((await POST(requete({ finalite: 'partage_medecin_traitant', statut: 'peut_etre' }))).status).toBe(400);
    expect(prisma.trustChoiceEvent.create).not.toHaveBeenCalled();
  });
});
