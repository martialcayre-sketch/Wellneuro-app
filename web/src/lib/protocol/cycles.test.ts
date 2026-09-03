import { describe, expect, it } from 'vitest';

import {
  ancreDeCycle,
  ancreRecevable,
  ancreSuivante,
  ancresOrdonnees,
  estJalonMesure,
  estJalonMomentum,
  jalonsDuCycle,
  discordanceDOrdre,
  estAncreDeCycle,
  indexDeCycle,
  numeroEpisodeDeCycle,
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

describe('numeroEpisodeDeCycle — le rang affiché, à partir de un', () => {
  it('décale d’un : `T0` ouvre l’épisode 1', () => {
    expect(numeroEpisodeDeCycle('T0', 0)).toBe(1);
    expect(numeroEpisodeDeCycle('T2', 0)).toBe(3);
  });

  it('sur une ancre hors série, retombe sur le rang fourni — jamais `NaN`', () => {
    // Le cas est celui d'une valeur inattendue en base : l'écran doit rester
    // lisible, en donnant au cycle sa place dans la liste plutôt qu'un trou.
    expect(numeroEpisodeDeCycle('J21', 2)).toBe(3);
    expect(numeroEpisodeDeCycle('', 0)).toBe(1);
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

describe('estJalonMesure / estJalonMomentum — la forme, jamais une liste fermée', () => {
  it('les trois mesures, et rien d’autre', () => {
    expect(['J21', 'J42', 'J90'].every(estJalonMesure)).toBe(true);
    expect(['T0', 'T1', 'J7', 'J14', ''].some(estJalonMesure)).toBe(false);
  });

  it('un jalon de momentum est une ancre OU une mesure — `T1` compris', () => {
    expect(['T0', 'T1', 'T12', 'J21', 'J42', 'J90'].every(estJalonMomentum)).toBe(true);
  });

  it('REFUSE ce qu’aucune liste littérale n’aurait attrapé', () => {
    // Ces cinq-là passeraient un `startsWith('T')` en base : c'est ici, et non
    // en SQL, que « ancre » est défini une seule fois.
    expect(['T', 'TA', 'T01', 'T-1', 'J7'].some(estJalonMomentum)).toBe(false);
  });
});

describe('jalonsDuCycle — l’ordre d’UN cycle, pas une liste globale', () => {
  it('le premier cycle : `T0` puis les trois mesures', () => {
    expect(jalonsDuCycle('T0')).toEqual(['T0', 'J21', 'J42', 'J90']);
  });

  it('le deuxième cycle porte SON ancre en tête — jamais `T0`', () => {
    // C'est ce que la liste littérale `['T0', 'J21', 'J42', 'J90']` rendait
    // impossible : elle décrivait le premier cycle et lui seul.
    expect(jalonsDuCycle('T1')).toEqual(['T1', 'J21', 'J42', 'J90']);
    expect(jalonsDuCycle('T2')).not.toContain('T0');
  });
});

describe('ancreRecevable — la garde d’écriture', () => {
  it('sans ancre posée, seul `T0` est recevable', () => {
    expect(ancreRecevable('T0', [])).toBe(true);
    expect(ancreRecevable('T1', [])).toBe(false);
  });

  it('accepte l’ancre SUIVANTE, et elle seule', () => {
    expect(ancreRecevable('T1', ['T0'])).toBe(true);
    expect(ancreRecevable('T2', ['T0'])).toBe(false);
    expect(ancreRecevable('T7', ['T0'])).toBe(false);
  });

  it('accepte la RE-CONFIRMATION d’une ancre déjà posée (upsert idempotent)', () => {
    expect(ancreRecevable('T0', ['T0'])).toBe(true);
    expect(ancreRecevable('T0', ['T0', 'T1'])).toBe(true);
  });

  it('sur un trou de rang, la suivante se déduit du rang le plus haut', () => {
    // `T0` effacé : ce n'est pas `T1` qui suit, c'est `T3`. Compter les ancres
    // proposerait `T2`, déjà pris — deux cycles porteraient le même nom.
    expect(ancreRecevable('T3', ['T1', 'T2'])).toBe(true);
    expect(ancreRecevable('T2', ['T1', 'T2'])).toBe(true); // déjà posée
    expect(ancreRecevable('T0', ['T1', 'T2'])).toBe(false);
  });

  it('ce qui n’est pas une ancre n’est jamais recevable comme telle', () => {
    expect(ancreRecevable('J21', ['T0'])).toBe(false);
    expect(ancreRecevable('T01', ['T0'])).toBe(false);
    expect(ancreRecevable('TA', [])).toBe(false);
  });
});
