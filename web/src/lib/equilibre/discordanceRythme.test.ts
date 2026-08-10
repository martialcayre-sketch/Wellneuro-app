import { describe, expect, it } from 'vitest';
import type { AgregatsAgendaAli } from '@/lib/agenda-alimentaire/agregats';
import {
  axesEnSurdeclaration,
  discordanceRythme,
  rythmeDeclareDepuisRawAnswers,
  rythmeDeclareDeReponses,
  SEUIL_JEUNE_MIN,
  SEUIL_PROTEINES_MATIN_JOURS,
  SEUIL_SOIR_COPIEUX_JOURS,
  type RythmeDeclare,
} from './discordanceRythme';
import { MAX_RYTHME_CHRONO } from './constants';

// `Q_ALI_01` est résolu AU CHARGEMENT DU MODULE selon `WN_ALI_01_SIIN57` :
// aucun mock ne bascule la forme après coup, donc `MAX_RYTHME_CHRONO` — d'où la
// discordance tire son existence — vaut 7 (forme SIIN, drapeau allumé) ou 0
// (forme courte, éteint). Ce banc dit donc ce qui est vrai DANS LES DEUX
// positions, comme ses voisins (`score.test.ts`, `evidence.test.ts`) : en
// position éteinte la lecture entière s'effondre en « non mesurable », et les
// axes ne s'exercent qu'en position allumée. Le spec est inscrit à
// `test:court14` pour cela même. Voir aussi la note de tête de
// `discordanceRythme.ts`.
const SIIN57_ACTIF = process.env.WN_ALI_01_SIIN57 === 'true';

// Observé « favorable partout » : jeûne long, protéines fréquentes, soir jamais
// copieux. On le déforme axe par axe pour lever chaque drapeau.
function agregatsFavorables(over: Partial<AgregatsAgendaAli> = {}): AgregatsAgendaAli {
  return {
    nbJours: 10,
    nbJoursWeekEnd: 3,
    nbJoursSansPrise: 0,
    nbJoursAvecPrises: 10,
    nbJoursFenetreConnue: 10,
    nbPairesJeune: 9,
    nbJoursProteinesConnu: 10,
    nbJoursContenuConnu: 10,
    nbJoursSoirConnu: 10,
    jeuneMedian: 720, // 12 h — favorable
    fenetreAliMoyenne: 600,
    regularitePremiereEcartType: 20,
    regulariteDerniereEcartType: 25,
    nbPrisesMoyen: 3,
    nbRepasMoyen: 3,
    nbHorsRepasMoyen: 0,
    freqHorsRepasSem: 0,
    freqMoinsDeuxRepasSem: 0,
    freqProteinesMatinSem: 6, // ≥ 4 — favorable
    freqLegumesSem: 5,
    freqFruitsSem: 5,
    freqUltraTransformesSem: 1,
    freqSoirCopieuxSem: 1, // ≤ 3 — favorable
    ...over,
  };
}

// Déclaré « favorable partout » : ≥ 10 h, protéines régulières, soir léger.
const DECLARE_FAVORABLE: RythmeDeclare = { SIIN54: 12, SIIN53: 1, SIIN55: 1 };

function verdict(d: ReturnType<typeof discordanceRythme>, axe: string) {
  return d.axes.find(a => a.axe === axe)?.verdict;
}

// `rythmeDeclareDepuisRawAnswers` est PUR — il ne touche pas `MAX_RYTHME_CHRONO`
// et dit la même chose dans les deux positions du drapeau.
describe('rythmeDeclareDepuisRawAnswers', () => {
  it('extrait les trois items d’une passation forme longue', () => {
    expect(rythmeDeclareDepuisRawAnswers({ SIIN54: 10, SIIN53: 1, SIIN55: 0, SIIN01: 2 })).toEqual({
      SIIN54: 10,
      SIIN53: 1,
      SIIN55: 0,
    });
  });

  it('rend null si AUCUN des trois items n’est présent (forme courte)', () => {
    expect(rythmeDeclareDepuisRawAnswers({ SIIN01: 2, SIIN10: 1 })).toBeNull();
  });

  it('garde undefined pour un item absent (jamais 0)', () => {
    const d = rythmeDeclareDepuisRawAnswers({ SIIN54: 12 });
    expect(d?.SIIN54).toBe(12);
    expect(d?.SIIN53).toBeUndefined();
    expect(d?.SIIN55).toBeUndefined();
  });

  it('rend null sur rawAnswers absent', () => {
    expect(rythmeDeclareDepuisRawAnswers(null)).toBeNull();
    expect(rythmeDeclareDepuisRawAnswers(undefined)).toBeNull();
  });
});

