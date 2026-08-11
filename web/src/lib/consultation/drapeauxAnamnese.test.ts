import { describe, expect, it } from 'vitest';
import { extraireDrapeauxAnamnese } from './drapeauxAnamnese';

// Libellés figés, recopiés depuis `anamnese.ts` au moment de l'écriture de ce
// lot — volontairement EN DUR, pas dérivés de `ANAMNESE_SECTIONS`. Le code de
// production, lui, lit ces options dynamiquement dans `anamnese.ts` ; si un
// libellé y change, l'extraction cesse silencieusement de reconnaître les
// valeurs stockées sous l'ancien libellé. Ces constantes figées transforment
// cette dérive en échec de test bruyant, plutôt que de la laisser invisible.
const SIGNAUX_ALERTE = [
  'Perte de poids involontaire importante',
  'Fièvre prolongée / sueurs nocturnes',
  'Sang dans les selles ou les urines',
  'Douleur thoracique / oppression',
  'Essoufflement inhabituel',
  'Malaise / perte de connaissance',
  'Perte de force ou de sensibilité brutale',
  'Idées noires ou suicidaires',
  'Douleur intense et inhabituelle',
  'Vomissements persistants',
  'Diarrhée persistante ou nocturne',
  'Constipation récente inexpliquée',
];
const ANTECEDENTS_DOMAINES = [
  'Cardiovasculaire',
  'Métabolique (diabète, cholestérol…)',
  'Thyroïde',
  'Digestif (SII, reflux, MICI…)',
  'Neurologique (migraine, TDAH…)',
  'Psychiatrique (anxiété, dépression, burn-out)',
  'Douleurs chroniques / fibromyalgie',
  'Auto-immun / rhumatologique',
  'Allergies / atopie',
  'Gynécologique / hormonal',
  'Respiratoire / apnée du sommeil',
  'Cancer',
];
const FACTEURS_DECLENCHANTS = [
  'Infection / syndrome post-infectieux (Covid…)',
  'Stress aigu / burn-out',
  'Traumatisme, deuil, séparation ou conflit',
  'Grossesse / post-partum',
  'Ménopause / périménopause',
  'Intervention chirurgicale',
  'Antibiotiques / IPP / corticoïdes',
  'Changement alimentaire',
  'Perte ou prise de poids rapide',
  'Surentraînement',
];
const ATTENTES = [
  'Comprendre l’origine possible des troubles',
  'Améliorer l’énergie',
  'Améliorer le sommeil',
  'Réduire les douleurs ou l’inflammation',
  'Améliorer la digestion / le transit',
  'Améliorer l’humeur, le stress, l’anxiété',
  'Améliorer le poids / la composition corporelle',
  'Adapter l’alimentation et les compléments',
  'Préparer un bilan biologique',
];
const AUTOMEDICATION = [
  'Anti-inflammatoires',
  'Antalgiques',
  'Laxatifs',
  'IPP / antiacides',
  'Somnifères / anxiolytiques',
  'Caféine / boissons énergisantes',
  'Alcool',
  'Nicotine',
  'Cannabis / autres substances',
];
const DEBUT = ['Brutal', 'Progressif'];
const EVOLUTION = ['Ils s’aggravent', 'Ils sont stables', 'Ils sont variables'];
const VARIATION_POIDS = ['Perte', 'Prise', 'Stable'];
const INTOLERANCES_ALIMENTAIRES = ['Gluten', 'Histamine', 'Lactose'];
const SYMPTOMES_FONCTIONNELS = ['Difficultés à avaler / troubles de la déglutition'];

const OBJET_COMPLET_VIDE = {
  signauxAlerte: [],
  antecedentsDomaines: [],
  facteursDeclenchants: [],
  attentes: [],
  automedication: [],
  intolerancesAlimentaires: [],
  symptomesFonctionnels: [],
  debut: null,
  evolution: null,
  variationPoids: null,
};

