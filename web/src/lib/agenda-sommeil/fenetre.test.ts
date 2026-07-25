import { describe, expect, it } from 'vitest';
import { calculerFenetre } from './fenetre';
import { ensureNuitReponses } from './nuit';
import { NB_JOURS_AGENDA, type NuitRow } from './types';

const rep = ensureNuitReponses({
  heureCoucher: '23:00',
  heureLever: '07:00',
  latence: 'lt15',
  qualite: 4,
});

function nuitLe(dateNuit: string, id = dateNuit): NuitRow {
  return {
    id,
    idPatient: 'PAT',
    idAssignation: 'ASS',
    dateNuit,
    reponses: rep,
    canal: 'portail',
    supersedesNuitId: null,
    soumisLe: `${dateNuit}T07:00:00.000Z`,
  };
}

describe('calculerFenetre', () => {
  it('fenêtre vide sans aucune nuit', () => {
    const f = calculerFenetre([], '2026-07-25');
    expect(f.dateDebut).toBeNull();
    expect(f.emplacements).toHaveLength(0);
    expect(f.cloturablePatient).toBe(false);
  });

  it('ancre les 21 emplacements sur la première nuit saisie', () => {
    const f = calculerFenetre([nuitLe('2026-07-10')], '2026-07-10');
    expect(f.dateDebut).toBe('2026-07-10');
    expect(f.emplacements).toHaveLength(NB_JOURS_AGENDA);
    expect(f.emplacements[0].dateNuit).toBe('2026-07-10');
    expect(f.emplacements[20].dateNuit).toBe('2026-07-30');
    expect(f.jourCourant).toBe(1);
  });

  it('marque les emplacements renseignés et laisse les trous visibles', () => {
    const nuits = [nuitLe('2026-07-10'), nuitLe('2026-07-12')]; // trou le 11
    const f = calculerFenetre(nuits, '2026-07-12');
    expect(f.nbRenseignees).toBe(2);
    expect(f.emplacements[0].renseignee).toBe(true);
    expect(f.emplacements[1].renseignee).toBe(false); // 11 juillet, trou
    expect(f.emplacements[2].renseignee).toBe(true);
  });

  it('jourCourant suit la position d’aujourd’hui', () => {
    const f = calculerFenetre([nuitLe('2026-07-10')], '2026-07-15');
    expect(f.jourCourant).toBe(6); // 10 → J1, 15 → J6
  });

  it('cloturablePatient à partir du 21e jour', () => {
    const debut = [nuitLe('2026-07-10')];
    expect(calculerFenetre(debut, '2026-07-29').cloturablePatient).toBe(false); // J20
    expect(calculerFenetre(debut, '2026-07-30').cloturablePatient).toBe(true); // J21
    expect(calculerFenetre(debut, '2026-08-05').cloturablePatient).toBe(true); // au-delà
  });

  it('jourCourant est null au-delà de la fenêtre', () => {
    const f = calculerFenetre([nuitLe('2026-07-10')], '2026-08-05');
    expect(f.jourCourant).toBeNull();
  });
});
