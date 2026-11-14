import { describe, expect, it, vi } from 'vitest';
import { selectionnerBiologie, type LigneBiologieLue } from './biologieExport';

// L'entrée publiée de la biologie ré-exporte aussi des lecteurs de la base :
// le client n'est jamais appelé ici, il ne doit pas s'ouvrir au chargement.
vi.mock('@/lib/prisma', () => ({ prisma: {} }));

// Sélection de la biologie de l'export ([[D-519]] §1-§3) : mesures qui font
// foi, lecture consignée pour un import, silences de l'intervalle.

const LUE = {
  idImport: 'IMP_A',
  intervalleLu: '3,5 - 5,0',
  intervalleNonTranscrit: false,
  uniteLue: 'mmol/L',
  valeurLue: '4.2',
  laboratoireLu: 'Laboratoire A',
};

function ligne(partiel: Partial<LigneBiologieLue> & { id: string }): LigneBiologieLue {
  return {
    analyteCode: 'K',
    analyteLibelle: 'Potassium',
    valeur: '4.2',
    unite: 'mmol/L',
    preleveLe: new Date('2026-09-10T08:00:00.000Z'),
    saisiLe: new Date('2026-09-12T08:00:00.000Z'),
    supersedesResultatId: null,
    source: 'saisie_praticien',
    lue: LUE,
    ...partiel,
  };
}

const AUCUNE = new Map<string, unknown>();
const LU_A = new Set(['IMP_A']);

describe('selectionnerBiologie', () => {
  it('import lu : la mesure entre avec l’intervalle imprimé et son laboratoire', () => {
    const rendu = selectionnerBiologie([ligne({ id: 'R1' })], AUCUNE, LU_A);
    expect(rendu).toEqual({
      nonLues: 0,
      analytes: [{
        analyteCode: 'K',
        libelle: 'Potassium',
        mesures: [{
          preleveLe: new Date('2026-09-10T08:00:00.000Z'),
          valeur: '4.2',
          unite: 'mmol/L',
          intervalle: { texte: '3,5 - 5,0' },
          laboratoire: 'Laboratoire A',
          corrigee: false,
        }],
      }],
    });
  });

  it('import non lu : la mesure est comptée, jamais écrite ; l’analyte vide disparaît', () => {
    const rendu = selectionnerBiologie([ligne({ id: 'R1' })], AUCUNE, new Set());
    expect(rendu).toEqual({ nonLues: 1, analytes: [] });
  });

  it('saisie du praticien : entre sans lecture, intervalle « saisie praticien », laboratoire inconnu', () => {
    const rendu = selectionnerBiologie([ligne({ id: 'R1', lue: null })], AUCUNE, new Set());
    expect(rendu.nonLues).toBe(0);
    expect(rendu.analytes[0].mesures[0]).toMatchObject({
      intervalle: { absence: 'saisie_praticien' },
      laboratoire: null,
    });
  });

  it('autre origine sans ligne lue (`import_labo`) : jamais prise pour une saisie, comptée non lue', () => {
    const rendu = selectionnerBiologie([ligne({ id: 'R1', lue: null, source: 'import_labo' })], AUCUNE, LU_A);
    expect(rendu).toEqual({ nonLues: 1, analytes: [] });
  });

  it('correction d’une valeur importée : seule la tête, lecture jugée sur l’import de la racine', () => {
    const lignes = [
      ligne({ id: 'R1' }),
      ligne({
        id: 'R2', supersedesResultatId: 'R1', lue: null, valeur: '4.4',
        saisiLe: new Date('2026-09-13T08:00:00.000Z'),
      }),
    ];
    const lue = selectionnerBiologie(lignes, AUCUNE, LU_A);
    expect(lue.analytes[0].mesures).toEqual([expect.objectContaining({
      valeur: '4.4',
      corrigee: true,
      intervalle: { absence: 'correction' },
      laboratoire: 'Laboratoire A',
    })]);
    // Corriger ne dispense pas de lire : racine non lue, tête écartée.
    expect(selectionnerBiologie(lignes, AUCUNE, new Set())).toEqual({ nonLues: 1, analytes: [] });
  });

  it('fil annulé : n’entre pas, et n’est pas compté comme non lu', () => {
    const annulations = new Map([['R1', { id: 'A1' }]]);
    expect(selectionnerBiologie([ligne({ id: 'R1' })], annulations, new Set())).toEqual({ nonLues: 0, analytes: [] });
  });

  it('silences de l’intervalle : non imprimé, non transcrit, unité ou valeur retouchée', () => {
    const cas: [Partial<LigneBiologieLue>, string][] = [
      [{ lue: { ...LUE, intervalleLu: null } }, 'non_imprime'],
      [{ lue: { ...LUE, intervalleLu: null, intervalleNonTranscrit: true } }, 'non_transcrit'],
      [{ unite: 'g/L' }, 'ecart_ligne_lue'],
      [{ valeur: '4.3' }, 'ecart_ligne_lue'],
    ];
    for (const [partiel, absence] of cas) {
      const rendu = selectionnerBiologie([ligne({ id: 'R1', ...partiel })], AUCUNE, LU_A);
      expect(rendu.analytes[0].mesures[0].intervalle, absence).toEqual({ absence });
    }
  });

  it('série : ordre des prélèvements, analytes dans l’ordre des codes', () => {
    const rendu = selectionnerBiologie([
      ligne({ id: 'R2', preleveLe: new Date('2026-09-20T08:00:00.000Z') }),
      ligne({ id: 'R1' }),
      ligne({ id: 'R3', analyteCode: 'FER', analyteLibelle: 'Fer sérique', lue: null }),
    ], AUCUNE, LU_A);
    expect(rendu.analytes.map(a => a.analyteCode)).toEqual(['FER', 'K']);
    expect(rendu.analytes[1].mesures.map(m => m.preleveLe.toISOString())).toEqual([
      '2026-09-10T08:00:00.000Z',
      '2026-09-20T08:00:00.000Z',
    ]);
  });
});
