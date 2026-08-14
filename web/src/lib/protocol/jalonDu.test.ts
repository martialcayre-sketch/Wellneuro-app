import { describe, expect, it } from 'vitest';

import { resoudreJalonDu } from './jalonDu';
import type { Trajectoire } from './trajectoire';

// Ce que ce banc défend (`D-058`, LOT-07) : le cockpit ne propose un jalon que
// dans SA fenêtre, et dit pourquoi quand il n'en propose aucun. Confirmer un
// J21 trois semaines trop tôt daterait l'épisode d'un moment où la mesure n'a
// pas eu lieu — et le momentum comparerait ensuite deux points que rien ne
// sépare.

const T0 = '2026-01-01T00:00:00.000Z';
const JOUR = 24 * 60 * 60 * 1000;
const apresT0 = (jours: number) => new Date(Date.parse(T0) + jours * JOUR);

function trajectoire(confirmes: string[] = ['T0']): Trajectoire {
  return {
    index: confirmes.map(milestone => ({
      milestone: milestone as Trajectoire['index'][number]['milestone'],
      date: T0,
      cycleId: 'cycle-1',
    })),
    cycles: [{
      cycleId: 'cycle-1',
      dateT0: T0,
      versionScore: 'equilibre-v15',
      jalons: [],
      momentum: null,
    }],
    comparaison: { disponible: false, raison: 'un_seul_cycle' },
  };
}

describe('resoudreJalonDu — ce que le cockpit a le droit de proposer', () => {
  it('propose T0 quand aucun cycle n’existe — comportement historique inchangé', () => {
    expect(resoudreJalonDu(null, apresT0(0))).toMatchObject({ statut: 'du', jalon: 'T0' });
  });

  it('propose J21 au centre de sa fenêtre', () => {
    expect(resoudreJalonDu(trajectoire(), apresT0(21))).toMatchObject({ statut: 'du', jalon: 'J21' });
  });

  it('propose J21 aux deux bords de sa fenêtre, tolérance comprise', () => {
    expect(resoudreJalonDu(trajectoire(), apresT0(13))).toMatchObject({ statut: 'du', jalon: 'J21' });
    expect(resoudreJalonDu(trajectoire(), apresT0(29))).toMatchObject({ statut: 'du', jalon: 'J21' });
  });

  it('ne propose RIEN entre deux fenêtres, et dit laquelle vient', () => {
    // J+35 : la fenêtre du J21 est fermée (29), celle du J42 pas encore
    // ouverte (34)… non : 42 - 8 = 34, donc J+35 est DANS la fenêtre J42.
    // J+31 en revanche ne l'est pas.
    const verdict = resoudreJalonDu(trajectoire(), apresT0(31));
    expect(verdict).toMatchObject({ statut: 'aucun', prochainJalon: 'J42' });
    expect((verdict as { motif: string }).motif).toContain('s’ouvrira');
  });

  it('ne propose pas un jalon déjà confirmé — il passe au suivant si sa fenêtre est ouverte', () => {
    expect(resoudreJalonDu(trajectoire(['T0', 'J21']), apresT0(21)))
      .toMatchObject({ statut: 'aucun', prochainJalon: 'J42' });
  });

  it('dit quand tout est confirmé, plutôt que de se taire', () => {
    const verdict = resoudreJalonDu(trajectoire(['T0', 'J21', 'J42', 'J90']), apresT0(90));
    expect(verdict).toMatchObject({ statut: 'aucun' });
    expect((verdict as { motif: string }).motif).toContain('Tous les jalons');
  });

  it('dit quand les fenêtres restantes sont passées', () => {
    const verdict = resoudreJalonDu(trajectoire(), apresT0(200));
    expect(verdict).toMatchObject({ statut: 'aucun' });
    expect((verdict as { motif: string }).motif).toContain('passées');
  });

  it('ne rattache pas un épisode d’un AUTRE cycle', () => {
    // `cycleId` nullable sur les lignes héritées : on ne devine pas leur
    // rattachement, donc le J21 d'un autre cycle ne masque pas celui-ci.
    const autre = trajectoire();
    autre.index = [
      { milestone: 'T0', date: T0, cycleId: 'cycle-1' },
      { milestone: 'J21', date: T0, cycleId: 'cycle-autre' },
    ];
    expect(resoudreJalonDu(autre, apresT0(21))).toMatchObject({ statut: 'du', jalon: 'J21' });
  });

  it('refuse de proposer quoi que ce soit sur une date T0 illisible', () => {
    const casse = trajectoire();
    casse.cycles[0].dateT0 = 'pas-une-date';
    expect(resoudreJalonDu(casse, apresT0(21))).toMatchObject({ statut: 'aucun' });
  });
});
