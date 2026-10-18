import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Banc de la route du statut posé ([[D-322]], F58). La base refuse ce que la
// route refuse (contrat `statuts_poses_resultats_biologiques_v1_negatif.sql`,
// banc à deux sessions) ; ce banc-ci éprouve que la route le DIT, nommé, et
// n'écrit rien quand elle refuse.

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    resultatBiologique: { findFirst: vi.fn(), findMany: vi.fn() },
    annulationResultatBiologique: { findMany: vi.fn() },
    statutPoseResultatBiologique: { findFirst: vi.fn(), create: vi.fn() },
    journalAccesDossier: { create: vi.fn() },
    $transaction: vi.fn(),
    $executeRaw: vi.fn(),
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { POST } from './route';
import { STATUTS_POSES } from '@/lib/biology-library/statutPoseListe';

const PRATICIEN = 'praticien@wellneuro.fr';
const PRELEVE = new Date('2026-09-01T08:00:00.000Z');

function requete(body: unknown): Request {
  return new Request('http://localhost/api/praticien/biologie/resultats/statuts', {
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

const POSE = { idPatient: 'PAT1', idResultat: 'res1', acte: 'pose', statut: 'a_suivre' };
const RETRAIT = { idPatient: 'PAT1', idResultat: 'res1', acte: 'retrait' };

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
  // Par défaut : aucun acte sur la ligne, « sans statut posé ».
  prisma.statutPoseResultatBiologique.findFirst.mockResolvedValue(null);
  prisma.statutPoseResultatBiologique.create.mockResolvedValue({ id: 'nouvel_acte' });
});

afterEach(() => {
  delete process.env.WN_CB_ENABLED;
  delete process.env.WN_CB_RESULTS_ENABLED;
});

describe('pose — un acte en ajout seul, statut de la liste fermée (D-322 §1-§3)', () => {
  it('consigne la pose : statut de la liste, auteur = la session, après les verrous', async () => {
    const response = await POST(requete({ ...POSE, praticienEmail: 'pirate@exemple.fr', acteLe: '2020-01-01' }));
    expect(response.status).toBe(201);
    expect(prisma.statutPoseResultatBiologique.create).toHaveBeenCalledWith({
      data: {
        idPatient: 'PAT1',
        idResultat: 'res1',
        acte: 'pose',
        statut: 'a_suivre',
        praticienEmail: PRATICIEN,
      },
      select: { id: true },
    });
    expect(prisma.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.statutPoseResultatBiologique.findFirst.mock.invocationCallOrder[0],
    );
  });

  it('les six statuts de la liste passent', async () => {
    for (const statut of STATUTS_POSES) {
      const response = await POST(requete({ ...POSE, statut }));
      expect(response.status).toBe(201);
    }
  });

  it('statut hors liste — un jugement de la valeur, ou un texte libre : 400, rien n’est écrit', async () => {
    for (const statut of ['normal', 'a_examiner', 'urgent', 'à suivre', '', 42, null, undefined]) {
      const response = await POST(requete({ ...POSE, statut }));
      expect(response.status).toBe(400);
      expect((await response.json()).reason).toBe('statut_invalide');
    }
    expect(prisma.statutPoseResultatBiologique.create).not.toHaveBeenCalled();
  });

  it('reposer le statut ACTIF : 409, rien n’est écrit', async () => {
    prisma.statutPoseResultatBiologique.findFirst.mockResolvedValue({ statut: 'a_suivre' });
    const response = await POST(requete(POSE));
    expect(response.status).toBe(409);
    expect((await response.json()).reason).toBe('statut_deja_actif');
    expect(prisma.statutPoseResultatBiologique.create).not.toHaveBeenCalled();
  });

  it('un autre statut REMPLACE l’actif : la pose passe', async () => {
    prisma.statutPoseResultatBiologique.findFirst.mockResolvedValue({ statut: 'donnee_a_verifier' });
    const response = await POST(requete(POSE));
    expect(response.status).toBe(201);
  });

  it('le statut actif se lit sur le DERNIER acte de la ligne, sous les verrous', async () => {
    await POST(requete(POSE));
    expect(prisma.statutPoseResultatBiologique.findFirst).toHaveBeenCalledWith({
      where: { idResultat: 'res1' },
      orderBy: { ordre: 'desc' },
      select: { statut: true },
    });
  });

  it('une ligne CORRIGÉE ne reçoit pas de statut : c’est la valeur qui fait foi qui le porte', async () => {
    prisma.resultatBiologique.findMany.mockResolvedValue([ligne('res1', null, 1), ligne('res2', 'res1', 2)]);
    const response = await POST(requete(POSE));
    expect(response.status).toBe(409);
    expect((await response.json()).reason).toBe('statut_pas_tete');
    expect(prisma.statutPoseResultatBiologique.create).not.toHaveBeenCalled();
  });

  it('un résultat ANNULÉ ne reçoit pas de statut — le refus de la route seule', async () => {
    prisma.annulationResultatBiologique.findMany.mockResolvedValue([
      {
        id: 'ann1',
        idResultat: 'res1',
        motifAnnulation: 'mauvais_analyte',
        praticienEmail: PRATICIEN,
        acteLe: new Date('2026-09-03T10:00:00.000Z'),
      },
    ]);
    const response = await POST(requete(POSE));
    expect(response.status).toBe(409);
    expect((await response.json()).reason).toBe('statut_resultat_annule');
    expect(prisma.statutPoseResultatBiologique.create).not.toHaveBeenCalled();
  });

  it('résultat hors du dossier : 409 « introuvable », rien n’est lu ni écrit', async () => {
    prisma.$executeRaw.mockResolvedValue(0);
    const response = await POST(requete(POSE));
    expect(response.status).toBe(409);
    expect((await response.json()).reason).toBe('statut_cible_inconnue');
    expect(prisma.statutPoseResultatBiologique.findFirst).not.toHaveBeenCalled();
    expect(prisma.statutPoseResultatBiologique.create).not.toHaveBeenCalled();
  });

  it('seul le praticien du dossier pose un statut : 403, rien n’est écrit', async () => {
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'autre@wellneuro.fr', actif: true, suiviClotureLe: null });
    const response = await POST(requete(POSE));
    expect(response.status).toBe(403);
    expect(prisma.statutPoseResultatBiologique.create).not.toHaveBeenCalled();
  });

  it('dossier clos : refusé, rien n’est écrit', async () => {
    prisma.patient.findUnique.mockResolvedValue({
      praticienEmail: PRATICIEN,
      actif: false,
      suiviClotureLe: '2026-08-01T00:00:00.000Z',
    });
    const response = await POST(requete(POSE));
    expect(response.status).toBe(409);
    expect(prisma.statutPoseResultatBiologique.create).not.toHaveBeenCalled();
  });

  it('identifiant malformé : 400', async () => {
    for (const idResultat of ['x'.repeat(65), '', '   ', 42]) {
      const response = await POST(requete({ ...POSE, idResultat }));
      expect(response.status).toBe(400);
      expect((await response.json()).reason).toBe('cible_invalide');
    }
  });
});

