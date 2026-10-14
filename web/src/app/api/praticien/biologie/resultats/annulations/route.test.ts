import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Banc de la route d'actes ([[D-294]], BP-09). La base refuse tout ce que la
// route refuse (contrat `annulations_resultats_biologiques_v1_negatif.sql`,
// banc à deux sessions) ; ce banc-ci éprouve que la route le DIT, nommé, et
// n'écrit rien quand elle refuse.

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    resultatBiologique: { findFirst: vi.fn(), findMany: vi.fn() },
    annulationResultatBiologique: { findMany: vi.fn(), findFirst: vi.fn(), count: vi.fn(), create: vi.fn() },
    journalAccesDossier: { create: vi.fn() },
    $transaction: vi.fn(),
    $executeRaw: vi.fn(),
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { POST } from './route';

const PRATICIEN = 'praticien@wellneuro.fr';
const PRELEVE = new Date('2026-09-01T08:00:00.000Z');

function requete(body: unknown): Request {
  return new Request('http://localhost/api/praticien/biologie/resultats/annulations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const ligne = (id: string, supersedesResultatId: string | null, jour: number) => ({
  id,
  supersedesResultatId,
  saisiLe: new Date(`2026-09-0${jour}T09:00:00.000Z`),
});

const ANNULATION = { idPatient: 'PAT1', acte: 'annulation', idResultat: 'res1', motif: 'mauvais_analyte' };
const REVOCATION = { idPatient: 'PAT1', acte: 'revocation', idAnnulation: 'ann1', motif: 'resultat_verifie_exact' };
const ANNULATION_ACTIVE = {
  id: 'ann1',
  idResultat: 'res1',
  motifAnnulation: 'mauvais_analyte',
  praticienEmail: PRATICIEN,
  acteLe: new Date('2026-09-03T10:00:00.000Z'),
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.WN_CB_ENABLED = 'true';
  process.env.WN_CB_RESULTS_ENABLED = 'true';
  getServerSession.mockResolvedValue({ user: { email: PRATICIEN } });
  prisma.patient.findUnique.mockResolvedValue({ praticienEmail: PRATICIEN, actif: true, suiviClotureLe: null });
  prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => unknown) => fn(prisma));
  prisma.$executeRaw.mockResolvedValue(1);
  prisma.resultatBiologique.findFirst.mockResolvedValue({ analyteCode: 'BIO_FERRITINE', preleveLe: PRELEVE });
  prisma.resultatBiologique.findMany.mockResolvedValue([ligne('res1', null, 1)]);
  prisma.annulationResultatBiologique.findMany.mockResolvedValue([]);
  prisma.annulationResultatBiologique.findFirst.mockResolvedValue({ id: 'ann1', idResultat: 'res1' });
  prisma.annulationResultatBiologique.count.mockResolvedValue(0);
  prisma.annulationResultatBiologique.create.mockResolvedValue({ id: 'nouvel_acte' });
});

afterEach(() => {
  delete process.env.WN_CB_ENABLED;
  delete process.env.WN_CB_RESULTS_ENABLED;
});

describe('annulation — un acte en ajout seul, motif fermé (D-294 §1-§3)', () => {
  it('consigne l’acte : motif de la liste, auteur = la session, après les verrous', async () => {
    const response = await POST(requete({ ...ANNULATION, praticienEmail: 'pirate@exemple.fr', acteLe: '2020-01-01' }));
    expect(response.status).toBe(201);
    expect(prisma.annulationResultatBiologique.create).toHaveBeenCalledWith({
      data: {
        idPatient: 'PAT1',
        idResultat: 'res1',
        acte: 'annulation',
        motifAnnulation: 'mauvais_analyte',
        praticienEmail: PRATICIEN,
      },
      select: { id: true },
    });
    expect(prisma.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.annulationResultatBiologique.create.mock.invocationCallOrder[0],
    );
  });

  it('motif hors liste — ou texte libre : 400, rien n’est écrit', async () => {
    for (const motif of ['erreur', 'mauvaise valeur', '', 42]) {
      const response = await POST(requete({ ...ANNULATION, motif }));
      expect(response.status).toBe(400);
      expect((await response.json()).reason).toBe('motif_invalide');
    }
    expect(prisma.annulationResultatBiologique.create).not.toHaveBeenCalled();
  });

  it('une erreur de VALEUR n’est pas un motif d’annulation : c’est une correction (D-124)', async () => {
    const response = await POST(requete({ ...ANNULATION, motif: 'mauvaise_valeur' }));
    expect(response.status).toBe(400);
  });

  it('seul le praticien du dossier annule : 403, rien n’est lu ni écrit', async () => {
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'autre@wellneuro.fr', actif: true, suiviClotureLe: null });
    const response = await POST(requete(ANNULATION));
    expect(response.status).toBe(403);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.annulationResultatBiologique.create).not.toHaveBeenCalled();
  });

  it('résultat hors du dossier : 409 « introuvable », aucun verrou pris', async () => {
    prisma.$executeRaw.mockResolvedValue(0);
    const response = await POST(requete(ANNULATION));
    expect(response.status).toBe(409);
    expect((await response.json()).reason).toBe('annulation_cible_inconnue');
    expect(prisma.annulationResultatBiologique.create).not.toHaveBeenCalled();
  });

  it('une ligne CORRIGÉE ne s’annule pas : c’est la tête du fil qui s’annule', async () => {
    prisma.resultatBiologique.findMany.mockResolvedValue([ligne('res1', null, 1), ligne('res2', 'res1', 2)]);
    const response = await POST(requete(ANNULATION));
    expect(response.status).toBe(409);
    expect((await response.json()).reason).toBe('annulation_pas_tete');
  });

  it('un fil déjà annulé ne s’annule pas deux fois', async () => {
    prisma.annulationResultatBiologique.findMany.mockResolvedValue([ANNULATION_ACTIVE]);
    const response = await POST(requete(ANNULATION));
    expect(response.status).toBe(409);
    expect((await response.json()).reason).toBe('annulation_deja_active');
    expect(prisma.annulationResultatBiologique.create).not.toHaveBeenCalled();
  });

  it('dossier clos : refusé, rien n’est écrit', async () => {
    prisma.patient.findUnique.mockResolvedValue({
      praticienEmail: PRATICIEN,
      actif: false,
      suiviClotureLe: '2026-08-01T00:00:00.000Z',
    });
    const response = await POST(requete(ANNULATION));
    expect(response.status).toBe(409);
    expect(prisma.annulationResultatBiologique.create).not.toHaveBeenCalled();
  });

  it('identifiant malformé : 400', async () => {
    const response = await POST(requete({ ...ANNULATION, idResultat: 'x'.repeat(65) }));
    expect(response.status).toBe(400);
    expect((await response.json()).reason).toBe('cible_invalide');
  });
});

