import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Le lecteur du bloc de biologie ([[D-513]] §2, §11) : drapeau éteint, AUCUNE
// lecture ; allumé, il lit la fiche et rend le bloc.

const { prisma, annulationsActives } = vi.hoisted(() => ({
  prisma: { resultatBiologique: { findMany: vi.fn() } },
  annulationsActives: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/biology-library/publie', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/biology-library/publie')>()),
  annulationsActives,
}));

import { lireBlocBiologiePourSynthese } from './blocBiologieSyntheseService';

const DRAPEAUX = ['WN_SYNTHESE_BIOLOGIE_ENABLED', 'WN_CB_RESULTS_ENABLED', 'WN_CB_ENABLED'] as const;

function allumer(valeur = 'true') {
  vi.stubEnv('WN_SYNTHESE_BIOLOGIE_ENABLED', valeur);
  vi.stubEnv('WN_CB_RESULTS_ENABLED', 'true');
  vi.stubEnv('WN_CB_ENABLED', 'true');
}

const LIGNE = {
  id: 'r1',
  analyteCode: 'FERRITINE',
  valeur: { toFixed: () => '41' },
  unite: 'µg/L',
  preleveLe: new Date('2026-10-08T06:45:00Z'),
  source: 'saisie_praticien',
  saisiLe: new Date('2026-10-09T08:00:00Z'),
  supersedesResultatId: null,
  analyte: { libelle: 'Ferritine' },
  ligneCandidate: null,
  contextesPrelevement: [],
};

describe('lireBlocBiologiePourSynthese', () => {
  beforeEach(() => {
    prisma.resultatBiologique.findMany.mockReset();
    annulationsActives.mockReset();
    for (const d of DRAPEAUX) vi.stubEnv(d, '');
  });
  afterEach(() => vi.unstubAllEnvs());

  it('drapeau absent : null, aucune requête', async () => {
    expect(await lireBlocBiologiePourSynthese('p1')).toBeNull();
    expect(prisma.resultatBiologique.findMany).not.toHaveBeenCalled();
    expect(annulationsActives).not.toHaveBeenCalled();
  });

  it('une autre valeur que `true` n’allume pas', async () => {
    allumer('1');
    expect(await lireBlocBiologiePourSynthese('p1')).toBeNull();
    expect(prisma.resultatBiologique.findMany).not.toHaveBeenCalled();
  });

  it('l’étage des résultats éteint suffit à fermer', async () => {
    allumer();
    vi.stubEnv('WN_CB_RESULTS_ENABLED', '');
    expect(await lireBlocBiologiePourSynthese('p1')).toBeNull();
    expect(prisma.resultatBiologique.findMany).not.toHaveBeenCalled();
  });

  it('allumé : lit le dossier, sans marquage ni commentaire, et rend le bloc', async () => {
    allumer();
    prisma.resultatBiologique.findMany.mockResolvedValue([LIGNE]);
    annulationsActives.mockResolvedValue(new Map());
    const trace = await lireBlocBiologiePourSynthese('p1');
    const arg = prisma.resultatBiologique.findMany.mock.calls[0][0];
    expect(arg.where).toEqual({ idPatient: 'p1' });
    const lus = JSON.stringify(arg.select).toLowerCase();
    for (const interdit of ['marquage', 'commentaire', 'statut', 'constat', 'plage']) {
      expect(lus).not.toContain(interdit);
    }
    expect(trace?.texte).toContain('Ferritine — 1 prélèvement.');
    expect(trace?.formes.valeursUnites).toEqual([{ valeur: '41', unite: 'µg/L' }]);
  });

  it('allumé, dossier vide : null', async () => {
    allumer();
    prisma.resultatBiologique.findMany.mockResolvedValue([]);
    annulationsActives.mockResolvedValue(new Map());
    expect(await lireBlocBiologiePourSynthese('p1')).toBeNull();
  });
});