describe('seuils cliniques D-040 — figés par valeur littérale', () => {
  // Règle cardinale (clinique-scoring.md) : un seuil clinique qui bouge doit
  // rougir le banc. Les assertions relatives (`SEUIL - 1`) attrapent une
  // mutation d'OPÉRATEUR mais pas un DÉPLACEMENT de la valeur — 600→540
  // passerait en silence. On fige donc les trois par un littéral.
  it('jeûne = 600 min (10 h, de la source SIIN54 {min:10})', () => {
    expect(SEUIL_JEUNE_MIN).toBe(600);
  });
  it('protéines matin = 4 j/7 (rupture de majorité, arbitrage D-040)', () => {
    expect(SEUIL_PROTEINES_MATIN_JOURS).toBe(4);
  });
  it('soir copieux = 3 j/7 (arbitrage D-040)', () => {
    expect(SEUIL_SOIR_COPIEUX_JOURS).toBe(3);
  });
});

// Le CÂBLAGE de la fiche : extraire le rythme déclaré de la LISTE de réponses.
// Pur et indépendant du drapeau (il ne fait que lire des clés de rawAnswers).
describe('rythmeDeclareDeReponses — extraction depuis la liste de la fiche', () => {
  const q = (idQuestionnaire: string, rawAnswers: Record<string, unknown> | null) => ({
    idQuestionnaire,
    scoresParsed: rawAnswers === null ? null : { rawAnswers },
  });

  it('prend la DERNIÈRE passation Q_ALI_01 (liste triée par date décroissante)', () => {
    // La plus récente est en tête ; une passation Q_ALI_01 plus ancienne ne doit
    // pas la masquer. On met une valeur distincte pour prouver laquelle est lue.
    const reponses = [
      q('Q_SOM_01', { X: 1 }),
      q('Q_ALI_01', { SIIN54: 12, SIIN53: 1, SIIN55: 1 }), // la plus récente
      q('Q_ALI_01', { SIIN54: 7, SIIN53: 0, SIIN55: 0 }), // ancienne, ignorée
    ];
    expect(rythmeDeclareDeReponses(reponses)).toEqual({ SIIN54: 12, SIIN53: 1, SIIN55: 1 });
  });

  it('ignore les autres questionnaires et rend null si aucun Q_ALI_01', () => {
    expect(rythmeDeclareDeReponses([q('Q_SOM_01', { SIIN54: 12 }), q('NEU_03', null)])).toBeNull();
  });

  it('rend null sur une liste vide', () => {
    expect(rythmeDeclareDeReponses([])).toBeNull();
  });

  it('forme courte (Q_ALI_01 sans item SIIN53-55) → null', () => {
    expect(rythmeDeclareDeReponses([q('Q_ALI_01', { AL1: '1', AL2: '2' })])).toBeNull();
  });

  it('scoresParsed null (passation non interprétable sans rawAnswers) → null', () => {
    expect(rythmeDeclareDeReponses([q('Q_ALI_01', null)])).toBeNull();
  });
});

describe('discordanceRythme — forme et non-mesurabilité', () => {
  it('MAX_RYTHME_CHRONO suit la forme servie (7 allumé, 0 éteint)', () => {
    // Épingle la dérivée dont dépend tout ce banc, dans la position courante.
    expect(MAX_RYTHME_CHRONO).toBe(SIIN57_ACTIF ? 7 : 0);
  });

  it('déclaré null (forme courte) → non mesurable, aucun axe, jamais un concordant', () => {
    // Vrai dans les deux positions : un déclaré absent en bloc n'a pas d'axe.
    const d = discordanceRythme(null, agregatsFavorables());
    expect(d.mesurable).toBe(false);
    expect(d.axes).toEqual([]);
    expect(axesEnSurdeclaration(d)).toEqual([]);
  });

  it.runIf(!SIIN57_ACTIF)(
    'forme courte : même un déclaré et un observé complets restent non mesurables (MAX = 0)',
    () => {
      // La parade « null, jamais 0 » du sous-score. Drapeau éteint, la forme
      // servie ne déclare pas RYTHME_CHRONO : quand bien même un appelant
      // passerait un déclaré favorable ET un observé défavorable partout, la
      // lecture s'effondre — pas un seul drapeau ne se lève sur une mesure qui
      // n'existe pas dans la forme servie.
      const d = discordanceRythme(
        DECLARE_FAVORABLE,
        agregatsFavorables({ jeuneMedian: 300, freqProteinesMatinSem: 0, freqSoirCopieuxSem: 6 }),
      );
      expect(d.mesurable).toBe(false);
      expect(d.axes).toEqual([]);
    },
  );
});

describe.runIf(SIIN57_ACTIF)('discordanceRythme — axe jeûne (seuil de la source, 600 min)', () => {
  it('déclaré ≥ 10 h + observé médian < 600 → sur-déclaration', () => {
    const d = discordanceRythme(DECLARE_FAVORABLE, agregatsFavorables({ jeuneMedian: SEUIL_JEUNE_MIN - 1 }));
    expect(verdict(d, 'jeune')).toBe('surdeclaration');
  });

  it('la borne est stricte : médian = 600 est concordant, pas un drapeau', () => {
    const d = discordanceRythme(DECLARE_FAVORABLE, agregatsFavorables({ jeuneMedian: SEUIL_JEUNE_MIN }));
    expect(verdict(d, 'jeune')).toBe('concordant');
  });

  it('déclaré < 10 h → declare_defavorable, jamais un drapeau (rien à sur-déclarer)', () => {
    const d = discordanceRythme({ ...DECLARE_FAVORABLE, SIIN54: 8 }, agregatsFavorables({ jeuneMedian: 300 }));
    expect(verdict(d, 'jeune')).toBe('declare_defavorable');
  });

  it('observé non couvert (jeuneMedian null) → non mesurable', () => {
    const d = discordanceRythme(DECLARE_FAVORABLE, agregatsFavorables({ jeuneMedian: null }));
    expect(verdict(d, 'jeune')).toBe('non_mesurable');
  });

  it('item déclaré absent → non mesurable', () => {
    const d = discordanceRythme({ SIIN53: 1, SIIN55: 1 }, agregatsFavorables({ jeuneMedian: 300 }));
    expect(verdict(d, 'jeune')).toBe('non_mesurable');
  });
});