describe('extraireDrapeauxAnamnese', () => {
  it('renvoie un objet complet « tout absent » sans throw pour une anamnèse null/undefined', () => {
    expect(extraireDrapeauxAnamnese(null)).toEqual(OBJET_COMPLET_VIDE);
    expect(extraireDrapeauxAnamnese(undefined)).toEqual(OBJET_COMPLET_VIDE);
  });

  it('renvoie un objet complet « tout absent » pour un objet vide', () => {
    expect(extraireDrapeauxAnamnese({})).toEqual(OBJET_COMPLET_VIDE);
  });

  it('ignore les entrées non-objet (chaîne, tableau, nombre) sans throw', () => {
    expect(() => extraireDrapeauxAnamnese('texte')).not.toThrow();
    expect(extraireDrapeauxAnamnese('texte')).toEqual(OBJET_COMPLET_VIDE);
    expect(extraireDrapeauxAnamnese([1, 2, 3])).toEqual(OBJET_COMPLET_VIDE);
    expect(extraireDrapeauxAnamnese(42)).toEqual(OBJET_COMPLET_VIDE);
  });

  it('une valeur hors énuméré (checkbox-multi) est ignorée, jamais devinée', () => {
    expect(extraireDrapeauxAnamnese({ signaux_alerte: ['Grippe carabinée'] }).signauxAlerte).toEqual([]);
  });

  it('une valeur hors énuméré (radio) est ignorée, jamais devinée', () => {
    expect(extraireDrapeauxAnamnese({ debut: 'Suraccéléré' }).debut).toBeNull();
  });

  it('un type inattendu sur un champ précis ne fait pas throw et retombe sur « absent »', () => {
    expect(() => extraireDrapeauxAnamnese({ signaux_alerte: { evil: 'x' } })).not.toThrow();
    expect(extraireDrapeauxAnamnese({ signaux_alerte: { evil: 'x' } }).signauxAlerte).toEqual([]);
    expect(extraireDrapeauxAnamnese({ signaux_alerte: 42 }).signauxAlerte).toEqual([]);
    expect(extraireDrapeauxAnamnese({ debut: ['Brutal'] }).debut).toBeNull();
  });

  it('les doublons stockés en base sont dédupliqués', () => {
    const [signal] = SIGNAUX_ALERTE;
    expect(extraireDrapeauxAnamnese({ signaux_alerte: [signal, signal] }).signauxAlerte).toEqual([signal]);
  });

  it('l’ordre de sortie suit l’énuméré clinique, pas l’ordre de stockage', () => {
    const desordre = [...SIGNAUX_ALERTE].reverse();
    expect(extraireDrapeauxAnamnese({ signaux_alerte: desordre }).signauxAlerte).toEqual(SIGNAUX_ALERTE);
  });

  it('un espace de tête ou de fin sur une valeur stockée n’empêche pas la reconnaissance', () => {
    const [signal] = SIGNAUX_ALERTE;
    expect(extraireDrapeauxAnamnese({ signaux_alerte: [` ${signal} `] }).signauxAlerte).toEqual([signal]);
    expect(extraireDrapeauxAnamnese({ debut: ' Brutal ' }).debut).toBe('Brutal');
  });

  it('reconnaît les intolérances et symptômes fonctionnels déclarés (checkbox-multi neufs)', () => {
    expect(
      extraireDrapeauxAnamnese({ intolerances_alimentaires: ['Gluten', 'Lactose'] }).intolerancesAlimentaires,
    ).toEqual(['Gluten', 'Lactose']);
    expect(
      extraireDrapeauxAnamnese({ symptomes_fonctionnels: SYMPTOMES_FONCTIONNELS }).symptomesFonctionnels,
    ).toEqual(SYMPTOMES_FONCTIONNELS);
    // Hors énuméré : jamais deviné.
    expect(
      extraireDrapeauxAnamnese({ intolerances_alimentaires: ['Fructose'] }).intolerancesAlimentaires,
    ).toEqual([]);
  });

  it('tripwire : reconnaît exactement les libellés actuels de anamnese.ts sur les 10 champs (Sophie Nicola)', () => {
    const anamnese = {
      motif_principal: 'Fatigue chronique persistante malgré un sommeil correct',
      signaux_alerte: SIGNAUX_ALERTE,
      antecedents_domaines: ANTECEDENTS_DOMAINES,
      facteurs_declenchants: FACTEURS_DECLENCHANTS,
      attentes: ATTENTES,
      automedication: AUTOMEDICATION,
      intolerances_alimentaires: INTOLERANCES_ALIMENTAIRES,
      symptomes_fonctionnels: SYMPTOMES_FONCTIONNELS,
      debut: DEBUT[0],
      evolution: EVOLUTION[0],
      variation_poids: VARIATION_POIDS[0],
    };

    expect(extraireDrapeauxAnamnese(anamnese)).toEqual({
      signauxAlerte: SIGNAUX_ALERTE,
      antecedentsDomaines: ANTECEDENTS_DOMAINES,
      facteursDeclenchants: FACTEURS_DECLENCHANTS,
      attentes: ATTENTES,
      automedication: AUTOMEDICATION,
      intolerancesAlimentaires: INTOLERANCES_ALIMENTAIRES,
      symptomesFonctionnels: SYMPTOMES_FONCTIONNELS,
      debut: DEBUT[0],
      evolution: EVOLUTION[0],
      variationPoids: VARIATION_POIDS[0],
    });
  });
});
