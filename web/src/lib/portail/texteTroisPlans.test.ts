import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CHAPEAU_TROIS_PLANS,
  INTITULE_PLAN_IDEAL,
  INTITULE_PLAN_MINIMAL,
  INTITULE_PLAN_SECOURS,
} from './texteTroisPlans';

describe('intitulés des trois plans', () => {
  // RECOPIE MOT POUR MOT : le banc relit les citations de D-384 §2, dans
  // l'ordre. Seule l'apostrophe typographique de l'écran est ramenée à celle de
  // la décision.
  it('sont ceux de D-384 §2, dans cet ordre, ni plus ni moins', () => {
    const decisions = readFileSync(path.join(process.cwd(), '..', 'docs', 'DECISIONS.md'), 'utf8');
    const debut = decisions.indexOf('### D-384');
    expect(debut).toBeGreaterThanOrEqual(0);
    const section = decisions.slice(debut, decisions.indexOf('\n### ', debut + 1));
    const paragraphe2 = section.slice(section.indexOf('**§2'), section.indexOf('**§3'));
    const cites = [...paragraphe2.matchAll(/« ([^»]+?) »/g)].map((m) => m[1]);
    const ecran = [CHAPEAU_TROIS_PLANS, INTITULE_PLAN_IDEAL, INTITULE_PLAN_MINIMAL, INTITULE_PLAN_SECOURS]
      .map((texte) => texte.replace(/’/g, "'"));
    expect(cites).toEqual(ecran);
  });

  it('ne portent aucun chiffre', () => {
    for (const texte of [CHAPEAU_TROIS_PLANS, INTITULE_PLAN_IDEAL, INTITULE_PLAN_MINIMAL, INTITULE_PLAN_SECOURS]) {
      expect(texte).not.toMatch(/\d/);
    }
  });
});
