import { describe, expect, it } from 'vitest';
import { lignesInbox } from './inbox';

const NOMS = new Map([
  ['P-SOPHIE', 'Sophie Nicola'],
  ['P-MICHEL', 'Michel Dogné'],
]);

describe('lignesInbox', () => {
  it('groupe par patient : une ligne, nombre, dernière date et derniers titres', () => {
    const lignes = lignesInbox(
      [
        { idPatient: 'P-SOPHIE', titre: 'Sommeil', dateReponse: new Date('2026-07-14T08:00:00.000Z') },
        { idPatient: 'P-SOPHIE', titre: 'Plaintes', dateReponse: new Date('2026-07-15T08:00:00.000Z') },
        { idPatient: 'P-MICHEL', titre: 'Alimentaire', dateReponse: new Date('2026-07-13T08:00:00.000Z') },
      ],
      new Map(),
      NOMS,
    );
    // Tri par dernière date desc : Sophie (15) avant Michel (13).
    expect(lignes.map(l => l.patient)).toEqual(['Sophie Nicola', 'Michel Dogné']);
    const sophie = lignes[0];
    expect(sophie.nb).toBe(2);
    expect(sophie.derniereDate).toBe('2026-07-15T08:00:00.000Z');
    expect(sophie.titres).toEqual(['Plaintes', 'Sommeil']); // plus récent d'abord
  });

  it('écarte les réponses antérieures à la dernière consultation validée', () => {
    const ancres = new Map([['P-SOPHIE', new Date('2026-07-14T12:00:00.000Z')]]);
    const lignes = lignesInbox(
      [
        // vue en consultation (avant l'ancre) → ignorée
        { idPatient: 'P-SOPHIE', titre: 'Ancien', dateReponse: new Date('2026-07-10T08:00:00.000Z') },
        // après l'ancre → en attente
        { idPatient: 'P-SOPHIE', titre: 'Récent', dateReponse: new Date('2026-07-15T08:00:00.000Z') },
      ],
      ancres,
      NOMS,
    );
    expect(lignes).toHaveLength(1);
    expect(lignes[0].nb).toBe(1);
    expect(lignes[0].titres).toEqual(['Récent']);
  });

  it('sans consultation validée, toutes les réponses attendent', () => {
    const lignes = lignesInbox(
      [{ idPatient: 'P-MICHEL', titre: 'Alimentaire', dateReponse: new Date('2026-07-13T08:00:00.000Z') }],
      new Map(),
      NOMS,
    );
    expect(lignes).toHaveLength(1);
    expect(lignes[0].nb).toBe(1);
  });

  it('plafonne les titres à trois, sans doublon', () => {
    const lignes = lignesInbox(
      [
        { idPatient: 'P-SOPHIE', titre: 'A', dateReponse: new Date('2026-07-15T08:00:00.000Z') },
        { idPatient: 'P-SOPHIE', titre: 'A', dateReponse: new Date('2026-07-14T08:00:00.000Z') },
        { idPatient: 'P-SOPHIE', titre: 'B', dateReponse: new Date('2026-07-13T08:00:00.000Z') },
        { idPatient: 'P-SOPHIE', titre: 'C', dateReponse: new Date('2026-07-12T08:00:00.000Z') },
        { idPatient: 'P-SOPHIE', titre: 'D', dateReponse: new Date('2026-07-11T08:00:00.000Z') },
      ],
      new Map(),
      NOMS,
    );
    expect(lignes[0].nb).toBe(5);
    expect(lignes[0].titres).toEqual(['A', 'B', 'C']);
  });
});