describe.runIf(SIIN57_ACTIF)('discordanceRythme — axe protéines matin (< 4 j/7)', () => {
  it('déclaré régulier + observé < 4 → sur-déclaration', () => {
    const d = discordanceRythme(DECLARE_FAVORABLE, agregatsFavorables({ freqProteinesMatinSem: SEUIL_PROTEINES_MATIN_JOURS - 1 }));
    expect(verdict(d, 'proteines_matin')).toBe('surdeclaration');
  });

  it('la borne est stricte : 4 j/7 est concordant', () => {
    const d = discordanceRythme(DECLARE_FAVORABLE, agregatsFavorables({ freqProteinesMatinSem: SEUIL_PROTEINES_MATIN_JOURS }));
    expect(verdict(d, 'proteines_matin')).toBe('concordant');
  });

  it('déclaré irrégulier (0) → declare_defavorable', () => {
    const d = discordanceRythme({ ...DECLARE_FAVORABLE, SIIN53: 0 }, agregatsFavorables({ freqProteinesMatinSem: 1 }));
    expect(verdict(d, 'proteines_matin')).toBe('declare_defavorable');
  });

  it('observé non couvert → non mesurable', () => {
    const d = discordanceRythme(DECLARE_FAVORABLE, agregatsFavorables({ freqProteinesMatinSem: null }));
    expect(verdict(d, 'proteines_matin')).toBe('non_mesurable');
  });
});

describe.runIf(SIIN57_ACTIF)('discordanceRythme — axe soir léger (> 3 j/7 copieux)', () => {
  it('déclaré léger + observé copieux > 3 → sur-déclaration', () => {
    const d = discordanceRythme(DECLARE_FAVORABLE, agregatsFavorables({ freqSoirCopieuxSem: SEUIL_SOIR_COPIEUX_JOURS + 1 }));
    expect(verdict(d, 'soir_leger')).toBe('surdeclaration');
  });

  it('la borne est stricte : 3 j/7 est concordant', () => {
    const d = discordanceRythme(DECLARE_FAVORABLE, agregatsFavorables({ freqSoirCopieuxSem: SEUIL_SOIR_COPIEUX_JOURS }));
    expect(verdict(d, 'soir_leger')).toBe('concordant');
  });

  it('déclaré non léger (0) → declare_defavorable', () => {
    const d = discordanceRythme({ ...DECLARE_FAVORABLE, SIIN55: 0 }, agregatsFavorables({ freqSoirCopieuxSem: 6 }));
    expect(verdict(d, 'soir_leger')).toBe('declare_defavorable');
  });
});

describe.runIf(SIIN57_ACTIF)('discordanceRythme — directionnel et agrégation', () => {
  it('déclaré favorable + observé favorable partout → aucun drapeau (tout concordant)', () => {
    const d = discordanceRythme(DECLARE_FAVORABLE, agregatsFavorables());
    expect(axesEnSurdeclaration(d)).toEqual([]);
    expect(d.axes.every(a => a.verdict === 'concordant')).toBe(true);
  });

  it('observé null entier → les trois axes non mesurables, aucun drapeau', () => {
    const d = discordanceRythme(DECLARE_FAVORABLE, null);
    expect(d.mesurable).toBe(true); // le déclaré existe ; c'est l'observé qui manque
    expect(d.axes.map(a => a.verdict)).toEqual(['non_mesurable', 'non_mesurable', 'non_mesurable']);
  });

  it('sur-déclaration sur les trois axes à la fois', () => {
    const d = discordanceRythme(
      DECLARE_FAVORABLE,
      agregatsFavorables({ jeuneMedian: 480, freqProteinesMatinSem: 2, freqSoirCopieuxSem: 5 }),
    );
    expect(axesEnSurdeclaration(d).map(a => a.axe).sort()).toEqual(['jeune', 'proteines_matin', 'soir_leger']);
  });

  it('le rappel textuel ne porte aucun écart chiffré, seulement déclaré et observé', () => {
    const d = discordanceRythme(DECLARE_FAVORABLE, agregatsFavorables({ jeuneMedian: 480 }));
    const jeune = d.axes.find(a => a.axe === 'jeune')!;
    expect(jeune.declare).toBe('déclaré ≥ 10 h');
    expect(jeune.observe).toBe('observé médian 8 h');
  });
});
