import { describe, expect, it } from 'vitest';
import { buildContexteClinique, extraireVigilanceDeterministe } from './contexteClinique';

describe('buildContexteClinique', () => {
  it('renvoie une chaîne vide sans throw pour fiche/anamnese null', () => {
    expect(buildContexteClinique(null, null)).toBe('');
  });

  it('renvoie une chaîne vide pour des objets vides', () => {
    expect(buildContexteClinique({}, {})).toBe('');
  });

  it("ignore les entrées non-objet (ex. tableau ou chaîne) sans throw", () => {
    expect(() => buildContexteClinique('texte', [1, 2, 3])).not.toThrow();
    expect(buildContexteClinique('texte', [1, 2, 3])).toBe('');
  });

  it('construit les sections attendues à partir d\'une fiche et d\'une anamnèse fictives complètes (Sophie Nicola)', () => {
    const fiche = {
      situation_familiale: 'En couple, 2 enfants',
      profession: 'Infirmière',
      statut_professionnel: 'Temps plein, horaires postés',
      activite_physique: 'Marche 2x/semaine',
      regime_alimentaire: 'Sans porc',
      consommations: 'Tabac occasionnel',
      rythme_sommeil: 'Coucher 23h, réveils fréquents',
      particularites: 'RAS',
    };
    const anamnese = {
      motif_principal: 'Fatigue chronique',
      objectif_prioritaire: 'Retrouver de l’énergie',
      attentes: ['Comprendre les causes', 'Un plan concret'],
      debut: 'Progressif',
      debut_date: 'Il y a 6 mois',
      declencheur: 'Reprise du travail après congé maternité',
      evolution: 'Stable',
      facteurs_ameliorent: 'Repos le week-end',
      facteurs_aggravent: 'Manque de sommeil',
      facteurs_declenchants: ['Stress professionnel'],
      antecedents_domaines: ['Endocrinien'],
      antecedents_details: 'Hypothyroïdie traitée',
      chirurgies: 'Aucune',
      allergies: 'Aucune connue',
      taille: '165',
      poids_actuel: '62',
      poids_habituel: '60',
      variation_poids: 'Stable',
    };

    const result = buildContexteClinique(fiche, anamnese);

    expect(result).toContain('### Motif et attentes');
    expect(result).toContain('Fatigue chronique');
    expect(result).toContain('### Histoire des troubles');
    expect(result).toContain('### Antécédents');
    expect(result).toContain('### Repères corporels');
    expect(result).toContain('IMC estimé');
    expect(result).toContain('### Contexte de vie');
    expect(result).toContain('Infirmière');
  });

  it('IMC hors plage plausible (garde-fou) retombe sur taille/poids bruts', () => {
    const result = buildContexteClinique({}, { taille: '50', poids_actuel: '500' });
    expect(result).toContain('Taille : 50 cm');
    expect(result).toContain('Poids actuel : 500 kg');
    expect(result).not.toContain('IMC estimé');
  });

  it('taille/poids non numériques ne provoquent pas de throw et retombent sur les valeurs brutes (pas d\'IMC calculé)', () => {
    expect(() => buildContexteClinique({}, { taille: 'abc', poids_actuel: 'xyz' })).not.toThrow();
    const result = buildContexteClinique({}, { taille: 'abc', poids_actuel: 'xyz' });
    expect(result).toContain('Taille : abc cm');
    expect(result).toContain('Poids actuel : xyz kg');
    expect(result).not.toContain('IMC estimé');
  });
});

describe('extraireVigilanceDeterministe', () => {
  it('renvoie [] sans throw pour une anamnèse absente', () => {
    expect(extraireVigilanceDeterministe(null)).toEqual([]);
    expect(extraireVigilanceDeterministe(undefined)).toEqual([]);
    expect(extraireVigilanceDeterministe({})).toEqual([]);
  });

  it('signal d\'alerte coché est toujours remonté en premier type de vigilance', () => {
    const result = extraireVigilanceDeterministe({ signaux_alerte: ['Perte de poids inexpliquée'] });
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('Perte de poids inexpliquée');
    expect(result[0]).toContain('avis médical à évaluer en priorité');
  });

  it('traitements en cours → formulation d\'interaction avec garde-fou explicite contre dosage/arrêt', () => {
    const result = extraireVigilanceDeterministe({
      medicaments: [{ nom: 'Lévothyrox', dose: '75µg' }],
    });
    expect(result[0]).toContain('Lévothyrox (75µg)');
    expect(result[0]).toContain('vérifier les interactions');
    expect(result[0]).toContain("sans proposer d'ajustement posologique ni d'arrêt");
  });

  it('compléments en cours → formulation de vérification de redondance uniquement', () => {
    const result = extraireVigilanceDeterministe({
      complements: [{ nom: 'Magnésium', dose: '300mg' }],
    });
    expect(result[0]).toContain('Magnésium (300mg)');
    expect(result[0]).toContain('vérifier les redondances et interactions');
  });

  it('cumule signal + traitements + automédication + compléments dans cet ordre', () => {
    const result = extraireVigilanceDeterministe({
      signaux_alerte: ['Douleur thoracique'],
      medicaments: [{ nom: 'Lévothyrox' }],
      automedication: ['Paracétamol au besoin'],
      complements: [{ nom: 'Vitamine D' }],
    });
    expect(result).toHaveLength(4);
    expect(result[0]).toContain('Douleur thoracique');
    expect(result[1]).toContain('Lévothyrox');
    expect(result[2]).toContain('Paracétamol au besoin');
    expect(result[3]).toContain('Vitamine D');
  });
});