describe('retrait — un acte daté, qui ramène à « sans statut posé » (D-322 §2)', () => {
  it('consigne le retrait d’un statut actif : aucun statut dans l’acte', async () => {
    prisma.statutPoseResultatBiologique.findFirst.mockResolvedValue({ statut: 'a_suivre' });
    const response = await POST(requete(RETRAIT));
    expect(response.status).toBe(201);
    expect(prisma.statutPoseResultatBiologique.create).toHaveBeenCalledWith({
      data: { idPatient: 'PAT1', idResultat: 'res1', acte: 'retrait', statut: null, praticienEmail: PRATICIEN },
      select: { id: true },
    });
  });

  it('retirer sans statut posé — aucun acte, ou après un retrait : 409', async () => {
    for (const dernier of [null, { statut: null }]) {
      prisma.statutPoseResultatBiologique.findFirst.mockResolvedValue(dernier);
      const response = await POST(requete(RETRAIT));
      expect(response.status).toBe(409);
      expect((await response.json()).reason).toBe('statut_aucun_a_retirer');
    }
    expect(prisma.statutPoseResultatBiologique.create).not.toHaveBeenCalled();
  });

  it('un retrait ne porte pas de statut : 400', async () => {
    const response = await POST(requete({ ...RETRAIT, statut: 'a_suivre' }));
    expect(response.status).toBe(400);
    expect((await response.json()).reason).toBe('statut_invalide');
  });

  it('une ligne CORRIGÉE ne reçoit pas de retrait : son historique est figé', async () => {
    prisma.resultatBiologique.findMany.mockResolvedValue([ligne('res1', null, 1), ligne('res2', 'res1', 2)]);
    prisma.statutPoseResultatBiologique.findFirst.mockResolvedValue({ statut: 'a_suivre' });
    const response = await POST(requete(RETRAIT));
    expect((await response.json()).reason).toBe('statut_pas_tete');
  });
});

describe('le reste', () => {
  it('acte inconnu : 400', async () => {
    const response = await POST(requete({ ...POSE, acte: 'annulation' }));
    expect(response.status).toBe(400);
    expect((await response.json()).reason).toBe('acte_invalide');
  });

  it('corps JSON `null` : 400, jamais 500', async () => {
    const response = await POST(requete(null));
    expect(response.status).toBe(400);
  });

  it('une erreur inattendue rend 500 sans son message', async () => {
    const espion = vi.spyOn(console, 'error').mockImplementation(() => {});
    prisma.statutPoseResultatBiologique.create.mockRejectedValue(new Error('res1 PAT1 détail'));
    const response = await POST(requete(POSE));
    expect(response.status).toBe(500);
    expect((await response.json()).reason).toBe('server_error');
    expect(JSON.stringify(espion.mock.calls)).not.toContain('PAT1');
    espion.mockRestore();
  });
});