describe('révocation — une fois par annulation, motif fermé (D-294 §4)', () => {
  beforeEach(() => {
    // Le fil de res1 porte l'annulation à révoquer.
    prisma.annulationResultatBiologique.findMany.mockResolvedValue([ANNULATION_ACTIVE]);
  });

  it('consigne la révocation : elle vise l’annulation et recopie son résultat', async () => {
    const response = await POST(requete(REVOCATION));
    expect(response.status).toBe(201);
    expect(prisma.annulationResultatBiologique.create).toHaveBeenCalledWith({
      data: {
        idPatient: 'PAT1',
        idResultat: 'res1',
        acte: 'revocation',
        idAnnulationRevoquee: 'ann1',
        motifRevocation: 'resultat_verifie_exact',
        praticienEmail: PRATICIEN,
      },
      select: { id: true },
    });
  });

  it('l’annulation se cherche DANS LE DOSSIER : une autre est « introuvable »', async () => {
    prisma.annulationResultatBiologique.findFirst.mockResolvedValue(null);
    const response = await POST(requete(REVOCATION));
    expect(response.status).toBe(409);
    expect((await response.json()).reason).toBe('revocation_cible_inconnue');
    expect(prisma.annulationResultatBiologique.findFirst).toHaveBeenCalledWith({
      where: { id: 'ann1', idPatient: 'PAT1', acte: 'annulation' },
      select: { id: true, idResultat: true },
    });
  });

  it('une annulation se révoque une fois', async () => {
    prisma.annulationResultatBiologique.count.mockResolvedValue(1);
    const response = await POST(requete(REVOCATION));
    expect(response.status).toBe(409);
    expect((await response.json()).reason).toBe('revocation_deja_faite');
    expect(prisma.annulationResultatBiologique.create).not.toHaveBeenCalled();
  });

  it('PLACE REPRISE : une mesure vivante à la même clé ⇒ révocation refusée', async () => {
    prisma.resultatBiologique.findMany.mockResolvedValue([ligne('res1', null, 1), ligne('res3', null, 4)]);
    const response = await POST(requete(REVOCATION));
    expect(response.status).toBe(409);
    expect((await response.json()).reason).toBe('revocation_place_reprise');
    expect(prisma.annulationResultatBiologique.create).not.toHaveBeenCalled();
  });

  it('… mais une autre mesure elle-même ANNULÉE ne tient pas la place', async () => {
    prisma.resultatBiologique.findMany.mockResolvedValue([ligne('res1', null, 1), ligne('res3', null, 4)]);
    prisma.annulationResultatBiologique.findMany.mockResolvedValue([
      ANNULATION_ACTIVE,
      { ...ANNULATION_ACTIVE, id: 'ann3', idResultat: 'res3' },
    ]);
    const response = await POST(requete(REVOCATION));
    expect(response.status).toBe(201);
  });

  it('motif de révocation hors liste : 400', async () => {
    const response = await POST(requete({ ...REVOCATION, motif: 'mauvais_analyte' }));
    expect(response.status).toBe(400);
    expect((await response.json()).reason).toBe('motif_invalide');
  });

  it('course perdue sur l’index « une révocation par annulation » : 409, pas 500', async () => {
    prisma.annulationResultatBiologique.create.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }));
    const response = await POST(requete(REVOCATION));
    expect(response.status).toBe(409);
    expect((await response.json()).reason).toBe('revocation_deja_faite');
  });
});

describe('forme', () => {
  it('acte inconnu : 400', async () => {
    const response = await POST(requete({ ...ANNULATION, acte: 'suppression' }));
    expect(response.status).toBe(400);
    expect((await response.json()).reason).toBe('acte_invalide');
  });

  it('corps JSON `null` : 400, jamais 500', async () => {
    const response = await POST(requete(null));
    expect(response.status).toBe(400);
  });

  it('une erreur inattendue rend 500 sans son message', async () => {
    const espion = vi.spyOn(console, 'error').mockImplementation(() => {});
    prisma.annulationResultatBiologique.create.mockRejectedValue(new Error('res1 PAT1 détail'));
    const response = await POST(requete(ANNULATION));
    expect(response.status).toBe(500);
    expect(JSON.stringify(espion.mock.calls)).not.toContain('PAT1');
    espion.mockRestore();
  });
});
