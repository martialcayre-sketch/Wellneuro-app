import { describe, expect, it } from 'vitest';
import {
  assertRenduMedecinNonPrescriptif,
  contientTermeAnxiogene,
  contientTermePrescriptif,
  termeAnxiogene,
} from './vocabulaire';

describe('garde de vocabulaire médecin', () => {
  it('détecte un registre prescriptif', () => {
    expect(contientTermePrescriptif('Prescrire 500 mg matin et soir')).toBe(true);
    expect(contientTermePrescriptif('Voir posologie ci-jointe')).toBe(true);
    expect(contientTermePrescriptif('Rédiger une ordonnance')).toBe(true);
  });

  it('accepte un registre « explorations à discuter »', () => {
    expect(contientTermePrescriptif('Piste à explorer : sommeil')).toBe(false);
    expect(contientTermePrescriptif('Signal à discuter avec le patient')).toBe(false);
  });

  it('assertRenduMedecinNonPrescriptif lève sur un contenu prescriptif', () => {
    expect(() => assertRenduMedecinNonPrescriptif('Prescription de magnésium')).toThrow(/prescriptive/);
    expect(() => assertRenduMedecinNonPrescriptif('Piste à explorer : magnésium')).not.toThrow();
  });
});

describe('garde de vocabulaire anxiogène (contenus lus par le patient)', () => {
  // Ces phrases ne sont pas inventées : ce sont les `protocol` du catalogue,
  // que le modèle peut recopier dans le narratif patient.
  it("attrape les formulations d'orientation du catalogue", () => {
    expect(contientTermeAnxiogene('Avis médical urgent — programme de réduction des risques')).toBe(true);
    expect(contientTermeAnxiogene('Consultation neurologique urgente')).toBe(true);
    expect(contientTermeAnxiogene('Risque élevé de chute')).toBe(true);
    expect(contientTermeAnxiogene('Dépression sévère')).toBe(true);
    expect(contientTermeAnxiogene('nécessite une appréciation clinique immédiatement')).toBe(true);
  });

  it('laisse passer un registre descriptif orienté vers la consultation', () => {
    expect(contientTermeAnxiogene('Vos réponses évoquent un sommeil fragmenté.')).toBe(false);
    expect(contientTermeAnxiogene('Le sommeil ressort comme un axe à explorer en priorité.')).toBe(false);
    expect(contientTermeAnxiogene('Votre praticien reprendra ces éléments avec vous.')).toBe(false);
  });

  // Une revue adversariale a mesuré ce que coûtait la version `includes` : elle
  // attrapait « grave » dans « aggrave » et « sévère » dans « persévère » — ce
  // dernier étant un libellé RÉEL du catalogue (« Je ne persévère pas, je suis
  // vite découragé(e) »). Une garde qui punit le mot d'à côté n'apprend rien.
  it("ne se déclenche pas sur un mot qui contient seulement la racine", () => {
    expect(termeAnxiogene("Rien ne s'aggrave à ce stade.")).toBeNull();
    expect(termeAnxiogene('Je ne persévère pas, je suis vite découragé(e)')).toBeNull();
    expect(termeAnxiogene('Nous garderons un esprit critique.')).toBeNull();
    expect(termeAnxiogene('Un point aggravant a été noté par votre praticien.')).toBeNull();
  });

  // Ce que la garde ne SAIT PAS faire, et qu'elle assume : elle ne lit pas la
  // négation. Ces phrases sont rassurantes et pourtant signalées. C'est la
  // raison pour laquelle la route en fait un AVERTISSEMENT CONFIRMABLE et non
  // un refus : un faux positif coûte un clic, pas un document indélivrable.
  it('signale aussi les tournures négatives — limite connue et assumée', () => {
    expect(termeAnxiogene("Aucun signe grave n'a été relevé.")).toBe('grave');
    expect(termeAnxiogene("Il n'y a ni urgence ni danger.")).toBe('urgence');
  });

  it('insensible à la casse et aux accents, par normalisation réelle', () => {
    expect(contientTermeAnxiogene('AVIS MÉDICAL URGENT')).toBe(true);
    expect(contientTermeAnxiogene('Depression severe')).toBe(true);
    // « sévère » n'est PAS dans la liste — seul « severe » y figure. Si la
    // normalisation d'accents disparaissait, ce cas tomberait.
    expect(contientTermeAnxiogene('Une fatigue sévère')).toBe(true);
  });

  // Renvoyer le mot du praticien, et pas la racine, est ce qui permet de dire
  // QUOI reformuler — et la règle « UI en français » l'exige : « (« urgen ») »
  // n'est pas du français.
  it('termeAnxiogene renvoie le mot tel qu\'il est écrit, accents compris', () => {
    expect(termeAnxiogene('Consultation neurologique urgente')).toBe('urgente');
    expect(termeAnxiogene('Une fatigue sévère est décrite')).toBe('sévère');
    expect(termeAnxiogene('AVIS MÉDICAL URGENT')).toBe('URGENT');
    expect(termeAnxiogene('Vos réponses évoquent une fatigue installée.')).toBeNull();
  });
});
