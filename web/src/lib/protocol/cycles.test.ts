import { describe, expect, it } from 'vitest';

import {
  ancreDeCycle,
  ancreSuivante,
  ancresOrdonnees,
  discordanceDOrdre,
  estAncreDeCycle,
  indexDeCycle,
} from './cycles';

describe('estAncreDeCycle — ce qui est une ancre, et ce qui n’en est pas', () => {
  it('reconnaît la série ouverte', () => {
    for (const ancre of ['T0', 'T1', 'T2', 'T12', 'T100']) {
      expect(estAncreDeCycle(ancre)).toBe(true);
    }
  });

  it('REFUSE `T01` — deux écritures d’un même cycle en feraient deux cycles', () => {
    expect(estAncreDeCycle('T01')).toBe(false);
    expect(estAncreDeCycle('T00')).toBe(false);
  });

  it('refuse les jalons de mesure et les formes approchantes', () => {
    for (const pasUneAncre of ['J21', 'J42', 'J90', 'T', 'T-1', 'TA', '', 't0', 'T1.5']) {
      expect(estAncreDeCycle(pasUneAncre)).toBe(false);
    }
  });
});

describe('indexDeCycle — le rang, et `null` quand ce n’est pas une ancre', () => {
  it('rend le rang', () => {
    expect(indexDeCycle('T0')).toBe(0);
    expect(indexDeCycle('T3')).toBe(3);
  });

  it('REND `null`, JAMAIS `0`, sur ce qui n’est pas une ancre', () => {
    // `0` est le rang du PREMIER cycle : le confondre avec « pas une ancre »
    // ferait passer un J21 pour un début de suivi.
    expect(indexDeCycle('J21')).toBeNull();
    expect(indexDeCycle('')).toBeNull();
  });
});

describe('ancreSuivante — le nom du prochain cycle', () => {
  it('sans aucune ancre, le premier cycle est `T0`', () => {
    expect(ancreSuivante([])).toBe('T0');
  });

  it('suit le rang le plus haut', () => {
    expect(ancreSuivante(['T0'])).toBe('T1');
    expect(ancreSuivante(['T0', 'T1', 'T2'])).toBe('T3');
  });

  it('UN TROU NE PROVOQUE PAS DE COLLISION — le compte serait faux, le rang ne l’est pas', () => {
    // `T0` et `T2` sans `T1` : compter les ancres proposerait `T2`, déjà pris.
    expect(ancreSuivante(['T0', 'T2'])).toBe('T3');
  });

  it('ignore ce qui n’est pas une ancre', () => {
    expect(ancreSuivante(['T0', 'J21', 'J90'])).toBe('T1');
  });
});

describe('ancresOrdonnees et discordanceDOrdre', () => {
  const episode = (milestone: string, iso: string | null) => ({
    milestone,
    confirmedAt: iso ? new Date(iso) : null,
  });

  it('ordonne par RANG, pas par date, et écarte les jalons de mesure', () => {
    const lignes = [
      episode('J21', '2026-01-10T00:00:00.000Z'),
      episode('T1', '2026-02-01T00:00:00.000Z'),
      episode('T0', '2026-01-01T00:00:00.000Z'),
    ];
    expect(ancresOrdonnees(lignes).map((l) => l.milestone)).toEqual(['T0', 'T1']);
  });

  it('SIGNALE la discordance rang/date, et ne la corrige pas (DC-30)', () => {
    const discordant = [
      episode('T0', '2026-02-01T00:00:00.000Z'),
      episode('T1', '2026-01-01T00:00:00.000Z'),
    ];
    expect(discordanceDOrdre(discordant)).toBe(true);
    // L'ordre rendu reste celui des RANGS : la fonction ne choisit pas laquelle
    // des deux sources a raison.
    expect(ancresOrdonnees(discordant).map((l) => l.milestone)).toEqual(['T0', 'T1']);
  });

  it('un ordre cohérent ne signale rien', () => {
    expect(
      discordanceDOrdre([
        episode('T0', '2026-01-01T00:00:00.000Z'),
        episode('T1', '2026-02-01T00:00:00.000Z'),
      ]),
    ).toBe(false);
  });

  it('une ancre non confirmée ne fabrique pas de discordance', () => {
    expect(
      discordanceDOrdre([episode('T0', '2026-01-01T00:00:00.000Z'), episode('T1', null)]),
    ).toBe(false);
  });
});
