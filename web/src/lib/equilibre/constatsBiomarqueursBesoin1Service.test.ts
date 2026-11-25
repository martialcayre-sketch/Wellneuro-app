import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const findMany = vi.fn();
const annulations = vi.fn();

vi.mock('@/lib/prisma', () => ({ prisma: { resultatBiologique: { findMany: (...a: unknown[]) => findMany(...a) } } }));
vi.mock('@/lib/biology-library/publie', async () => {
  const { derniersResultatsParAnalyte } = await import('@/lib/biology-library/derniersResultats');
  return {
    annulationsActives: (...a: unknown[]) => annulations(...a),
    derniersResultatsParAnalyte,
    isCbResultsEnabled: (await import('@/lib/biology-library/featureFlag')).isCbResultsEnabled,
  };
});

import { lireConstatsBiomarqueursBesoin1 } from './constatsBiomarqueursBesoin1Service';

// LA LECTURE EN BASE DES DEUX BIOMARQUEURS ([[D-548]] §2.2, [[D-516]] §5.2).

const ligne = (id: string, analyteCode: string, valeur: string, preleveLe: string, extra: Record<string, unknown> = {}) => ({
  id,
  analyteCode,
  valeur: { toString: () => valeur },
  unite: '%',
  preleveLe: new Date(preleveLe),
  source: 'saisie_praticien',
  saisiLe: new Date(preleveLe),
  supersedesResultatId: null,
  ...extra,
});

describe('lireConstatsBiomarqueursBesoin1', () => {
  beforeEach(() => {
    findMany.mockReset();
    annulations.mockReset();
    annulations.mockResolvedValue(new Map());
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rayon des résultats fermé : aucune lecture, et la base n'est pas interrogée", async () => {
    vi.stubEnv('WN_CB_ENABLED', '');
    vi.stubEnv('WN_CB_RESULTS_ENABLED', '');
    expect(await lireConstatsBiomarqueursBesoin1('PAT-X')).toBeNull();
    expect(findMany).not.toHaveBeenCalled();
  });

  describe('rayon ouvert', () => {
    beforeEach(() => {
      vi.stubEnv('WN_CB_ENABLED', 'true');
      vi.stubEnv('WN_CB_RESULTS_ENABLED', 'true');
    });

    it("ne demande que les deux analytes lus — jamais l'indice HOMA", async () => {
      findMany.mockResolvedValue([]);
      await lireConstatsBiomarqueursBesoin1('PAT-X');
      const where = findMany.mock.calls[0][0].where;
      expect(where.analyteCode.in).toEqual(['BIO_HBA1C', 'BIO_INDEX_OMEGA3']);
    });

    it('le prélèvement le plus récent fait foi, un constat par analyte', async () => {
      findMany.mockResolvedValue([
        ligne('a', 'BIO_HBA1C', '7.0', '2026-01-10T08:00:00Z'),
        ligne('b', 'BIO_HBA1C', '5.4', '2026-06-10T08:00:00Z'),
        ligne('c', 'BIO_INDEX_OMEGA3', '9', '2026-06-10T08:00:00Z'),
      ]);
      const constats = (await lireConstatsBiomarqueursBesoin1('PAT-X'))!;
      expect(constats.map(c => [c.analyteCode, c.valeur, c.lecture])).toEqual([
        ['BIO_HBA1C', '5.4', 'sous_reference'],
        ['BIO_INDEX_OMEGA3', '9', 'au_dessus_reference'],
      ]);
    });

    it('une ligne corrigée ne fait plus foi : la correction la remplace', async () => {
      findMany.mockResolvedValue([
        ligne('a', 'BIO_HBA1C', '9.0', '2026-06-10T08:00:00Z'),
        ligne('a2', 'BIO_HBA1C', '5.0', '2026-06-10T08:00:00Z', {
          supersedesResultatId: 'a',
          saisiLe: new Date('2026-06-11T08:00:00Z'),
        }),
      ]);
      const constats = (await lireConstatsBiomarqueursBesoin1('PAT-X'))!;
      expect(constats).toHaveLength(1);
      expect(constats[0].valeur).toBe('5.0');
    });

    it("un fil annulé ne concourt pas : la mesure d'avant revient", async () => {
      findMany.mockResolvedValue([
        ligne('a', 'BIO_HBA1C', '5.5', '2026-01-10T08:00:00Z'),
        ligne('b', 'BIO_HBA1C', '8.0', '2026-06-10T08:00:00Z'),
      ]);
      annulations.mockResolvedValue(new Map([['b', { id: 'ann-1' }]]));
      const constats = (await lireConstatsBiomarqueursBesoin1('PAT-X'))!;
      expect(constats[0].valeur).toBe('5.5');
    });

    it('une lecture en échec rend null — jamais « aucun résultat »', async () => {
      const bruit = vi.spyOn(console, 'error').mockImplementation(() => {});
      findMany.mockRejectedValue(new Error('base indisponible'));
      expect(await lireConstatsBiomarqueursBesoin1('PAT-X')).toBeNull();
      bruit.mockRestore();
    });
  });
});
