import { describe, expect, it } from 'vitest';
import { controlerRegistreLibelle } from './controle';
import {
  FORMULATIONS_DIAGNOSTIQUES_D535,
  RACINES_DIAGNOSTIQUES_LIBELLE,
  TERMES_ECARTES_D331,
  termesHorsRegistre,
} from './registreLibelleHypothese';

// Libellés SYNTHÉTIQUES ([[D-251]] §4) : aucun libellé réel n'entre au dépôt.

describe('le registre des libellés d’hypothèse — une liste explicite (D-477 §2, D-331 §3)', () => {
  it('reprend exactement les cinq termes de D-331 §3 et la racine diagnostique du registre des frontières', () => {
    expect([...TERMES_ECARTES_D331]).toEqual(['normal', 'anormal', 'déficit', 'carence', 'excès']);
    expect([...RACINES_DIAGNOSTIQUES_LIBELLE]).toEqual(['diagnos']);
    expect([...FORMULATIONS_DIAGNOSTIQUES_D535]).toEqual(['hors plage', 'élevé', 'pathologie', 'maladie', 'syndrome', 'trouble']);
  });

  it('« bas » n’en est pas : les hypothèses de D-477 sont de sens bas', () => {
    expect(termesHorsRegistre('Statut bas synthétique')).toEqual([]);
  });

  it.each([
    ['Statut normal synthétique', ['normal']],
    ['Statut anormal synthétique', ['normal', 'anormal']],
    ['État déficitaire synthétique', ['déficit']],
    ['Carence synthétique', ['carence']],
    ['Apport excessif synthétique', ['excès']],
    ['Diagnostic synthétique', ['diagnos']],
    ['Valeur hors plage synthétique', ['hors plage']],
    ['Statut élevé synthétique', ['élevé']],
    ['Pathologie synthétique', ['pathologie']],
    ['Maladie synthétique', ['maladie']],
    ['Syndrome synthétique', ['syndrome']],
    ['Trouble synthétique', ['trouble']],
  ])('« %s » porte %j', (libelle, termes) => {
    expect(termesHorsRegistre(libelle)).toEqual(termes);
  });

  it('ignore la casse et les accents', () => {
    expect(termesHorsRegistre('DEFICIT EN SYNTHÈSE')).toEqual(['déficit']);
    expect(termesHorsRegistre('exces synthétique')).toEqual(['excès']);
    expect(termesHorsRegistre('Diagnostiqué')).toEqual(['diagnos']);
  });

  it('ignore tirets, espaces insécables, espaces doubles et caractères invisibles', () => {
    expect(termesHorsRegistre('Valeur hors-plage synthétique')).toEqual(['hors plage']);
    expect(termesHorsRegistre('Valeur hors plage synthétique')).toEqual(['hors plage']);
    expect(termesHorsRegistre('Valeur hors plage synthétique')).toEqual(['hors plage']);
    expect(termesHorsRegistre('Valeur hors  plage synthétique')).toEqual(['hors plage']);
    expect(termesHorsRegistre('Car­ence synthétique')).toEqual(['carence']);
    expect(termesHorsRegistre('Défi​cit synthétique')).toEqual(['déficit']);
  });

  it('un mot qui contient un terme y tombe : « relevé » sous « élevé » (D-535 §2)', () => {
    expect(termesHorsRegistre('Apport relevé synthétique')).toEqual(['élevé']);
  });

  it('un libellé d’état fonctionnel, sans terme du registre, passe', () => {
    expect(termesHorsRegistre('Statut fonctionnel bas, synthétique')).toEqual([]);
  });
});

describe('controlerRegistreLibelle — les hypothèses seules', () => {
  it('nomme les termes trouvés, jamais le texte', () => {
    const anomalies = controlerRegistreLibelle({ nature: 'hypothese', libelle: 'Carence synthétique' });
    expect(anomalies).toEqual([{ code: 'libelle_hors_registre', termes: ['carence'] }]);
    expect(JSON.stringify(anomalies)).not.toContain('synthétique');
  });

  it('une population n’en relève pas', () => {
    expect(controlerRegistreLibelle({ nature: 'population', libelle: 'Population normale synthétique' })).toEqual([]);
  });
});
