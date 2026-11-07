import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { SYSTEM_PROMPT_GOUVERNANCE, VERSION_PROMPT_SYNTHESE } from '@/lib/anthropic';

// LA CLAUSE DE CONVERGENCE DE LA CONSIGNE v31 — `DC-29`, [[D-455]] §3 (H98).
//
// Les constats de convergence sont ajoutés par le code en tête des points de
// vigilance ; le modèle ne les reçoit pas. La clause lui interdit donc de
// conclure lui-même à une convergence, d'en déduire une des instruments, et
// d'en tirer une certitude. Sans elle, la prose pouvait doubler le constat
// déterministe d'un accord reconstruit, sans ses limites.
//
// Même patron que `promptFenetreRappel.guard.test.ts` : formule citable unique,
// opérateur dans la même puce, position au-dessus des sections topiques, puce
// épinglée par empreinte. CE BANC NE PROUVE PAS QUE LE MODÈLE OBÉIT : il prouve
// qu'on ne peut plus toucher à l'interdit sans le décider.

const CONSIGNE = SYSTEM_PROMPT_GOUVERNANCE;
const FORMULE = 'Une convergence entre sources ne se conclut pas ici.';
const OPERATEUR = 'ne déduis aucune convergence des instruments transmis';
const CERTITUDE = 'jamais la certitude d\'un constat';
const PREMIERE_SECTION_TOPIQUE = '## Questionnaires alimentaires';
/** Empreinte de la puce validée par le responsable le 2026-11-07 (D-455 §6). */
const EMPREINTE_PUCE = '5217118b4cc76b25';

function puceDeLaClause(): string {
  const position = CONSIGNE.indexOf(FORMULE);
  if (position < 0) throw new Error('la formule épinglée a disparu de la consigne');
  const debut = CONSIGNE.lastIndexOf('\n- ', position);
  if (debut < 0) throw new Error('la clause n’est plus portée par une puce');
  const puceSuivante = CONSIGNE.indexOf('\n- ', debut + 3);
  const sectionSuivante = CONSIGNE.indexOf('\n## ', debut + 3);
  const fin = Math.min(...[puceSuivante, sectionSuivante, CONSIGNE.length].filter(index => index > 0));
  return CONSIGNE.slice(debut + 1, fin);
}

describe('consigne système — la convergence ne se conclut pas hors du déterministe (DC-29)', () => {
  it('la version est v31 ou au-delà : la clause n’existe pas avant', () => {
    const numero = Number(VERSION_PROMPT_SYNTHESE.replace('synthese-v', ''));
    expect(Number.isFinite(numero)).toBe(true);
    expect(numero).toBeGreaterThanOrEqual(31);
  });

  it('la formule est présente, une seule fois', () => {
    expect(CONSIGNE.split(FORMULE).length - 1).toBe(1);
  });

  it('l’interdit et la distinction priorité / certitude vivent dans la MÊME puce', () => {
    const puce = puceDeLaClause();
    expect(puce).toContain(OPERATEUR);
    expect(puce).toContain(CERTITUDE);
    expect(puce).toContain('Tu ne le reçois pas.');
  });

  it('la clause est posée au-dessus des sections topiques', () => {
    const fin = CONSIGNE.indexOf(puceDeLaClause()) + puceDeLaClause().length;
    const section = CONSIGNE.indexOf(PREMIERE_SECTION_TOPIQUE);
    expect(section).toBeGreaterThan(-1);
    expect(fin).toBeLessThan(section);
  });

  it('la puce est épinglée par empreinte : toute addition rougit', () => {
    const empreinte = createHash('sha256').update(puceDeLaClause()).digest('hex').slice(0, 16);
    expect(
      empreinte,
      'CLAUSE DC-29 MODIFIÉE. Relire ce qui a bougé ; si l’interdit s’est affaibli, une décision `D-xxx`'
      + ' et un fragment `changelog.d/` sont dus AVANT de reporter cette empreinte. Incrémenter aussi'
      + ' `VERSION_PROMPT_SYNTHESE`.',
    ).toBe(EMPREINTE_PUCE);
  });
});
