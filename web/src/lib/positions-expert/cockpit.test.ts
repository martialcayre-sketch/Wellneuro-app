import { afterEach, describe, expect, it, vi } from 'vitest';
import { arbitragesDesConflits, lireArbitragesAuCockpit } from './cockpit';
import type { ArbitrageLu, CoupleLu } from './lecture';

// `lecture.ts` importe le client Prisma au chargement : le banc injecte sa
// lecture, la base n'est jamais touchée.
vi.mock('@/lib/prisma', () => ({ prisma: {} }));

const tete = (id: string, retenu: Partial<ArbitrageLu>): ArbitrageLu => ({
  id,
  ordre: id.replace(/\D/g, '') || '1',
  acte: 'pose',
  idArbitrageRemplace: null,
  claimRetenu: null,
  idPositionVersion: null,
  positionRetenue: null,
  motif: `motif ${id}`,
  auteur: 'praticien',
  le: '2026-11-07T10:00:00.000Z',
  ...retenu,
});

const couple = (conflitId: string, ficheId: string, t: ArbitrageLu | null, causes: CoupleLu['causesARelire'] = []): CoupleLu => ({
  conflitId,
  ficheId,
  tete: t,
  causesARelire: causes,
  historique: t ? [t] : [],
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('arbitrages au cockpit — [[D-439]] A2, arbitrage 6', () => {
  // LE BANC D'A2 : deux arbitrages DIFFÉRENTS d'un même conflit, sur deux
  // fiches. Les deux sont listés, chacun étiqueté par sa fiche ; aucun n'est
  // retenu pour le dossier — le type n'a même pas de champ pour le dire.
  it('deux arbitrages d’un même conflit sur deux fiches : les deux listés, étiquetés, aucun retenu', () => {
    const couples = [
      couple('CS-BIO-01', 'FU_ZINC_P7', tete('a2', { claimRetenu: 'WN-CL-0387-013@v1.0' })),
      couple('CS-BIO-01', 'FU_MG_P7', tete('a1', { claimRetenu: 'WN-CL-0312-018@v1.0' })),
    ];
    const liste = arbitragesDesConflits(couples, ['CS-BIO-01']);

    expect(liste.map(a => [a.ficheId, a.retenu])).toEqual([
      ['FU_MG_P7', 'WN-CL-0312-018@v1.0'],
      ['FU_ZINC_P7', 'WN-CL-0387-013@v1.0'],
    ]);
    // Deux positions opposées restent côte à côte : l'outil ne choisit pas.
    expect(new Set(liste.map(a => a.retenu)).size).toBe(2);
    for (const a of liste) {
      expect(Object.keys(a).sort()).toEqual(['aRelire', 'conflitId', 'ficheId', 'le', 'motif', 'retenu']);
    }
  });

  it('l’ordre est celui des identifiants, jamais une préférence', () => {
    const couples = [
      couple('CS-BIO-01', 'FU_VITD_P7', tete('a1', { claimRetenu: 'WN-CL-0312-018@v1.0' })),
      couple('CS-BIO-01', 'FU_B9B12_P8', tete('a9', { claimRetenu: 'WN-CL-0387-013@v1.0' })),
    ];
    expect(arbitragesDesConflits(couples, ['CS-BIO-01']).map(a => a.ficheId)).toEqual(['FU_B9B12_P8', 'FU_VITD_P7']);
  });

  it('seuls les conflits constatés pour ce dossier ; un couple révoqué (sans tête) ne se liste pas', () => {
    const couples = [
      couple('CS-BIO-01', 'FU_MG_P7', null),
      couple('CS-ZINC-02', 'FU_ZINC_P5', tete('a3', { claimRetenu: 'WN-CL-0520-003@v1.0' })),
    ];
    expect(arbitragesDesConflits(couples, ['CS-BIO-01'])).toEqual([]);
  });

  it('une position retenue s’affiche par sa référence ; une tête « à relire » le dit', () => {
    const couples = [
      couple('CS-BIO-01', 'FU_MG_P7', tete('a4', { idPositionVersion: 'v', positionRetenue: 'WN-PE-0001@v1.0' }), ['position_retiree']),
    ];
    expect(arbitragesDesConflits(couples, ['CS-BIO-01'])).toEqual([
      expect.objectContaining({ ficheId: 'FU_MG_P7', retenu: 'WN-PE-0001@v1.0', aRelire: true }),
    ]);
  });

  it('drapeau éteint : aucune lecture, aucun arbitrage', async () => {
    vi.stubEnv('WN_POSITIONS_EXPERT', '');
    const lire = vi.fn();
    expect(await lireArbitragesAuCockpit(['CS-BIO-01'], lire)).toEqual([]);
    expect(lire).not.toHaveBeenCalled();
  });

  it('drapeau allumé sans conflit constaté : aucune lecture', async () => {
    vi.stubEnv('WN_POSITIONS_EXPERT', 'true');
    const lire = vi.fn();
    expect(await lireArbitragesAuCockpit([], lire)).toEqual([]);
    expect(lire).not.toHaveBeenCalled();
  });

  it('drapeau allumé, conflit constaté : les arbitrages se lisent', async () => {
    vi.stubEnv('WN_POSITIONS_EXPERT', 'true');
    const lire = vi.fn(async () => ({
      couples: [couple('CS-BIO-01', 'FU_MG_P7', tete('a1', { claimRetenu: 'WN-CL-0312-018@v1.0' }))],
    }));
    expect(await lireArbitragesAuCockpit(['CS-BIO-01'], lire)).toHaveLength(1);
    expect(lire).toHaveBeenCalledTimes(1);
  });
});
