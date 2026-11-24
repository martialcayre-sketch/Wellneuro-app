import { describe, expect, it } from 'vitest';
import { QUESTIONNAIRE_CATALOGUE } from '@/lib/questions';
import { lecturesAffichees } from './lecturesAffichees';

// LES LECTURES AFFICHÉES ([[D-548]] §2.3 à §2.5, [[D-529]] §5.2, [[D-541]] §5.2).

describe('lecturesAffichees', () => {
  it('le PSQI : la lecture publiée avec ses claims, et la gradation servie en lecture WellNeuro', () => {
    const t = lecturesAffichees('Q_SOM_01').map(l => l.texte).join('\n');
    expect(t).toContain('supérieur à 5');
    expect(t).toContain('WN-CL-0666-002');
    expect(t).toContain('lecture WellNeuro, sans source publiée (D-529');
  });

  it("l'Epworth : les lectures publiées coexistent, la grille servie est la lecture du cabinet", () => {
    const t = lecturesAffichees('Q_SOM_02').map(l => l.texte).join('\n');
    expect(t).toContain('WN-CL-0668-001');
    expect(t).toContain('WN-CL-0668-002');
    expect(t).toContain('WN-CL-0575-006');
    expect(t).toContain('lecture du cabinet, sans source publiée (D-529');
  });

  it('la PSS-10 : la grille servie du total est une lecture du cabinet, avec renvoi à D-541', () => {
    const t = lecturesAffichees('Q_STR_02').map(l => l.texte).join('\n');
    expect(t).toContain('lecture du cabinet, sans source publiée (D-541');
    expect(t).not.toContain('WN-CL-');
  });

  it('les deux questionnaires du besoin 4 affichent leur population de lecture, sans lecture publiée', () => {
    for (const id of ['Q_GAS_01', 'Q_INF_01']) {
      const lignes = lecturesAffichees(id);
      expect(lignes.map(l => l.genre)).toEqual(['population']);
      expect(lignes[0].texte).toContain('D-526');
      expect(lignes[0].texte).toContain('pas de population de validation');
      expect(lignes[0].texte).not.toContain('ne vaut pas validation');
    }
  });

  it('un autre questionnaire, ou aucun : rien', () => {
    expect(lecturesAffichees('Q_SOM_05')).toEqual([]);
    expect(lecturesAffichees(null)).toEqual([]);
  });

  it("aucune ligne ne dépend d'un score, et aucune borne du catalogue n'est touchée par ce module", () => {
    const psqi = QUESTIONNAIRE_CATALOGUE.Q_SOM_01.scoring as Record<string, unknown>;
    expect(JSON.stringify(psqi)).not.toContain('lecture');
  });
});
