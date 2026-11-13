import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({ prisma: {} }));

import { assemblerAtelier } from './lecture';
import { contexteDuDepot, RUBRIQUES_OPTION, type ContexteAtelier } from './structure';

// L'assemblage de l'atelier (D-480 §3) : la dernière version par couple, l'état
// dérivé, les textes d'options que la structure ne déclare plus. Lignes et
// identifiants synthétiques.

const STRUCTURE = 'b'.repeat(64);
const renvois = Object.fromEntries(RUBRIQUES_OPTION.map(r => [r, r === 'dose' ? ['information_manquante'] : []])) as never;
const contexte: ContexteAtelier = {
  empreinteStructure: STRUCTURE,
  etatStructure: 'non_signee',
  options: [{ id: 'OPT_BANC_A', hypothese: 'HYP_BANC', populations: ['POP_BANC'], renvois }],
};

const ligne = (optionId: string, rubrique: string, numero: number, extra: Record<string, unknown> = {}) => ({
  id: `l${optionId}${rubrique}${numero}`.replace(/[^a-z0-9]/gi, '').slice(0, 60),
  optionId,
  rubrique,
  numero,
  texte: `texte ${numero}`,
  texteSha256: String(numero).repeat(64).slice(0, 64),
  structureSha256: STRUCTURE,
  auteur: 'responsable@exemple.fr',
  creeLe: new Date('2026-11-13T10:00:00Z'),
  actes: [],
  ...extra,
});

describe('assemblage de l’atelier (D-480 §3)', () => {
  it('chaque option porte ses neuf rubriques, dans l’ordre de la migration, avec ses renvois', () => {
    const atelier = assemblerAtelier([], contexte);
    expect(atelier.options).toHaveLength(1);
    expect(atelier.options[0].rubriques.map(r => r.rubrique)).toEqual([...RUBRIQUES_OPTION]);
    expect(atelier.options[0].rubriques.find(r => r.rubrique === 'dose')?.renvois).toEqual(['information_manquante']);
    expect(atelier.options[0].rubriques.every(r => r.etat.etat === 'vide' && r.version === null && r.etatActes === null)).toBe(true);
    expect(atelier.structure).toEqual({ etat: 'non_signee', empreinte: STRUCTURE, nombreOptions: 1 });
  });

  it('la DERNIÈRE version (plus grand numéro) masque les précédentes, même validées', () => {
    const validee = { ordre: BigInt(1), acte: 'validee', empreinte: '1'.repeat(64), validateur: 'r', relectureIntegrale: true, motif: null, le: new Date() };
    const atelier = assemblerAtelier(
      [ligne('OPT_BANC_A', 'dose', 2), ligne('OPT_BANC_A', 'dose', 1, { actes: [validee] })],
      contexte,
    );
    const dose = atelier.options[0].rubriques.find(r => r.rubrique === 'dose');
    expect(dose?.version).toMatchObject({ numero: 2, nombreVersions: 2, dernierActe: null, jeton: null });
    expect(dose?.etat).toEqual({ etat: 'a_valider' });
  });

  it('une version sur une autre structure est « à relire » ; ses actes restent lus pour le geste', () => {
    const atelier = assemblerAtelier([ligne('OPT_BANC_A', 'duree', 1, { structureSha256: 'c'.repeat(64) })], contexte);
    const duree = atelier.options[0].rubriques.find(r => r.rubrique === 'duree');
    expect(duree?.etat).toEqual({ etat: 'a_relire' });
    expect(duree?.etatActes).toEqual({ etat: 'a_valider' });
  });

  it('les textes d’une option que la structure ne déclare pas sont listés à part, hors structure', () => {
    const atelier = assemblerAtelier([ligne('OPT_BANC_Z', 'precautions', 1), ligne('OPT_BANC_Z', 'dose', 1)], contexte);
    expect(atelier.horsStructure).toHaveLength(1);
    expect(atelier.horsStructure[0].optionId).toBe('OPT_BANC_Z');
    expect(atelier.horsStructure[0].rubriques.map(r => r.rubrique)).toEqual(['dose', 'precautions']);
    expect(atelier.horsStructure[0].rubriques.every(r => r.etat.etat === 'hors_structure')).toBe(true);
  });

  it('le dépôt : structure du besoin 2 encore vide et non signée — l’atelier ne liste aucune option', () => {
    const depot = contexteDuDepot();
    expect(depot.options).toEqual([]);
    expect(depot.etatStructure).toBe('non_signee');
    expect(depot.empreinteStructure).toMatch(/^[0-9a-f]{64}$/);
  });
});
