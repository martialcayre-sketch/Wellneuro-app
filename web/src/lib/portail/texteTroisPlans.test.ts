import { lireDecision } from '@/lib/doctrine/lireDecision';
import { describe, expect, it } from 'vitest';
import { CHAPEAU_TROIS_PLANS, INTITULES_TROIS_PLANS } from './texteTroisPlans';

// L'apostrophe est typographique au portail, droite dans la décision : seule
// cette différence est admise.
const brut = (texte: string) => texte.replace(/’/g, "'");

describe('intitulés validés des trois plans', () => {
  // RECOPIE MOT POUR MOT de D-384 §2 : le chapeau, puis les trois intitulés
  // dans leur ordre, chacun devant son plan.
  it('sont ceux de D-384 §2, dans cet ordre', () => {
    const section = lireDecision('D-384');
    const paragraphe2 = section.slice(section.indexOf('**§2'), section.indexOf('**§3'));
    expect(paragraphe2).toContain(`« ${brut(CHAPEAU_TROIS_PLANS)} »`);
    const lignes = [...paragraphe2.matchAll(/^- « (.+) » : le plan (idéal|minimal|de secours) ?[;.]$/gm)].map(
      ([, intitule, plan]) => [intitule, plan],
    );
    expect(lignes).toEqual([
      [brut(INTITULES_TROIS_PLANS.idealPlan), 'idéal'],
      [brut(INTITULES_TROIS_PLANS.minimalPlan), 'minimal'],
      [brut(INTITULES_TROIS_PLANS.rescuePlan), 'de secours'],
    ]);
  });

  it('ne portent aucun chiffre', () => {
    for (const texte of [CHAPEAU_TROIS_PLANS, ...Object.values(INTITULES_TROIS_PLANS)]) expect(texte).not.toMatch(/\d/);
  });
});
