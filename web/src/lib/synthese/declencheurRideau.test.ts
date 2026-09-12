import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma, preconditionsT0PourPatient, preparerGeneration, genererSynthesePersistee } =
  vi.hoisted(() => ({
    prisma: {
      patient: { findUnique: vi.fn() },
      syntheseIA: { findMany: vi.fn() },
    },
    preconditionsT0PourPatient: vi.fn(),
    preparerGeneration: vi.fn(),
    genererSynthesePersistee: vi.fn(),
  }));

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/clinical-engine/preconditionsT0Prisma', () => ({ preconditionsT0PourPatient }));
vi.mock('./generation', () => ({ preparerGeneration, genererSynthesePersistee }));

import {
  SOURCE_PREMIER_RIDEAU,
  SOURCE_SECOND_RIDEAU,
  genererSiRideauFerme,
} from './declencheurRideau';
import type { RequestContext } from '@/lib/observability/types';

const CONTEXTE = { correlationId: 'cor_test' } as unknown as RequestContext;

/** Les deux conditions que ce module lit, et rien d'autre. */
function preconditions(rideauT0: boolean, secondRideau: boolean) {
  return {
    dures: [
      { id: 'rideau_t0', libelle: '', satisfaite: rideauT0, detail: null },
      { id: 'second_rideau', libelle: '', satisfaite: secondRideau, detail: null },
    ],
    souples: [],
    bloquant: !rideauT0,
    contournementsRequis: [],
  };
}

function marqueurs(...sources: string[]) {
  return sources.map(source => ({ donneesEntree: { source } }));
}

async function declencher() {
  return genererSiRideauFerme('PAT_TEST', 'patient@example.test', CONTEXTE);
}

describe('genererSiRideauFerme', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('WN_SYNTHESE_PAR_RIDEAU', 'true');
    prisma.patient.findUnique.mockResolvedValue({ actif: true, suiviClotureLe: null });
    prisma.syntheseIA.findMany.mockResolvedValue([]);
    preconditionsT0PourPatient.mockResolvedValue(preconditions(true, false));
    preparerGeneration.mockResolvedValue({ ok: true, args: { idPatient: 'PAT_TEST' } });
    genererSynthesePersistee.mockResolvedValue({ idSynthese: 'SYN_AUTO' });
  });

  // DRAPEAU D'ABORD, et AVANT toute lecture : ce qui s'ouvre est un appel au
  // modèle qu'aucun humain n'a demandé.
  it('drapeau éteint : ne lit rien, ne génère rien', async () => {
    vi.stubEnv('WN_SYNTHESE_PAR_RIDEAU', '');
    expect(await declencher()).toEqual({ genere: false, raison: 'drapeau_eteint' });
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
    expect(preconditionsT0PourPatient).not.toHaveBeenCalled();
  });

  it('dossier au suivi clôturé : aucun brouillon neuf', async () => {
    prisma.patient.findUnique.mockResolvedValueOnce({
      actif: true, suiviClotureLe: new Date('2026-02-01'),
    });
    expect(await declencher()).toEqual({ genere: false, raison: 'dossier_clos' });
    expect(genererSynthesePersistee).not.toHaveBeenCalled();
  });

  it('rideau incomplet : rien, et la matière n’est même pas assemblée', async () => {
    preconditionsT0PourPatient.mockResolvedValueOnce(preconditions(false, false));
    expect(await declencher()).toEqual({ genere: false, raison: 'rideau_incomplet' });
    expect(preparerGeneration).not.toHaveBeenCalled();
  });

  it('premier rideau fermé : génère un brouillon marqué', async () => {
    const verdict = await declencher();

    expect(verdict).toEqual({ genere: true, rideau: 'premier', idSynthese: 'SYN_AUTO' });
    expect(genererSynthesePersistee).toHaveBeenCalledWith(
      expect.objectContaining({ source: SOURCE_PREMIER_RIDEAU }),
      expect.anything(),
    );
  });

  // L'ORDRE EST CELUI DU PARCOURS : le second rideau ne peut pas se fermer avant
  // le premier, et le servir d'abord produirait la seconde synthèse sur un
  // dossier qui n'a jamais eu la première.
  it('second rideau rendu, premier déjà servi : génère le second', async () => {
    prisma.syntheseIA.findMany.mockResolvedValueOnce(marqueurs(SOURCE_PREMIER_RIDEAU));
    preconditionsT0PourPatient.mockResolvedValueOnce(preconditions(true, true));

    const verdict = await declencher();

    expect(verdict).toEqual({ genere: true, rideau: 'second', idSynthese: 'SYN_AUTO' });
    expect(genererSynthesePersistee).toHaveBeenCalledWith(
      expect.objectContaining({ source: SOURCE_SECOND_RIDEAU }),
      expect.anything(),
    );
  });

  it('premier servi, second rideau pas encore rendu : rien', async () => {
    prisma.syntheseIA.findMany.mockResolvedValueOnce(marqueurs(SOURCE_PREMIER_RIDEAU));
    expect(await declencher()).toEqual({ genere: false, raison: 'deja_genere' });
    expect(genererSynthesePersistee).not.toHaveBeenCalled();
  });

  // IDEMPOTENT PAR MARQUEUR : c'est ce qui empêche une génération par
  // questionnaire rendu — le bruit même que ce lot supprime.
  it('les deux rideaux servis : rien, quoi qu’il arrive ensuite', async () => {
    prisma.syntheseIA.findMany.mockResolvedValue(
      marqueurs(SOURCE_PREMIER_RIDEAU, SOURCE_SECOND_RIDEAU),
    );
    preconditionsT0PourPatient.mockResolvedValue(preconditions(true, true));

    expect(await declencher()).toEqual({ genere: false, raison: 'deja_genere' });
    expect(await declencher()).toEqual({ genere: false, raison: 'deja_genere' });
    expect(genererSynthesePersistee).not.toHaveBeenCalled();
  });

  it('dossier sans passation exploitable : refus typé, aucun appel au modèle', async () => {
    preparerGeneration.mockResolvedValueOnce({ ok: false, raison: 'aucune_passation' });
    expect(await declencher()).toEqual({ genere: false, raison: 'aucune_passation' });
    expect(genererSynthesePersistee).not.toHaveBeenCalled();
  });

  // NE JAMAIS LEVER : la soumission du patient a réussi, et son parcours ne doit
  // pas porter l'échec d'un travail qu'il n'a pas demandé.
  it('un échec de génération se rend, il ne se propage pas', async () => {
    genererSynthesePersistee.mockRejectedValueOnce(new Error('API indisponible'));
    await expect(declencher()).resolves.toEqual({ genere: false, raison: 'echec' });
  });
});
